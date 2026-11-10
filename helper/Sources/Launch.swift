import CoreAudio
import Foundation

var signalSources: [DispatchSourceSignal] = []

/// Re-runs this executable with its TCC responsibility disclaimed, waits for
/// it and returns its exit status; `nil` when the system has no way to do so.
///
/// `responsibility_spawnattrs_setdisclaim` is the libsystem call Chromium
/// and LLDB use for the same purpose; it is resolved at run time.
func relaunchDisclaimed() -> Int32? {
    typealias DisclaimFn = @convention(c) (UnsafeMutablePointer<posix_spawnattr_t?>, Int32) -> Int32
    guard let sym = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "responsibility_spawnattrs_setdisclaim"),
          let path = Bundle.main.executablePath else { return nil }
    var attr: posix_spawnattr_t?
    posix_spawnattr_init(&attr)
    defer { posix_spawnattr_destroy(&attr) }
    guard unsafeBitCast(sym, to: DisclaimFn.self)(&attr, 1) == 0 else { return nil }
    setenv("MEETING_NOTER_HELPER_DISCLAIMED", "1", 1)
    var pid: pid_t = 0
    guard posix_spawn(&pid, path, nil, &attr, CommandLine.unsafeArgv, environ) == 0 else { return nil }
    // Ctrl-C reaches the child through the terminal's process group; a
    // SIGTERM (npm stopping the script) is passed on.
    signal(SIGINT, SIG_IGN)
    signal(SIGTERM, SIG_IGN)
    let term = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .global())
    term.setEventHandler { kill(pid, SIGTERM) }
    term.resume()
    signalSources.append(term)
    var status: Int32 = 0
    while waitpid(pid, &status, 0) == -1, errno == EINTR {}
    let exited = status & 0x7f == 0
    return exited ? (status >> 8) & 0xff : 128 + (status & 0x7f)
}

/// Calls `handler` (on the main queue) whenever the default output device changes.
func onDefaultOutputChange(_ handler: @escaping () -> Void) {
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &addr, .main) { _, _ in handler() }
}
