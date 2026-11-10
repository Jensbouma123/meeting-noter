import Foundation

// meeting-noter-audio-helper: streams everything this Mac plays, and on
// request the default mic mixed in, to the Meeting Noter page over
// ws://127.0.0.1 (see FrameServer for the protocol).

let protocolVersion = 1
let defaultPort: UInt16 = 47853

func log(_ message: String) {
    FileHandle.standardError.write(Data("[audio-helper] \(message)\n".utf8))
}

struct Options {
    var port = defaultPort
    var extraOrigins: Set<String> = []
    var anyOrigin = false
    var clockFromOutput = false
    var disclaim = true
    var verbose = false
}

func usage() -> Never {
    print("""
    usage: meeting-noter-audio-helper [options]
      --port N              listen on 127.0.0.1:N (default \(defaultPort))
      --allow-origin URL    also accept this page origin (repeatable)
      --allow-any-origin    accept any origin, and clients without one (debugging only)
      --clock-from-output   clock the tap from the default output device
      --no-disclaim         keep the launching terminal responsible for permissions
      --verbose             log levels every 5 s
    """)
    exit(0)
}

func parseOptions() -> Options {
    var options = Options()
    var args = CommandLine.arguments.dropFirst().makeIterator()
    while let arg = args.next() {
        switch arg {
        case "--port":
            guard let value = args.next(), let port = UInt16(value) else { usage() }
            options.port = port
        case "--allow-origin":
            guard let value = args.next() else { usage() }
            options.extraOrigins.insert(value.lowercased())
        case "--allow-any-origin": options.anyOrigin = true
        case "--clock-from-output": options.clockFromOutput = true
        case "--no-disclaim": options.disclaim = false
        case "--verbose": options.verbose = true
        default: usage()
        }
    }
    return options
}

/// Pages served from this Mac itself (`next dev` / `next start`), any port.
func isLocalOrigin(_ origin: String) -> Bool {
    guard let url = URL(string: origin), let scheme = url.scheme, let host = url.host else { return false }
    return ["http", "https"].contains(scheme) && ["localhost", "127.0.0.1", "::1", "[::1]"].contains(host)
}

let options = parseOptions()

// macOS asks the *responsible* process for System Audio Recording, which for
// a tool started from a terminal is the terminal app. Re-launched with that
// responsibility disclaimed, the helper asks for itself, under the name and
// usage text in its embedded Info.plist.
if options.disclaim, ProcessInfo.processInfo.environment["MEETING_NOTER_HELPER_DISCLAIMED"] == nil {
    if let status = relaunchDisclaimed() { exit(status) }
    log("could not re-launch with its own permission identity; the terminal is asked instead")
}

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

let micPermission = MicrophonePermission.preflight()
log("Microphone permission: \(micPermission.rawValue)")
if micPermission == .unknown {
    MicrophonePermission.request { granted in
        log(granted
            ? "Microphone allowed"
            : "Microphone not allowed: pages that ask for the mic get system audio only. Allow it in System Settings → Privacy & Security → Microphone.")
        // A mic opened while the prompt was up records silence: reopen it.
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

let audioQueue = DispatchQueue(label: "meeting-noter.helper.audio", qos: .userInteractive)
let tap = SystemTap(queue: audioQueue, clockFromOutput: options.clockFromOutput)
let mic = MicCapture(queue: audioQueue)
let server = FrameServer(port: options.port) { origin in
    if options.anyOrigin { return true }
    guard let origin = origin?.lowercased() else { return false }
    return isLocalOrigin(origin) || options.extraOrigins.contains(origin)
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
/// Clients streaming with the mic, as of the last `reconcileTap`. On the audio queue.
var micClients = 0
/// What a mic client is told about the mic. On the audio queue.
var micState = "unavailable"
var micError: String?

func micStatus() -> [String: Any] {
    var status: [String: Any] = ["mic": micState, "micPermission": MicrophonePermission.preflight().rawValue]
    if let micError { status["micError"] = micError }
    return status
}

/// Records why the mic is (not) live and tells the mic clients. On the audio queue.
func setMicState(_ state: String, _ error: String? = nil, notify: Bool) {
    micState = state
    micError = error
    guard notify else { return }
    let status = micStatus()
    server.queue.async { server.sendToMicClients(status.merging(["type": "mic"]) { a, _ in a }) }
}

/// The state of an open mic: `unknown` while the permission prompt is up.
func openMicState() -> String {
    switch MicrophonePermission.preflight() {
    case .granted: return "live"
    case .denied: return "denied"
    case .unknown: return "unknown"
    }
}

/// How long an open mic may deliver exact digital zeros before the page is
/// told it records nothing. Any real mic, even in a quiet room, has a noise
/// floor; zeros come from macOS withholding the Microphone permission (the
/// HAL then hands this process silence instead of an error) or a muted input.
let micSilentAfterSeconds = 2.0
/// Seconds of exact zeros the mic has delivered in a row. On the audio queue.
var micZeroSeconds = 0.0

/// Flags a mic that delivers only digital silence as `silent`, and back once
/// it delivers sound. On the audio queue.
func watchMicSilence(_ samples: UnsafeBufferPointer<Float>, rate: Double) {
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

mic.onSamples = { samples, rate in
    watchMicSilence(samples, rate: rate)
    mixer.pushMic(samples, rate: rate)
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

var levelSum = 0.0
var levelFrames = 0
var levelPeak = 0.0
tap.onSamples = { samples, rate in
    mixer.pushTap(samples, rate: rate, system: { frame in
        server.broadcast(frame.withUnsafeBytes { Data($0) }, mixed: false)
        if options.verbose, micClients == 0 { logLevel(frame) }
    }, mixed: { frame in
        guard micClients > 0 else { return }
        server.broadcast(frame.withUnsafeBytes { Data($0) }, mixed: true)
        if options.verbose { logLevel(frame) }
    })
}

/// Logs the level of the frames every 5 s with `--verbose`.
func logLevel(_ frame: [Int16]) {
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

/// Opens or closes the mic for `wanted`. A mic that will not open leaves
/// the tap streaming alone. On the audio queue.
func reconcileMic(wanted: Bool) {
    if wanted, !mic.isRunning {
        mixer.resetMic()
        micZeroSeconds = 0
        if MicrophonePermission.preflight() == .denied {
            // The device would deliver only silence, under the mic indicator.
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
        // Also ends a wait for an input device to appear.
        mic.stop()
        mixer.resetMic()
        setMicState("unavailable", notify: false)
    }
}

/// Whether a page's `start` has been answered. On the server queue.
final class PendingReply {
    var answered = false
}

/// How long the audio queue may take to start the tap before the page is
/// told it failed: under the page's own 4 s wait for `started`.
let startDeadline: DispatchTimeInterval = .seconds(3)

/// Runs the tap while at least one client streams, and the mic while one
/// of them asked for it. On the server queue.
func reconcileTap(reply: FrameServer.Client? = nil) {
    let wanted = server.streamingCount > 0
    let wantedMic = server.micCount
    let replyWantsMic = reply?.wantsMic ?? false
    let pending = PendingReply()
    if let client = reply {
        // A Core Audio call that never returns would otherwise leave the
        // page waiting on a `started` that never comes, with nothing logged.
        server.queue.asyncAfter(deadline: .now() + startDeadline) {
            guard !pending.answered else { return }
            pending.answered = true
            log("tap did not start within 3 s: the audio queue is stuck in a Core Audio call")
            server.send(client, ["type": "error", "message": "The system audio tap did not start within 3 s; restart the helper"])
            server.close(client)
        }
    }
    audioQueue.async {
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
        micClients = wantedMic
        reconcileMic(wanted: wantedMic > 0 && failure == nil)
        let status = micStatus()
        guard let client = reply else { return }
        server.queue.async {
            guard !pending.answered else { return }
            pending.answered = true
            if let failure {
                server.send(client, ["type": "error", "message": "Could not start the system audio tap: \(failure)"])
                server.close(client)
            } else {
                var started: [String: Any] = [
                    "type": "started",
                    "sampleRate": Int(Downsampler.outputRate),
                    "inputSampleRate": Int(tap.sampleRate),
                    "permission": AudioCapturePermission.preflight().rawValue,
                ]
                if replyWantsMic { started.merge(status) { a, _ in a } }
                server.send(client, started)
            }
        }
    }
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

// The default output changing (earphones plugged in) leaves an output-clocked
// aggregate on the old device: rebuild it.
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
