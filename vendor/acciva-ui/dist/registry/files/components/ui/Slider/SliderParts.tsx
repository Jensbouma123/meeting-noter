import { TEXT_SIZE, resolveResponsive, type ResponsiveSize, type SizeTier } from "@/lib/sizing-tokens/index";
import { HStack } from "@/components/ui/HStack";

interface SliderLabelProps {
  id: string;
  label: string;
  readout: string | number;
  size: ResponsiveSize<SizeTier>;
}

export function SliderLabel({ id, label, readout, size }: SliderLabelProps) {
  return (
    <HStack justify="between" spacing="none" className={resolveResponsive(size, TEXT_SIZE)}>
      <span id={id} className="font-medium text-foreground">
        {label}
      </span>
      <span className="text-muted-foreground">{readout}</span>
    </HStack>
  );
}
