import CoreAudio
import Foundation

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
