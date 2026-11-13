import Foundation

let options = parseOptions()

if options.disclaim, ProcessInfo.processInfo.environment["MEETING_NOTER_HELPER_DISCLAIMED"] == nil {
    if let status = relaunchDisclaimed() { exit(status) }
    log("could not re-launch with its own permission identity; the terminal is asked instead")
}

reportSystemAudioPermission()
reportMicrophonePermission()

let audioQueue = DispatchQueue(label: "meeting-noter.helper.audio", qos: .userInteractive)
let tap = SystemTap(queue: audioQueue, clockFromOutput: options.clockFromOutput)
let mic = MicCapture(queue: audioQueue)
let server = FrameServer(port: options.port) { origin in
    if options.anyOrigin { return true }
    guard let origin = origin?.lowercased() else { return false }
    return isLocalPageOrigin(origin) || options.extraOrigins.contains(origin)
}
server.hello = {
    [
        "type": "hello",
        "name": "meeting-noter-audio-helper",
        "version": protocolVersion,
        "sampleRate": Int(Downsampler.outputRate),
        "format": "pcm16",
        "frameSamples": Downsampler.frameSamples,
        "permission": AudioCapturePermission.preflight().rawValue,
    ]
}

var mixer = Mixer()

mic.onSamples = { samples, rate in
    flagMicDeliveringOnlyDigitalSilence(samples, rate: rate)
    mixer.pushMic(samples, rate: rate, alone: soloMicClients == 0 ? nil : { frame in
        server.broadcast(frame.withUnsafeBytes { Data($0) }, stream: .mic)
    })
}
mic.onRestart = { error in
    mixer.resetMic()
    micZeroSeconds = 0
    if let error {
        log("mic unavailable: \(error); streaming system audio alone")
        setMicState("unavailable", "\(error)", notify: true)
    } else {
        log("mic restarted on \(mic.name) (\(Int(mic.sampleRate)) Hz)")
        setMicState(openMicState(), notify: true)
    }
}

tap.onSamples = { samples, rate in
    mixer.pushTap(samples, rate: rate, system: { frame in
        server.broadcast(frame.withUnsafeBytes { Data($0) }, stream: .system)
        if options.verbose, micClients == 0 { logFrameLevelEveryFiveSeconds(frame) }
    }, mixed: { frame in
        guard micClients > 0 else { return }
        server.broadcast(frame.withUnsafeBytes { Data($0) }, stream: .mixed)
        if options.verbose { logFrameLevelEveryFiveSeconds(frame) }
    })
}

server.onEvent = { event in
    switch event {
    case .started(let client):
        log("a page started recording (\(server.streamingCount) streaming)")
        reconcileTap(reply: client)
    case .stopped:
        log("a page stopped recording (\(server.streamingCount) streaming)")
        reconcileTap()
    }
}

do {
    try server.start { error in
        log("cannot listen on 127.0.0.1:\(options.port): \(error). Is another helper already running?")
        exit(1)
    }
} catch {
    log("cannot listen on 127.0.0.1:\(options.port): \(error)")
    exit(1)
}

if options.clockFromOutput {
    onDefaultOutputChange {
        audioQueue.async {
            guard tap.isRunning else { return }
            tap.stop()
            mixer.reset()
            do { try tap.start() } catch { log("tap failed to restart on the new output: \(error)") }
        }
    }
}

for sig in [SIGINT, SIGTERM] {
    signal(sig, SIG_IGN)
    let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
    source.setEventHandler {
        audioQueue.sync {
            mic.stop()
            tap.stop()
        }
        log("bye")
        exit(0)
    }
    source.resume()
    signalSources.append(source)
}

dispatchMain()
