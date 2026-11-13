import Foundation

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
