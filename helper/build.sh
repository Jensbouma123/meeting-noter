#!/bin/sh
# Builds helper/build/meeting-noter-audio-helper: a single binary with its
# Info.plist (bundle id + System Audio Recording and Microphone usage texts) embedded in the
# __TEXT,__info_plist section, ad-hoc signed under that bundle id so the
# permission is recorded against it. Needs the Xcode command line tools.
set -eu
cd "$(dirname "$0")"
mkdir -p build
out=build/meeting-noter-audio-helper
swiftc -O -swift-version 5 \
  -target "$(uname -m)-apple-macos14.4" \
  -framework CoreAudio -framework AudioToolbox -framework AVFoundation -framework Network \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker Info.plist \
  -o "$out" Sources/*.swift
codesign --force --sign - --identifier nl.jensbouma.meeting-noter.audio-helper "$out"
echo "built $(pwd)/$out"
