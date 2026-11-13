import Foundation
struct Downsampler {
    static let outputRate = 16_000.0
    static let frameSamples = 1600
    private static let cutoffHz = 7200.0
    private static let halfWidthSec = 0.0025
    private static let phases = 256

    let inputRate: Double
    private let ratio: Double
    private let half: Int
    private let taps: Int
    private var table: [Float]
    private var hist: [Float]
    private var received: Int
    private var whole: Int
    private var frac = 0.0

    init(inputRate: Double) {
        self.inputRate = inputRate
        ratio = inputRate / Self.outputRate
        let fc = min(Self.cutoffHz, 0.45 * inputRate) / inputRate
        half = max(1, Int((Self.halfWidthSec * inputRate).rounded(.up)))
        taps = 2 * half
        table = Self.kernel(fc: fc, half: half)
        hist = [Float](repeating: 0, count: 2 * taps)
        received = taps
        whole = taps - half
    }
    private static func kernel(fc: Double, half: Int) -> [Float] {
        let taps = 2 * half
        var table = [Float](repeating: 0, count: (phases + 1) * taps)
        for p in 0...phases {
            var row = [Float](repeating: 0, count: taps)
            var sum: Float = 0
            for k in 0..<taps {
                let tau = Double(p) / Double(phases) + Double(half - 1 - k)
                let arg = 2 * fc * tau
                let sinc = arg == 0 ? 1 : sin(.pi * arg) / (.pi * arg)
                let u = tau / Double(half)
                let w = abs(u) >= 1 ? 0 : blackmanHarris(u)
                row[k] = Float(2 * fc * sinc * w)
                sum += row[k]
            }
            for k in 0..<taps { table[p * taps + k] = row[k] / sum }
        }
        return table
    }
    private static func blackmanHarris(_ u: Double) -> Double {
        let x = Double.pi * (u + 1)
        return 0.35875 - 0.48829 * cos(x) + 0.14128 * cos(2 * x) - 0.01168 * cos(3 * x)
    }
    mutating func push(_ samples: UnsafeBufferPointer<Float>, into out: inout [Float]) {
        for x in samples {
            let slot = received % taps
            hist[slot] = x
            hist[slot + taps] = x
            received += 1
            while whole + half < received {
                let first = (received - taps) % taps
                let at = frac * Double(Self.phases)
                let p = min(Self.phases - 1, Int(at))
                let a = at - Double(p)
                let lo = p * taps
                let hi = lo + taps
                var y0: Double = 0
                var y1: Double = 0
                for k in 0..<taps {
                    let s = Double(hist[first + k])
                    y0 += Double(table[lo + k]) * s
                    y1 += Double(table[hi + k]) * s
                }
                out.append(Float(y0 + a * (y1 - y0)))
                frac += ratio
                let step = frac.rounded(.down)
                whole += Int(step)
                frac -= step
            }
        }
    }
}
