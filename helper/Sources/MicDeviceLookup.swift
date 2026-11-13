import AudioToolbox
import CoreAudio
import Foundation

func scopedPropertyAddress(
    _ selector: AudioObjectPropertySelector,
    _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal
) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}
func defaultInputDevice() -> AudioObjectID? {
    var addr = scopedPropertyAddress(kAudioHardwarePropertyDefaultInputDevice)
    var device = AudioObjectID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioObjectID>.size)
    let status = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &device)
    return status == noErr && device != kAudioObjectUnknown ? device : nil
}

func deviceName(_ device: AudioObjectID) -> String {
    var addr = scopedPropertyAddress(kAudioObjectPropertyName)
    var name: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(device, &addr, 0, nil, &size, &name) == noErr, let name else { return "device \(device)" }
    return name.takeRetainedValue() as String
}
