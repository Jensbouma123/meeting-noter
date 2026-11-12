import { useState } from "react";
import { Pipette } from "lucide-react";
import { hslToRgb, hsvToRgb, rgbaToHex, rgbToHsl, rgbToHsv, type ColorFormat, type HSLA, type HSVA, type RGBA } from "@/lib/color/formats/index";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button/index";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";
import { ColorPickerEditor } from "@/components/ui/ColorPicker/ColorPickerEditor";
import { ChannelSlider } from "@/components/ui/ColorPicker/ColorPickerSliders";
import { Spectrum } from "@/components/ui/ColorPicker/ColorPickerSpectrum";
import { SwatchGroup } from "@/components/ui/ColorPicker/ColorPickerSwatches";
import {
  CHECKERBOARD,
  CHECKER_TILE,
  HUE_GRADIENT,
  checkeredFill,
  cssColor,
  resolveSwatches,
  roundHsla,
  roundRgba,
  toHsva,
} from "@/components/ui/ColorPicker/colorPickerUtils";
import { useEyeDropper } from "@/components/ui/ColorPicker/useEyeDropper";
import type { ColorSwatch } from "@/components/ui/ColorPicker/types";

interface ColorPanelProps {
  hsva: HSVA;
  format: ColorFormat;
  allowAlpha: boolean;
  swatches: readonly (string | ColorSwatch)[] | undefined;
  showEyeDropper: boolean;
  onChange: (hsva: HSVA) => void;
}

export function ColorPanel({ hsva, format, allowAlpha, swatches, showEyeDropper, onChange }: ColorPanelProps) {
  const [editorFormat, setEditorFormat] = useState<ColorFormat>(format);

  const rgba = roundRgba(hsvToRgb(hsva));
  const opaque = cssColor({ ...rgba, a: 1 });
  const rawHsla = rgbToHsl(rgba);
  const hsla = roundHsla(rawHsla.s === 0 ? { ...rawHsla, h: hsva.h } : rawHsla);
  const selectedHex = rgbaToHex(rgba, allowAlpha);

  const commitRgba = (next: RGBA) => onChange(toHsva(next, hsva.h));
  const commitHsla = (next: HSLA) => onChange({ ...rgbToHsv(hslToRgb(next)), h: next.h });

  const eyeDropper = useEyeDropper(showEyeDropper, (picked) => commitRgba({ ...picked, a: hsva.a }));

  return (
    <VStack spacing="md" className={cn("w-full text-foreground md:w-72", TEXT_SIZE.sm)}>
      <Spectrum hsva={hsva} onChange={onChange} />

      <HStack spacing="sm">
        <VStack spacing="xs" className="min-w-0 flex-1">
          <ChannelSlider
            label="Hue"
            value={hsva.h}
            max={360}
            valueText={`${Math.round(hsva.h)} degrees`}
            trackStyle={{ backgroundImage: HUE_GRADIENT }}
            thumbColor={rgbaToHex(hsvToRgb({ h: hsva.h, s: 100, v: 100, a: 1 }))}
            onChange={(h) => onChange({ ...hsva, h })}
          />
          {allowAlpha ? (
            <ChannelSlider
              label="Alpha"
              value={hsva.a * 100}
              max={100}
              valueText={`${Math.round(hsva.a * 100)}%`}
              trackStyle={{
                backgroundImage: `linear-gradient(to right, ${cssColor({ ...rgba, a: 0 })}, ${opaque}), ${CHECKERBOARD}`,
                backgroundSize: `100% 100%, ${CHECKER_TILE}`,
              }}
              thumbColor={opaque}
              onChange={(value) => onChange({ ...hsva, a: value / 100 })}
            />
          ) : null}
        </VStack>
        {eyeDropper.EyeDropperApi ? (
          <Button iconOnly tooltip="Pick color from screen" variant="outline" size="sm" onClick={eyeDropper.pickFromScreen}>
            <Pipette aria-hidden="true" />
          </Button>
        ) : null}
        <span aria-hidden="true" className="size-9 shrink-0 rounded-md border border-border" style={checkeredFill(rgba)} />
      </HStack>

      <ColorPickerEditor
        editorFormat={editorFormat}
        onEditorFormatChange={setEditorFormat}
        hsva={hsva}
        rgba={rgba}
        hsla={hsla}
        allowAlpha={allowAlpha}
        commitRgba={commitRgba}
        commitHsla={commitHsla}
        onChange={onChange}
      />

      <SwatchGroup
        caption="Swatches"
        swatches={resolveSwatches(swatches)}
        selectedHex={selectedHex}
        allowAlpha={allowAlpha}
        onSelect={commitRgba}
      />
    </VStack>
  );
}
