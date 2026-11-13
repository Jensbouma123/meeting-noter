import Foundation

func openOrCloseMic(wanted: Bool) {
    if wanted, !mic.isRunning {
        mixer.resetMic()
        micZeroSeconds = 0
        if MicrophonePermission.preflight() == .denied {
            mic.stop()
            setMicState("denied", "Microphone permission denied", notify: false)
            log("mic not opened: no Microphone permission")
            return
        }
        do {
            try mic.start()
            setMicState(openMicState(), notify: false)
            log("mic started on \(mic.name) (\(Int(mic.sampleRate)) Hz → 16000 Hz mono, mixed into the tap)")
        } catch {
            setMicState("unavailable", "\(error)", notify: false)
            log("mic unavailable: \(error); streaming system audio alone")
        }
    } else if !wanted {
        if mic.isRunning { log("mic stopped (no page wants it)") }
        mic.stop()
        mixer.resetMic()
        setMicState("unavailable", notify: false)
    }
}
