import Foundation

struct SoloMic {
    private var leveler = MicLeveler(echoLimited: false)
    private var framer = Framer()

    mutating func push(_ block: ArraySlice<Float>, emit: ([Int16]) -> Void) {
        let samples = Array(block)
        let from = leveler.gain
        let to = leveler.update(mic: samples, tap: [])
        let step = (to - from) / Float(samples.count)
        for i in samples.indices {
            framer.push((from + step * Float(i + 1)) * samples[i], emit: emit)
        }
    }
}
