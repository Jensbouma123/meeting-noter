import Foundation

struct MicLeveler {
    static let targetRms: Float = 0.05
    static let maxGain: Float = 64
    static let maxEcho: Float = 0.1
    static let audibleTap: Float = 0.01
    static let priorEcho: Float = 0.01
    let echoLimited: Bool
    private(set) var gain: Float = 1
    private var speechLevel: Float = 0
    private var micEnergy: Float = 0
    private var tapEnergy: Float = 0
    private var echo = priorEcho

    init(echoLimited: Bool = true) {
        self.echoLimited = echoLimited
    }
    mutating func update(mic: [Float], tap: [Float]) -> Float {
        let seconds = Float(mic.count) / Float(Downsampler.outputRate)
        let micSq = meanSquare(mic)
        let tapSq = meanSquare(tap)
        let smooth = 1 - exp(-seconds / 0.3)
        micEnergy += (micSq - micEnergy) * smooth
        tapEnergy += (tapSq - tapEnergy) * smooth
        if tapSq > Self.audibleTap * Self.audibleTap, tapEnergy > Self.audibleTap * Self.audibleTap {
            let ratio = (micEnergy / tapEnergy).squareRoot()
            let rate = 1 - exp(-seconds / (ratio < echo ? 0.5 : 10))
            echo += (ratio - echo) * rate
        }
        speechLevel = max(micSq.squareRoot(), speechLevel * pow(0.841, seconds))
        let limit = echoLimited ? min(Self.maxGain, Self.maxEcho / max(echo, 1e-6)) : Self.maxGain
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
