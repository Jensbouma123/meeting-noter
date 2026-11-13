import AudioToolbox
import CoreAudio
import Foundation

func throwIfCoreAudioFailed(_ status: OSStatus, _ what: String) throws {
    if status != noErr { throw CoreAudioError(what: what, status: status) }
}

func globalPropertyAddress(_ selector: AudioObjectPropertySelector) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(
        mSelector: selector,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
}

func getCoreAudioProperty<T>(_ object: AudioObjectID, _ selector: AudioObjectPropertySelector, _ value: inout T) throws {
    var addr = globalPropertyAddress(selector)
    var size = UInt32(MemoryLayout<T>.size)
    let status = withUnsafeMutablePointer(to: &value) { AudioObjectGetPropertyData(object, &addr, 0, nil, &size, $0) }
    try throwIfCoreAudioFailed(status, "AudioObjectGetPropertyData(\(selector))")
}

func ownProcessObject() -> AudioObjectID? {
    var addr = globalPropertyAddress(kAudioHardwarePropertyTranslatePIDToProcessObject)
    var pid = getpid()
    var object = AudioObjectID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    let status = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &addr,
        UInt32(MemoryLayout<pid_t>.size), &pid, &size, &object
    )
    return status == noErr && object != kAudioObjectUnknown ? object : nil
}

func defaultOutputDeviceUID() throws -> String {
    var device = AudioObjectID(kAudioObjectUnknown)
    try getCoreAudioProperty(AudioObjectID(kAudioObjectSystemObject), kAudioHardwarePropertyDefaultOutputDevice, &device)
    var uid: Unmanaged<CFString>?
    try getCoreAudioProperty(device, kAudioDevicePropertyDeviceUID, &uid)
    guard let uid else { throw CoreAudioError(what: "default output device UID", status: -1) }
    return uid.takeRetainedValue() as String
}
