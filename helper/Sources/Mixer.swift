import Foundation

/// The system tap and the mic, each at its own rate and clock, into 100 ms
/// 16 kHz frames: one of the tap alone, one of the tap plus the mic.
///
/// The tap is the clock. Each source is downsampled to 16 kHz on arrival; mic
/// samples wait in a short jitter buffer and are added to the tap's sample by
/// sample, raised by `MicLeveler`. The two devices' clocks drift apart, so a
/// buffer that runs dry adds silence until it holds `primeSamples` again, and
/// one that grows past `maxSamples` (the tap stalled, or runs slow) drops its
/// oldest samples. A mic that stops delivering therefore leaves the tap's
/// audio unchanged. All calls on the audio queue.
struct Mixer {
    /// 30 ms: a few mic buffers, so the two IOProcs' interleaving never runs it dry.
    static let primeSamples = 480
    /// 200 ms of lag at most between the call and the user's voice.
    static let maxSamples = 3200

    private var tapDown: Downsampler?
    private var micDown: Downsampler?
    private var tap16: [Float] = []
    private var mic16: [Float] = []
    private var micRead = 0
    private var priming = true
    /// The mic's samples for the tap's current buffer.
    private var micBlock: [Float] = []
    private var leveler = MicLeveler()
    private var systemFramer = Framer()
    private var mixedFramer = Framer()

    var micBuffered: Int { mic16.count - micRead }

    /// Forgets both sources' state, for a fresh start of the tap.
    mutating func reset() {
        self = Mixer()
    }

    /// Forgets the mic's state, for a restarted mic (other device or rate).
    mutating func resetMic() {
        micDown = nil
        mic16.removeAll(keepingCapacity: true)
        micRead = 0
        priming = true
        leveler = MicLeveler()
    }

    mutating func pushMic(_ samples: UnsafeBufferPointer<Float>, rate: Double) {
        if micDown?.inputRate != rate { micDown = Downsampler(inputRate: rate) }
        if micRead > 0, micRead >= Self.maxSamples {
            mic16.removeFirst(micRead)
            micRead = 0
        }
        micDown!.push(samples, into: &mic16)
        if micBuffered > Self.maxSamples { micRead = mic16.count - Self.primeSamples }
    }

    /// `system` gets the tap's frames, `mixed` the tap plus the mic's.
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
        // Ramped across the buffer, so a change of gain never clicks.
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

/// The gain the mic is mixed in with.
///
/// The mic is read raw, with none of the gain a browser or a call app gets
/// from voice processing: a MacBook's built-in mic speaks at about -65 dBFS,
/// 40 dB under a call on the tap, which is read before the output volume, and
/// under the 0.001 RMS the page's speech gate requires. Mixed in as it was,
/// the user's voice was in the frames but never transcribed. So the user's
/// speech peaks are brought up to `targetRms`, by at most `maxGain`, and a mic
/// that is already loud (a headset) is never turned down.
///
/// The mic also hears the speakers: the call again, a few tens of ms late.
/// The gain is held where that echo stays `maxEcho` under the call, from the
/// mic's level over the tap's while the tap plays: its low end, since the
/// user talking over the call only raises it.
struct MicLeveler {
    /// About the level a call's speech reaches on the tap (-26 dBFS).
    static let targetRms: Float = 0.05
    /// +36 dB.
    static let maxGain: Float = 64
    /// The echo of the call stays 20 dB under it.
    static let maxEcho: Float = 0.1
    /// Above -40 dBFS on the tap, the mic's own hiss is too small to skew
    /// what it hears of the speakers.
    static let audibleTap: Float = 0.01
    /// What the mic hears of the speakers until measured: as on a MacBook
    /// playing loud, so an unmeasured echo stays under the call too.
    static let priorEcho: Float = 0.01

    /// Applied at the end of the last buffer.
    private(set) var gain: Float = 1
    /// The user's speech peaks: rises at once, falls 1.5 dB/s.
    private var speechLevel: Float = 0
    /// Mean square of the mic and the tap over about 300 ms.
    private var micEnergy: Float = 0
    private var tapEnergy: Float = 0
    /// Mic level over tap level while the tap plays.
    private var echo = priorEcho

    /// The gain for the mic samples of one tap buffer.
    mutating func update(mic: [Float], tap: [Float]) -> Float {
        let seconds = Float(tap.count) / Float(Downsampler.outputRate)
        let micSq = meanSquare(mic)
        let tapSq = meanSquare(tap)
        let smooth = 1 - exp(-seconds / 0.3)
        micEnergy += (micSq - micEnergy) * smooth
        tapEnergy += (tapSq - tapEnergy) * smooth
        // Not while the smoothed tap only fades out: the user answering the
        // call then would read as echo.
        if tapSq > Self.audibleTap * Self.audibleTap, tapEnergy > Self.audibleTap * Self.audibleTap {
            // Falls within 0.5 s, rises over 10 s: double talk barely moves it.
            let ratio = (micEnergy / tapEnergy).squareRoot()
            let rate = 1 - exp(-seconds / (ratio < echo ? 0.5 : 10))
            echo += (ratio - echo) * rate
        }
        speechLevel = max(micSq.squareRoot(), speechLevel * pow(0.841, seconds))
        let limit = min(Self.maxGain, Self.maxEcho / max(echo, 1e-6))
        let wanted = speechLevel > 0 ? Self.targetRms / speechLevel : limit
        gain = max(1, min(limit, wanted))
        return gain
    }

    private func meanSquare(_ x: [Float]) -> Float {
        var sum: Float = 0
        for v in x { sum += v * v }
        return sum / Float(max(1, x.count))
    }
}
