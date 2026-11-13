import Foundation

func armStartDeadline(for client: FrameServer.Client, pending: PendingReply) {
    server.queue.asyncAfter(deadline: .now() + startDeadline) {
        guard !pending.answered else { return }
        pending.answered = true
        log("tap did not start within 3 s: the audio queue is stuck in a Core Audio call")
        server.send(client, ["type": "error", "message": "The system audio tap did not start within 3 s; restart the helper"])
        server.close(client)
    }
}

func answerStart(client: FrameServer.Client, pending: PendingReply, failure: Error?, status: [String: Any], wantsSystem replyWantsSystem: Bool, wantsMic replyWantsMic: Bool) {
    guard !pending.answered else { return }
    pending.answered = true
    if let failure, replyWantsSystem {
        server.send(client, ["type": "error", "message": "Could not start the system audio tap: \(failure)"])
        server.close(client)
        return
    }
    var started: [String: Any] = [
        "type": "started",
        "sampleRate": Int(Downsampler.outputRate),
        "inputSampleRate": Int(replyWantsSystem ? tap.sampleRate : mic.sampleRate),
        "permission": AudioCapturePermission.preflight().rawValue,
    ]
    if replyWantsMic { started.merge(status) { a, _ in a } }
    server.send(client, started)
}

func startOrStopTap(wanted: Bool) -> Error? {
    var failure: Error?
    if wanted, !tap.isRunning {
        mixer.reset()
        do {
            try tap.start()
            log("tap started (\(Int(tap.sampleRate)) Hz → 16000 Hz mono)")
        } catch {
            failure = error
            log("tap failed to start: \(error)")
        }
    } else if !wanted, tap.isRunning {
        tap.stop()
        log("tap stopped (no page is recording)")
    }
    return failure
}

func reconcileTap(reply: FrameServer.Client? = nil) {
    let wanted = server.tapCount > 0
    let wantedMic = server.micCount
    let wantedSolo = server.soloMicCount
    let replyWantsMic = reply?.wantsMic ?? false
    let replyWantsSystem = reply?.wantsSystem ?? true
    let pending = PendingReply()
    if let client = reply { armStartDeadline(for: client, pending: pending) }
    audioQueue.async {
        let failure = startOrStopTap(wanted: wanted)
        micClients = wantedMic
        soloMicClients = wantedSolo
        openOrCloseMic(wanted: wantedMic > 0 && (failure == nil || wantedSolo > 0))
        let status = micStatus()
        guard let client = reply else { return }
        server.queue.async { answerStart(client: client, pending: pending, failure: failure, status: status, wantsSystem: replyWantsSystem, wantsMic: replyWantsMic) }
    }
}
