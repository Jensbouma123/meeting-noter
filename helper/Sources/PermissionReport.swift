import Foundation

func reportSystemAudioPermission() {
    let permission = AudioCapturePermission.preflight()
    log("System Audio Recording permission: \(permission.rawValue)")
    if permission == .unknown {
        AudioCapturePermission.request { granted in
            log(granted
                ? "System Audio Recording allowed"
                : "System Audio Recording not allowed: the tap records silence. Allow it in System Settings → Privacy & Security → Screen & System Audio Recording.")
        }
    } else if permission == .denied {
        log("the tap will record silence until this helper is allowed in System Settings → Privacy & Security → Screen & System Audio Recording (System Audio Recording Only)")
    }
}

func reportMicrophonePermission() {
    let micPermission = MicrophonePermission.preflight()
    log("Microphone permission: \(micPermission.rawValue)")
    if micPermission == .unknown {
        MicrophonePermission.request { granted in
            log(granted
                ? "Microphone allowed"
                : "Microphone not allowed: pages that ask for the mic get system audio only. Allow it in System Settings → Privacy & Security → Microphone.")
            audioQueue.async {
                guard mic.isRunning else { return }
                if granted {
                    mic.restart()
                } else {
                    mic.stop()
                    mixer.resetMic()
                    setMicState("denied", "Microphone permission denied", notify: true)
                }
            }
        }
    } else if micPermission == .denied {
        log("the mic is left out until this helper is allowed in System Settings → Privacy & Security → Microphone")
    }
}
