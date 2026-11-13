import Foundation

var micClients = 0
var soloMicClients = 0
var micState = "unavailable"
var micError: String?
var micZeroSeconds = 0.0

func micStatus() -> [String: Any] {
    var status: [String: Any] = ["mic": micState, "micPermission": MicrophonePermission.preflight().rawValue]
    if let micError { status["micError"] = micError }
    return status
}

func setMicState(_ state: String, _ error: String? = nil, notify: Bool) {
    micState = state
    micError = error
    guard notify else { return }
    let status = micStatus()
    server.queue.async { server.sendToMicClients(status.merging(["type": "mic"]) { a, _ in a }) }
}

func openMicState() -> String {
    switch MicrophonePermission.preflight() {
    case .granted: return "live"
    case .denied: return "denied"
    case .unknown: return "unknown"
    }
}

func flagMicDeliveringOnlyDigitalSilence(_ samples: UnsafeBufferPointer<Float>, rate: Double) {
    if samples.contains(where: { $0 != 0 }) {
        micZeroSeconds = 0
        if micState == "silent" {
            log("mic delivers sound again")
            setMicState(openMicState(), notify: true)
        }
        return
    }
    micZeroSeconds += Double(samples.count) / rate
    guard micZeroSeconds >= micSilentAfterSeconds, micState == "live" || micState == "unknown" else { return }
    log("mic on \(mic.name) delivers only digital silence: no Microphone permission for this helper (System Settings → Privacy & Security → Microphone), or the input is muted")
    setMicState("silent", "\(mic.name) delivers only silence: macOS has not given the helper Microphone permission, or the input is muted", notify: true)
}
