import AppKit

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon.png"
let size = 1024
guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)
else { fatalError("no bitmap") }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

let body = NSRect(x: 100, y: 100, width: 824, height: 824)
let shape = NSBezierPath(roundedRect: body, xRadius: 185, yRadius: 185)
NSGradient(
    starting: NSColor(srgbRed: 0.20, green: 0.42, blue: 0.95, alpha: 1),
    ending: NSColor(srgbRed: 0.43, green: 0.24, blue: 0.85, alpha: 1))!
    .draw(in: shape, angle: -60)

NSColor.white.setFill()
let heights: [CGFloat] = [140, 300, 460, 340, 560, 380, 220, 120]
let bar: CGFloat = 52, gap: CGFloat = 34
let total = CGFloat(heights.count) * bar + CGFloat(heights.count - 1) * gap
var x = body.midX - total / 2
for h in heights {
    NSBezierPath(roundedRect: NSRect(x: x, y: body.midY - h / 2, width: bar, height: h),
                 xRadius: bar / 2, yRadius: bar / 2).fill()
    x += bar + gap
}

NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
