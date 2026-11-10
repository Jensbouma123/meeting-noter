import AudioToolbox
import CoreAudio
import Foundation

struct CoreAudioError: Error, CustomStringConvertible {
    let what: String
    let status: OSStatus
    var description: String { "\(what) failed (OSStatus \(status))" }
}

private func check(_ status: OSStatus, _ what: String) throws {
    if status != noErr { throw CoreAudioError(what: what, status: status) }
}

private func address(_ selector: AudioObjectPropertySelector) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(
        mSelector: selector,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
}

private func getProperty<T>(_ object: AudioObjectID, _ selector: AudioObjectPropertySelector, _ value: inout T) throws {
    var addr = address(selector)
    var size = UInt32(MemoryLayout<T>.size)
    let status = withUnsafeMutablePointer(to: &value) { AudioObjectGetPropertyData(object, &addr, 0, nil, &size, $0) }
    try check(status, "AudioObjectGetPropertyData(\(selector))")
}

/// This process's Core Audio object, so the tap leaves out anything the
/// helper itself plays. A process that never touched audio has none.
private func ownProcessObject() -> AudioObjectID? {
    var addr = address(kAudioHardwarePropertyTranslatePIDToProcessObject)
    var pid = getpid()
    var object = AudioObjectID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    let status = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &addr,
        UInt32(MemoryLayout<pid_t>.size), &pid, &size, &object
    )
    return status == noErr && object != kAudioObjectUnknown ? object : nil
}

private func defaultOutputDeviceUID() throws -> String {
    var device = AudioObjectID(kAudioObjectUnknown)
    try getProperty(AudioObjectID(kAudioObjectSystemObject), kAudioHardwarePropertyDefaultOutputDevice, &device)
    var uid: Unmanaged<CFString>?
    try getProperty(device, kAudioDevicePropertyDeviceUID, &uid)
    guard let uid else { throw CoreAudioError(what: "default output device UID", status: -1) }
    return uid.takeRetainedValue() as String
}

/// A global Core Audio process tap: everything this Mac plays, from every
/// process but this one, mixed down to mono.
///
/// The tap reads each process's output before the output device applies its
/// volume, so it records at full level with the volume at 0% or the sound on
/// earphones. Requires macOS 14.4 and the System Audio Recording permission;
/// without the permission it records exact silence.
///
/// A tap is read through a private aggregate device that holds it. By default
/// that aggregate holds only the tap, so no real device's input (an AirPods
/// mic, which would switch them to call quality) is opened. `clockFromOutput`
/// adds the default output device as the aggregate's clock instead, for a Mac
/// where a tap-only aggregate refuses to start.
final class SystemTap {
    /// Mono samples and their rate, on `queue`.
    var onSamples: ((UnsafeBufferPointer<Float>, Double) -> Void)?

    private let queue: DispatchQueue
    /// The IOProc's queue. Never `queue`: `AudioDeviceStop` waits for an
    /// IO cycle that the HAL runs synchronously on the IOProc's queue, so
    /// stopping from that queue deadlocks it.
    private let ioQueue = DispatchQueue(label: "meeting-noter.helper.tap-io", qos: .userInteractive)
    private let clockFromOutput: Bool
    private var tapID = AudioObjectID(kAudioObjectUnknown)
    private var aggregateID = AudioObjectID(kAudioObjectUnknown)
    private var procID: AudioDeviceIOProcID?
    /// Bumped by `stop()`, so samples still on their way to `queue` from a
    /// stopped IOProc are dropped. On `queue`.
    private var generation = 0
    private(set) var sampleRate = 48_000.0
    var isRunning: Bool { procID != nil }

    init(queue: DispatchQueue, clockFromOutput: Bool) {
        self.queue = queue
        self.clockFromOutput = clockFromOutput
    }

    /// Call on `queue`.
    func start() throws {
        if isRunning { return }
        do {
            try createTap()
            try createAggregate()
            try startIO()
        } catch {
            stop()
            throw error
        }
    }

    /// Call on `queue`. Safe when not running.
    func stop() {
        generation += 1
        if let procID {
            AudioDeviceStop(aggregateID, procID)
            AudioDeviceDestroyIOProcID(aggregateID, procID)
        }
        procID = nil
        if aggregateID != kAudioObjectUnknown { AudioHardwareDestroyAggregateDevice(aggregateID) }
        aggregateID = AudioObjectID(kAudioObjectUnknown)
        if tapID != kAudioObjectUnknown { AudioHardwareDestroyProcessTap(tapID) }
        tapID = AudioObjectID(kAudioObjectUnknown)
    }

    private func createTap() throws {
        let description = CATapDescription(monoGlobalTapButExcludeProcesses: ownProcessObject().map { [$0] } ?? [])
        description.name = "Meeting Noter system audio"
        description.uuid = UUID()
        description.isPrivate = true
        description.muteBehavior = .unmuted
        var tap = AudioObjectID(kAudioObjectUnknown)
        try check(AudioHardwareCreateProcessTap(description, &tap), "AudioHardwareCreateProcessTap")
        tapID = tap
        var format = AudioStreamBasicDescription()
        try getProperty(tap, kAudioTapPropertyFormat, &format)
        if format.mSampleRate > 0 { sampleRate = format.mSampleRate }
    }

    private func createAggregate() throws {
        var tapUID: Unmanaged<CFString>?
        try getProperty(tapID, kAudioTapPropertyUID, &tapUID)
        guard let tapUID else { throw CoreAudioError(what: "tap UID", status: -1) }
        var description: [String: Any] = [
            kAudioAggregateDeviceNameKey: "Meeting Noter Tap",
            kAudioAggregateDeviceUIDKey: "meeting-noter-tap-\(UUID().uuidString)",
            kAudioAggregateDeviceIsPrivateKey: true,
            kAudioAggregateDeviceIsStackedKey: false,
            kAudioAggregateDeviceTapAutoStartKey: true,
            kAudioAggregateDeviceTapListKey: [
                [
                    kAudioSubTapUIDKey: tapUID.takeRetainedValue() as String,
                    kAudioSubTapDriftCompensationKey: true,
                ],
            ],
        ]
        if clockFromOutput {
            let outputUID = try defaultOutputDeviceUID()
            description[kAudioAggregateDeviceMainSubDeviceKey] = outputUID
            description[kAudioAggregateDeviceSubDeviceListKey] = [[kAudioSubDeviceUIDKey: outputUID]]
        }
        var aggregate = AudioObjectID(kAudioObjectUnknown)
        try check(AudioHardwareCreateAggregateDevice(description as CFDictionary, &aggregate), "AudioHardwareCreateAggregateDevice")
        aggregateID = aggregate
        var rate = Float64(0)
        if (try? getProperty(aggregate, kAudioDevicePropertyNominalSampleRate, &rate)) != nil, rate > 0 {
            sampleRate = rate
        }
    }

    private func startIO() throws {
        var proc: AudioDeviceIOProcID?
        let generation = generation
        let rate = sampleRate
        let queue = queue
        try check(
            AudioDeviceCreateIOProcIDWithBlock(&proc, aggregateID, ioQueue) { [weak self] _, input, _, _, _ in
                // The tap's stream is the aggregate's last input buffer: an output
                // device added as the clock comes first and may carry inputs of its own.
                let buffers = UnsafeMutableAudioBufferListPointer(UnsafeMutablePointer(mutating: input))
                guard let buffer = buffers.last, let mono = monoSamples(buffer) else { return }
                queue.async {
                    guard let self, self.generation == generation else { return }
                    mono.withUnsafeBufferPointer { self.onSamples?($0, rate) }
                }
            },
            "AudioDeviceCreateIOProcIDWithBlock"
        )
        procID = proc
        try check(AudioDeviceStart(aggregateID, proc), "AudioDeviceStart")
    }
}

/// A copy of `buffer`'s interleaved Float samples, its channels averaged;
/// `nil` when it holds none.
func monoSamples(_ buffer: AudioBuffer) -> [Float]? {
    guard let data = buffer.mData else { return nil }
    let channels = max(1, Int(buffer.mNumberChannels))
    let count = Int(buffer.mDataByteSize) / MemoryLayout<Float>.size / channels
    guard count > 0 else { return nil }
    let samples = data.assumingMemoryBound(to: Float.self)
    if channels == 1 { return Array(UnsafeBufferPointer(start: samples, count: count)) }
    return (0..<count).map { i in
        var sum: Float = 0
        for c in 0..<channels { sum += samples[i * channels + c] }
        return sum / Float(channels)
    }
}
