import Foundation
struct Mixer {
    static let primeSamples = 480
    static let maxSamples = 3200

    private var tapDown: Downsampler?
    private var micDown: Downsampler?
    private var tap16: [Float] = []
    private var mic16: [Float] = []
    private var micRead = 0
    private var priming = true
    private var micBlock: [Float] = []
    private var leveler = MicLeveler()
    private var systemFramer = Framer()
    private var mixedFramer = Framer()
    private var solo = SoloMic()

    var micBuffered: Int { mic16.count - micRead }
    mutating func reset() {
        self = Mixer()
    }
    mutating func resetMic() {
        micDown = nil
        mic16.removeAll(keepingCapacity: true)
        micRead = 0
        priming = true
        leveler = MicLeveler()
        solo = SoloMic()
    }
    mutating func pushMic(_ samples: UnsafeBufferPointer<Float>, rate: Double, alone: (([Int16]) -> Void)? = nil) {
        if micDown?.inputRate != rate { micDown = Downsampler(inputRate: rate) }
        if micRead > 0, micRead >= Self.maxSamples {
            mic16.removeFirst(micRead)
            micRead = 0
        }
        let from = mic16.count
        micDown!.push(samples, into: &mic16)
        if let alone, mic16.count > from { solo.push(mic16[from...], emit: alone) }
        if micBuffered > Self.maxSamples { micRead = mic16.count - Self.primeSamples }
    }
    mutating func pushTap(
        _ samples: UnsafeBufferPointer<Float>, rate: Double,
        system: ([Int16]) -> Void, mixed: ([Int16]) -> Void
    ) {
        if tapDown?.inputRate != rate { tapDown = Downsampler(inputRate: rate) }
        tap16.removeAll(keepingCapacity: true)
        tapDown!.push(samples, into: &tap16)
        guard !tap16.isEmpty else { return }
        micBlock.removeAll(keepingCapacity: true)
        for _ in tap16 { micBlock.append(nextMic()) }
        let from = leveler.gain
        let to = leveler.update(mic: micBlock, tap: tap16)
        let step = (to - from) / Float(tap16.count)
        for i in tap16.indices {
            systemFramer.push(tap16[i], emit: system)
            mixedFramer.push(tap16[i] + (from + step * Float(i + 1)) * micBlock[i], emit: mixed)
        }
    }

    private mutating func nextMic() -> Float {
        if priming {
            guard micBuffered >= Self.primeSamples else { return 0 }
            priming = false
        }
        guard micRead < mic16.count else {
            priming = true
            return 0
        }
        defer { micRead += 1 }
        return mic16[micRead]
    }
}
