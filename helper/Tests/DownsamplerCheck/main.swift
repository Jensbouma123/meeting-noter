import Foundation

func run(_ rate: Double, seconds: Double, _ signal: (Int) -> Float) -> [Float] {
    var down = Downsampler(inputRate: rate)
    var out: [Float] = []
    let buffer = Int(rate / 100)
    var n = 0
    while n < Int(rate * seconds) {
        let block = (n..<(n + buffer)).map(signal)
        block.withUnsafeBufferPointer { down.push($0, into: &out) }
        n += buffer
    }
    return out
}

func gainDb(_ rate: Double, _ hz: Double) -> Double {
    let out = run(rate, seconds: 1) { Float(0.5 * sin(2 * .pi * hz * Double($0) / rate)) }
    let settled = out.dropFirst(800)
    let rms = sqrt(settled.reduce(0) { $0 + Double($1) * Double($1) } / Double(settled.count))
    return 20 * log10(rms / (0.5 / 2.0.squareRoot()))
}

var gains: [String: Double] = [:]
for rate in [48_000.0, 44_100.0, 8_000.0] {
    for hz in [1000.0, 3000.0, 6000.0, 9000.0, 12_000.0, 20_000.0] where hz < rate / 2 {
        gains["\(Int(rate))/\(Int(hz))"] = gainDb(rate, hz)
    }
}
let mix = run(44_100, seconds: 0.1) {
    let t = Double($0) / 44_100
    return Float(0.3 * sin(2 * .pi * 440 * t) + 0.2 * sin(2 * .pi * 9000 * t) + 0.1 * sin(2 * .pi * 15_000 * t))
}
let report: [String: Any] = ["gains": gains, "mix": mix.map(Double.init)]
let data = try JSONSerialization.data(withJSONObject: report)
FileHandle.standardOutput.write(data)
