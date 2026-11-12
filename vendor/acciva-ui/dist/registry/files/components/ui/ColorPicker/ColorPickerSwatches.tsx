import { useId } from "react";
import { Check } from "lucide-react";
import { rgbaToHex, type RGBA } from "@/lib/color/formats/index";
import { relativeLuminance } from "@/lib/color/contrast/index";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { LIGHT_GLYPH_LUMINANCE, checkeredFill, type ResolvedSwatch } from "@/components/ui/ColorPicker/colorPickerUtils";

interface SwatchGroupProps {
  caption: string;
  swatches: readonly ResolvedSwatch[];
  selectedHex: string;
  allowAlpha: boolean;
  onSelect: (rgba: RGBA) => void;
}

export function SwatchGroup({ caption, swatches, selectedHex, allowAlpha, onSelect }: SwatchGroupProps) {
  const captionId = useId();
  if (swatches.length === 0) return null;
  return (
    <VStack spacing="xs">
      <span id={captionId} className={cn("font-medium text-muted-foreground", TEXT_SIZE.xs)}>
        {caption}
      </span>
      <div role="group" aria-labelledby={captionId} className="flex flex-wrap gap-2">
        {swatches.map(({ label, rgba }) => {
          const hex = rgbaToHex(rgba, allowAlpha);
          const selected = hex === selectedHex;
          const glyphOnLight = relativeLuminance(rgbaToHex(rgba, false)) > LIGHT_GLYPH_LUMINANCE;
          return (
            <button
              key={`${label}-${hex}`}
              type="button"
              aria-pressed={selected}
              aria-label={label === hex ? hex : `${label}, ${hex}`}
              onClick={() => onSelect(allowAlpha ? rgba : { ...rgba, a: 1 })}
              className="focus-ring touch-target-44 relative flex size-9 items-center justify-center rounded-md border border-border md:size-7"
              style={checkeredFill(rgba)}
            >
              {selected ? (
                <Check
                  aria-hidden="true"
                  className={cn("size-4", glyphOnLight ? "text-neutral-950" : "text-neutral-50")}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </VStack>
  );
}
