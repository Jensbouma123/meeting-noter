import Foundation

var levelSum = 0.0
var levelFrames = 0
var levelPeak = 0.0

func logFrameLevelEveryFiveSeconds(_ frame: [Int16]) {
    var sumSq = 0.0
    for s in frame { sumSq += Double(s) * Double(s) }
    let rms = (sumSq / Double(frame.count)).squareRoot() / 32768
    levelSum += rms
    levelPeak = max(levelPeak, rms)
    levelFrames += 1
    if levelFrames == 50 {
        log(String(format: "level: mean rms %.4f, peak %.4f (mic buffered %d)", levelSum / 50, levelPeak, mixer.micBuffered))
        levelSum = 0
        levelPeak = 0
        levelFrames = 0
    }
}
