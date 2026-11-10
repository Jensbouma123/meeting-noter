import AVFoundation
import Foundation

/// The "System Audio Recording" (TCC `kTCCServiceAudioCapture`) state.
///
/// macOS has no public API to read it; this uses the TCC framework's
/// preflight/request calls, resolved at run time so a missing symbol only
/// means "unknown". A tap without the permission records exact silence.
enum AudioCapturePermission: String {
    case granted, denied, unknown

    private typealias PreflightFn = @convention(c) (CFString, CFDictionary?) -> Int32
    private typealias RequestFn = @convention(c) (CFString, CFDictionary?, @escaping @convention(block) (Bool) -> Void) -> Void

    private static let service = "kTCCServiceAudioCapture" as CFString
    private static let tcc = dlopen("/System/Library/PrivateFrameworks/TCC.framework/Versions/A/TCC", RTLD_NOW)

    static func preflight() -> AudioCapturePermission {
        guard let tcc, let sym = dlsym(tcc, "TCCAccessPreflight") else { return .unknown }
        switch unsafeBitCast(sym, to: PreflightFn.self)(service, nil) {
        case 0: return .granted
        case 1: return .denied
        default: return .unknown
        }
    }

    /// Shows the system prompt when the user has not decided yet.
    static func request(_ completion: @escaping (Bool) -> Void) {
        guard let tcc, let sym = dlsym(tcc, "TCCAccessRequest") else {
            completion(false)
            return
        }
        unsafeBitCast(sym, to: RequestFn.self)(service, nil, completion)
    }
}

/// The Microphone (TCC `kTCCServiceMicrophone`) state, for the mic mixed
/// into the stream. Without it the default input device records silence.
enum MicrophonePermission {
    static func preflight() -> AudioCapturePermission {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return .granted
        case .denied, .restricted: return .denied
        default: return .unknown
        }
    }

    /// Shows the system prompt when the user has not decided yet.
    static func request(_ completion: @escaping (Bool) -> Void) {
        AVCaptureDevice.requestAccess(for: .audio, completionHandler: completion)
    }
}
