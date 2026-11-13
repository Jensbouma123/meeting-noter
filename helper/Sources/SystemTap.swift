import AudioToolbox
import CoreAudio
import Foundation

final class SystemTap {
    var onSamples: ((UnsafeBufferPointer<Float>, Double) -> Void)?

    private let queue: DispatchQueue
    private let ioQueue = DispatchQueue(label: "meeting-noter.helper.tap-io", qos: .userInteractive)
    private let clockFromOutput: Bool
    private var tapID = AudioObjectID(kAudioObjectUnknown)
    private var aggregateID = AudioObjectID(kAudioObjectUnknown)
    private var procID: AudioDeviceIOProcID?
    private var generation = 0
    private(set) var sampleRate = 48_000.0
    var isRunning: Bool { procID != nil }

    init(queue: DispatchQueue, clockFromOutput: Bool) {
        self.queue = queue
        self.clockFromOutput = clockFromOutput
    }
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
        try throwIfCoreAudioFailed(AudioHardwareCreateProcessTap(description, &tap), "AudioHardwareCreateProcessTap")
        tapID = tap
        var format = AudioStreamBasicDescription()
        try getCoreAudioProperty(tap, kAudioTapPropertyFormat, &format)
        if format.mSampleRate > 0 { sampleRate = format.mSampleRate }
    }

    private func createAggregate() throws {
        var tapUID: Unmanaged<CFString>?
        try getCoreAudioProperty(tapID, kAudioTapPropertyUID, &tapUID)
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
        try throwIfCoreAudioFailed(AudioHardwareCreateAggregateDevice(description as CFDictionary, &aggregate), "AudioHardwareCreateAggregateDevice")
        aggregateID = aggregate
        var rate = Float64(0)
        if (try? getCoreAudioProperty(aggregate, kAudioDevicePropertyNominalSampleRate, &rate)) != nil, rate > 0 {
            sampleRate = rate
        }
    }

    private func startIO() throws {
        var proc: AudioDeviceIOProcID?
        let generation = generation
        let rate = sampleRate
        let queue = queue
        try throwIfCoreAudioFailed(
            AudioDeviceCreateIOProcIDWithBlock(&proc, aggregateID, ioQueue) { [weak self] _, input, _, _, _ in
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
        try throwIfCoreAudioFailed(AudioDeviceStart(aggregateID, proc), "AudioDeviceStart")
    }
}
