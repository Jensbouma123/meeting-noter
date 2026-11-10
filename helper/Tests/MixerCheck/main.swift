import Foundation

// mixer-check: drives `Mixer` (helper/Sources/Mixer.swift) with a synthetic
// call on the tap and a synthetic user on the mic, both at 48 kHz in 10 ms
// IOProc buffers, and prints per segment the call's level in the frames and
// what the mic added to them (mixed minus system frames), as JSON. Built and
// run by `helper/mixer.test.ts`.

let rate = 48_000.0
let buffer = 480

/// A voice: harmonics of `f0`, in 4 Hz syllables with pauses between them.
/// Its RMS is about 0.54 × `amp`.
func voice(_ f0: Double, _ amp: Double, _ t: Double) -> Float {
    var x = 0.0
    for k in 1...8 { x += sin(2 * .pi * Double(k) * f0 * t) / Double(k) }
    let syllable = pow(max(0, sin(2 * .pi * 4 * t)), 2)
    return Float(amp * syllable * x)
}

/// A mic's own hiss, about 2e-5 RMS: what a built-in mic read raw delivers in a quiet room.
var seed: UInt32 = 1
func hiss() -> Float {
    seed = seed &* 1_664_525 &+ 1_013_904_223
    return (Float(seed >> 8) / Float(1 << 24) - 0.5) * 7e-5
}

struct Segment {
    let name: String
    /// Call RMS ≈ 0.54 × callAmp on the tap.
    let callAmp: Double
    /// User RMS ≈ 0.54 × userAmp on the mic.
    let userAmp: Double
}

/// `leak`: share of the tap the mic hears from the speakers, 20 ms later.
func run(_ segments: [Segment], leak: Float, seconds: Double = 4) -> [[String: Any]] {
    var mixer = Mixer()
    var system: [Int16] = []
    var mixed: [Int16] = []
    var history = [Float](repeating: 0, count: 960)
    var report: [[String: Any]] = []
    var n = 0
    for segment in segments {
        let systemStart = system.count
        let buffers = Int(seconds * rate) / buffer
        for _ in 0..<buffers {
            var tap = [Float](repeating: 0, count: buffer)
            var mic = [Float](repeating: 0, count: buffer)
            for i in 0..<buffer {
                let t = Double(n + i) / rate
                tap[i] = voice(140, segment.callAmp, t)
                history.append(tap[i])
                mic[i] = voice(220, segment.userAmp, t) + leak * history.removeFirst() + hiss()
            }
            n += buffer
            mic.withUnsafeBufferPointer { mixer.pushMic($0, rate: rate) }
            tap.withUnsafeBufferPointer {
                mixer.pushTap($0, rate: rate, system: { system += $0 }, mixed: { mixed += $0 })
            }
        }
        // The segment's last 2 s, once the mixer has settled.
        let from = max(systemStart, system.count - 32_000)
        var callSq = 0.0, micSq = 0.0, peak = 0
        for i in from..<min(system.count, mixed.count) {
            let s = Double(system[i]) / 32768, m = Double(mixed[i]) / 32768
            callSq += s * s
            micSq += (m - s) * (m - s)
            peak = max(peak, abs(Int(mixed[i])))
        }
        let count = Double(max(1, system.count - from))
        report.append([
            "segment": segment.name,
            "call": (callSq / count).squareRoot(),
            "mic": (micSq / count).squareRoot(),
            "peak": Double(peak) / 32768,
        ])
    }
    return report
}

/// The mic by itself, as Safari's Mic mode streams it: no tap pushed, and
/// the frames come from `pushMic`'s `alone`. `mic` is their RMS.
func runAlone(_ segments: [Segment], seconds: Double = 4) -> [[String: Any]] {
    var mixer = Mixer()
    var frames: [Int16] = []
    var report: [[String: Any]] = []
    var n = 0
    for segment in segments {
        let start = frames.count
        for _ in 0..<(Int(seconds * rate) / buffer) {
            var mic = [Float](repeating: 0, count: buffer)
            for i in 0..<buffer { mic[i] = voice(220, segment.userAmp, Double(n + i) / rate) + hiss() }
            n += buffer
            mic.withUnsafeBufferPointer { mixer.pushMic($0, rate: rate, alone: { frames += $0 }) }
        }
        let from = max(start, frames.count - 32_000)
        var sq = 0.0, peak = 0
        for i in from..<frames.count {
            let m = Double(frames[i]) / 32768
            sq += m * m
            peak = max(peak, abs(Int(frames[i])))
        }
        report.append([
            "segment": segment.name,
            "call": 0.0,
            "mic": (sq / Double(max(1, frames.count - from))).squareRoot(),
            "peak": Double(peak) / 32768,
        ])
    }
    return report
}

let speakers: [Segment] = [
    Segment(name: "call", callAmp: 0.18, userAmp: 0),
    Segment(name: "user", callAmp: 0, userAmp: 0.0009),
    Segment(name: "call again", callAmp: 0.18, userAmp: 0),
    Segment(name: "both", callAmp: 0.18, userAmp: 0.002),
]
let headphones: [Segment] = [
    Segment(name: "call", callAmp: 0.18, userAmp: 0),
    Segment(name: "user", callAmp: 0, userAmp: 0.0009),
]
let headset: [Segment] = [
    Segment(name: "user", callAmp: 0, userAmp: 0.18),
    Segment(name: "both", callAmp: 0.18, userAmp: 0.18),
]

let out: [String: Any] = [
    "speakers": run(speakers, leak: 0.003),
    "headphones": run(headphones, leak: 0),
    "headset": run(headset, leak: 0),
    "alone": runAlone([
        Segment(name: "built-in", callAmp: 0, userAmp: 0.0009),
        Segment(name: "headset", callAmp: 0, userAmp: 0.18),
    ]),
]
let data = try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
print(String(decoding: data, as: UTF8.self))
