import AudioToolbox
import CoreAudio
import Foundation

final class MicCapture {
    var onSamples: ((UnsafeBufferPointer<Float>, Double) -> Void)?
    var onRestart: ((Error?) -> Void)?

    private let queue: DispatchQueue
    private let ioQueue = DispatchQueue(label: "meeting-noter.helper.mic-io", qos: .userInteractive)
    private var deviceID = AudioObjectID(kAudioObjectUnknown)
    private var procID: AudioDeviceIOProcID?
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
    func stop() {
        wanted = false
        close()
    }

    private func open() throws {
        guard let device = defaultInputDevice() else {
            throw CoreAudioError(what: "finding a default input device", status: -1)
        }
        var streamsAddr = scopedPropertyAddress(kAudioDevicePropertyStreams, kAudioObjectPropertyScopeInput)
        var size = UInt32(0)
        try throwIfCoreAudioFailed(AudioObjectGetPropertyDataSize(device, &streamsAddr, 0, nil, &size), "input streams of \(deviceName(device))")
        guard size > 0 else { throw CoreAudioError(what: "\(deviceName(device)) has no input streams", status: -1) }
        deviceID = device
        name = deviceName(device)
        var rate = Float64(0)
        var rateAddr = scopedPropertyAddress(kAudioDevicePropertyNominalSampleRate)
        size = UInt32(MemoryLayout<Float64>.size)
        if AudioObjectGetPropertyData(device, &rateAddr, 0, nil, &size, &rate) == noErr, rate > 0 { sampleRate = rate }
        var proc: AudioDeviceIOProcID?
        let generation = generation
        let deviceRate = sampleRate
        let queue = queue
        try throwIfCoreAudioFailed(
            AudioDeviceCreateIOProcIDWithBlock(&proc, device, ioQueue) { [weak self] _, input, _, _, _ in
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
        try throwIfCoreAudioFailed(AudioDeviceStart(device, proc), "AudioDeviceStart(mic)")
        let restart: AudioObjectPropertyListenerBlock = { [weak self] _, _ in queue.async { self?.restart() } }
        rateListener = restart
        aliveListener = restart
        AudioObjectAddPropertyListenerBlock(device, &rateAddr, ioQueue, restart)
        var aliveAddr = scopedPropertyAddress(kAudioDevicePropertyDeviceIsAlive)
        AudioObjectAddPropertyListenerBlock(device, &aliveAddr, ioQueue, restart)
    }

    private func close() {
        generation += 1
        if deviceID != kAudioObjectUnknown {
            if let rateListener {
                var addr = scopedPropertyAddress(kAudioDevicePropertyNominalSampleRate)
                AudioObjectRemovePropertyListenerBlock(deviceID, &addr, ioQueue, rateListener)
            }
            if let aliveListener {
                var addr = scopedPropertyAddress(kAudioDevicePropertyDeviceIsAlive)
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
    private func listenForDefaultChanges() {
        if listening { return }
        listening = true
        var addr = scopedPropertyAddress(kAudioHardwarePropertyDefaultInputDevice)
        AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &addr, ioQueue) { [weak self, queue] _, _ in
            queue.async { self?.restart() }
        }
    }
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
