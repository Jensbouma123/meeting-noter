import Foundation

func log(_ message: String) {
    FileHandle.standardError.write(Data("[audio-helper] \(message)\n".utf8))
}
