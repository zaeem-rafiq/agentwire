import AppKit

guard CommandLine.arguments.count == 3 else {
    fputs("usage: render-cards.swift input.svg output.png\n", stderr)
    exit(2)
}

let source = CommandLine.arguments[1]
let destination = CommandLine.arguments[2]
let width = 1280
let height = 720

guard let image = NSImage(contentsOfFile: source),
      let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
      ) else {
    fputs("could not load SVG or create bitmap\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
image.draw(
    in: NSRect(x: 0, y: 0, width: width, height: height),
    from: NSRect(origin: .zero, size: image.size),
    operation: .copy,
    fraction: 1
)
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("could not encode PNG\n", stderr)
    exit(1)
}

do {
    try png.write(to: URL(fileURLWithPath: destination))
} catch {
    fputs("could not write PNG: \(error)\n", stderr)
    exit(1)
}
