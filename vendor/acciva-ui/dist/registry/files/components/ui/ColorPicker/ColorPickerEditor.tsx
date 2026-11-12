import { rgbaToHex, type ColorFormat, type HSLA, type HSVA, type RGBA } from "@/lib/color/formats/index";
import { cn } from "@/lib/utils";
import { Tab, TabList, Tabs } from "@/components/ui/Tabs/index";
import { ChannelInput, HexInput, integerIn } from "@/components/ui/ColorPicker/ColorPickerInputs";
import { FORMATS } from "@/components/ui/ColorPicker/colorPickerUtils";

interface ColorPickerEditorProps {
  editorFormat: ColorFormat;
  onEditorFormatChange: (format: ColorFormat) => void;
  hsva: HSVA;
  rgba: RGBA;
  hsla: HSLA;
  allowAlpha: boolean;
  commitRgba: (next: RGBA) => void;
  commitHsla: (next: HSLA) => void;
  onChange: (hsva: HSVA) => void;
}

export function ColorPickerEditor({
  editorFormat,
  onEditorFormatChange,
  hsva,
  rgba,
  hsla,
  allowAlpha,
  commitRgba,
  commitHsla,
  onChange,
}: ColorPickerEditorProps) {
  const alphaInput = allowAlpha ? (
    <ChannelInput
      label="A"
      accessibleName="Alpha"
      committed={String(Math.round(hsva.a * 100))}
      parse={integerIn(100)}
      onCommit={(value) => onChange({ ...hsva, a: value / 100 })}
    />
  ) : null;

  return (
    <>
      <Tabs
        value={editorFormat}
        onValueChange={(next) => onEditorFormatChange(next as ColorFormat)}
        variant="pill"
        size="sm"
        className="w-full"
      >
        <TabList aria-label="Color format" className="w-full">
          {FORMATS.map((option) => (
            <Tab key={option} value={option} className="flex-1 justify-center">
              {option.toUpperCase()}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <div className={cn("grid gap-2", allowAlpha ? "grid-cols-4" : "grid-cols-3")}>
        {editorFormat === "hex" ? (
          <div className="col-span-3">
            <HexInput committed={rgbaToHex(rgba, false)} onCommit={(next) => commitRgba(next.a < 1 ? next : { ...next, a: hsva.a })} />
          </div>
        ) : editorFormat === "rgb" ? (
          (["r", "g", "b"] as const).map((channel) => (
            <ChannelInput
              key={channel}
              label={channel.toUpperCase()}
              accessibleName={{ r: "Red", g: "Green", b: "Blue" }[channel]}
              committed={String(rgba[channel])}
              parse={integerIn(255)}
              onCommit={(value) => commitRgba({ ...rgba, a: hsva.a, [channel]: value })}
            />
          ))
        ) : (
          (["h", "s", "l"] as const).map((channel) => (
            <ChannelInput
              key={channel}
              label={channel.toUpperCase()}
              accessibleName={{ h: "Hue", s: "Saturation", l: "Lightness" }[channel]}
              committed={String(hsla[channel])}
              parse={integerIn(channel === "h" ? 360 : 100)}
              onCommit={(value) => commitHsla({ ...hsla, a: hsva.a, [channel]: channel === "h" ? value % 360 : value })}
            />
          ))
        )}
        {alphaInput}
      </div>
    </>
  );
}
