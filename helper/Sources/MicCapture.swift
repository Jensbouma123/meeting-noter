import AudioToolbox
import CoreAudio
import Foundation

private func address(
    _ selector: AudioObjectPropertySelector,
    _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}

private func check(_ status: OSStatus, _ what: String) throws {
    if status != noErr { throw CoreAudioError(what: what, status: status) }
}

/// The default input device, or `nil` when the Mac has none.
private func defaultInputDevice() -> AudioObjectID? {
    var addr = address(kAudioHardwarePropertyDefaultInputDevice)
    var device = AudioObjectID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    let status = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &device)
    return status == noErr && device != kAudioObjectUnknown ? device : nil
}

private func deviceName(_ device: AudioObjectID) -> String {
    var addr = address(kAudioObjectPropertyName)
    var name: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &name) == noErr, let name else { return "device \(device)" }
    return name.takeRetainedValue() as String
}

/// The default input device (the mic), mixed down to mono.
///
/// It is read with a plain IOProc on the device, the shared access every
/// recording app gets: no hog mode, no voice processing, nothing that takes
/// the mic from a call app or changes its settings. The device's nominal rate
/// is reported with every buffer; a change of the default input device, or of
/// its rate, restarts the capture on the new one and calls `onRestart`.
final class MicCapture {
    /// Mono samples and their rate, on `queue`.
    var onSamples: ((UnsafeBufferPointer<Float>, Double) -> Void)?
    /// The capture moved to another device or rate, or stopped. On `queue`.
    var onRestart: ((Error?) -> Void)?

    private let queue: DispatchQueue
    /// The IOProc's and the property listeners' queue. Never `queue`: the
    /// HAL calls them synchronously there, and `AudioDeviceStop` or a
    /// listener's removal from that same queue waits on them forever.
    private let ioQueue = DispatchQueue(label: "meeting-noter.helper.mic-io", qos: .userInteractive)
    private var deviceID = AudioObjectID(kAudioObjectUnknown)
    private var procID: AudioDeviceIOProcID?
    /// Bumped by `close()`, so samples still on their way to `queue` from a
    /// closed IOProc are dropped. On `queue`.
    private var generation = 0
    private var listening = false
    private var wanted = false
    private var rateListener: AudioObjectPropertyListenerBlock?
    private var aliveListener: AudioObjectPropertyListenerBlock?
    private(set) var sampleRate = 48_000.0
    private(set) var name = ""
    var isRunning: Bool { procID != nil }

    init(queue: DispatchQueue) {
        self.queue = queue
    }

    /// Call on `queue`. A mic that fails to open (no input device) still
    /// starts once a device becomes the default input, until `stop()`.
    func start() throws {
        if isRunning { return }
        wanted = true
        listenForDefaultChanges()
        do {
            try open()
        } catch {
            close()
            throw error
        }
    }

    /// Call on `queue`. Safe when not running.
    func stop() {
        wanted = false
        close()
    }

    private func open() throws {
        guard let device = defaultInputDevice() else {
            throw CoreAudioError(what: "finding a default input device", status: -1)
        }
        var streamsAddr = address(kAudioDevicePropertyStreams, kAudioObjectPropertyScopeInput)
        var size = UInt32(0)
        try check(AudioObjectGetPropertyDataSize(device, &streamsAddr, 0, nil, &size), "input streams of \(deviceName(device))")
        guard size > 0 else { throw CoreAudioError(what: "\(deviceName(device)) has no input streams", status: -1) }
        deviceID = device
        name = deviceName(device)
        var rate = Float64(0)
        var rateAddr = address(kAudioDevicePropertyNominalSampleRate)
        size = UInt32(MemoryLayout<Float64>.size)
        if AudioObjectGetPropertyData(device, &rateAddr, 0, nil, &size, &rate) == noErr, rate > 0 { sampleRate = rate }
        var proc: AudioDeviceIOProcID?
        let generation = generation
        let deviceRate = sampleRate
        let queue = queue
        try check(
            AudioDeviceCreateIOProcIDWithBlock(&proc, device, ioQueue) { [weak self] _, input, _, _, _ in
                // The first input buffer with data: one stream per device is the
                // common case, and its channels are averaged.
                let buffers = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: input))
                guard let buffer = buffers.first(where: { $0.mData != nil && $0.mDataByteSize > 0 }),
                      let mono = monoSamples(buffer) else { return }
                queue.async {
                    guard let self, self.generation == generation else { return }
                    mono.withUnsafeBufferPointer { self.onSamples?($0, deviceRate) }
                }
            },
            "AudioDeviceCreateIOProcIDWithBlock(mic)"
        )
        procID = proc
        try check(AudioDeviceStart(device, proc), "AudioDeviceStart(mic)")
        // A rate change on the device, or the device going away (unplugged),
        // is a restart on whatever is the default input then.
        let restart: AudioObjectPropertyListenerBlock = { [weak self] _, _ in queue.async { self?.restart() } }
        rateListener = restart
        aliveListener = restart
        AudioObjectAddPropertyListenerBlock(device, &rateAddr, ioQueue, restart)
        var aliveAddr = address(kAudioDevicePropertyDeviceIsAlive)
        AudioObjectAddPropertyListenerBlock(device, &aliveAddr, ioQueue, restart)
    }

    private func close() {
        generation += 1
        if deviceID != kAudioObjectUnknown {
            if let rateListener {
                var addr = address(kAudioDevicePropertyNominalSampleRate)
                AudioObjectRemovePropertyListenerBlock(deviceID, &addr, ioQueue, rateListener)
            }
            if let aliveListener {
                var addr = address(kAudioDevicePropertyDeviceIsAlive)
                AudioObjectRemovePropertyListenerBlock(deviceID, &addr, ioQueue, aliveListener)
            }
        }
        rateListener = nil
        aliveListener = nil
        if let procID {
            AudioDeviceStop(deviceID, procID)
            AudioDeviceDestroyIOProcID(deviceID, procID)
        }
        procID = nil
        deviceID = AudioObjectID(kAudioObjectUnknown)
    }

    /// Registered once, for the helper's lifetime.
    private func listenForDefaultChanges() {
        if listening { return }
        listening = true
        var addr = address(kAudioHardwarePropertyDefaultInputDevice)
        AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &addr, ioQueue) { [weak self, queue] _, _ in
            queue.async { self?.restart() }
        }
    }

    /// Reopens the current default input device. On `queue`.
    func restart() {
        guard wanted else { return }
        close()
        do {
            try open()
            onRestart?(nil)
        } catch {
            close()
            onRestart?(error)
        }
    }
}
