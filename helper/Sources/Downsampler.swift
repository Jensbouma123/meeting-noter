/// Mono Float32 at a source's rate in, mono Float32 at 16 kHz out.
///
/// The same fractional box average as `public/worklets/pcm16.js`: input
/// samples accumulate until they cover one 16 kHz output period, then their
/// mean is emitted, and the leftover fraction carries into the next period.
/// A helper frame and a share frame are therefore resampled alike.
///
/// An input slower than 16 kHz (a Bluetooth headset's 8 kHz mic) covers
/// several output periods per sample: each of them repeats its value, so the
/// output still runs at 16 kHz instead of at the input's rate.
struct Downsampler {
    static let outputRate = 16_000.0
    static let frameSamples = 1600

    let inputRate: Double
    private let ratio: Double
    private var acc: Float = 0
    private var accN = 0
    private var phase = 0.0
    private var held: Float = 0

    init(inputRate: Double) {
        self.inputRate = inputRate
        ratio = inputRate / Self.outputRate
    }

    /// Appends the 16 kHz samples `samples` complete to `out`.
    mutating func push(_ samples: UnsafeBufferPointer<Float>, into out: inout [Float]) {
        for x in samples {
            acc += x
            accN += 1
            phase += 1
            while phase >= ratio {
                phase -= ratio
                if accN > 0 {
                    held = acc / Float(accN)
                    acc = 0
                    accN = 0
                }
                out.append(held)
            }
        }
    }
}

/// 16 kHz Float32 in, 100 ms frames of Int16LE out.
struct Framer {
    private var frame: [Int16] = []

    init() {
        frame.reserveCapacity(Downsampler.frameSamples)
    }

    mutating func push(_ x: Float, emit: ([Int16]) -> Void) {
        let c = x.isNaN ? 0 : max(-1, min(1, x))
        frame.append(c < 0 ? Int16((c * 32768).rounded()) : Int16((c * 32767).rounded()))
        if frame.count == Downsampler.frameSamples {
            emit(frame)
            frame.removeAll(keepingCapacity: true)
        }
    }
}
