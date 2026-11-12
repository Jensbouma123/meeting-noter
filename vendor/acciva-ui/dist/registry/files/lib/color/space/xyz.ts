import type { Gamut, LinearRGB, OKLab, XYZ } from "@/lib/color/types";
import {
  apply,
  LINEAR_RGB_TO_XYZ,
  LMS_TO_OKLAB,
  LMS_TO_XYZ,
  OKLAB_TO_LMS,
  XYZ_TO_LINEAR_RGB,
  XYZ_TO_LMS,
} from "@/lib/color/space/matrix";

export function linearRgbToXyz(rgb: LinearRGB, gamut: Gamut = "srgb"): XYZ {
  const [x, y, z] = apply(LINEAR_RGB_TO_XYZ[gamut], rgb.r, rgb.g, rgb.b);
  return { x, y, z };
}

export function xyzToLinearRgb(xyz: XYZ, gamut: Gamut = "srgb"): LinearRGB {
  const [r, g, b] = apply(XYZ_TO_LINEAR_RGB[gamut], xyz.x, xyz.y, xyz.z);
  return { r, g, b };
}

export function xyzToOklab(xyz: XYZ): OKLab {
  const [long, medium, short] = apply(XYZ_TO_LMS, xyz.x, xyz.y, xyz.z);
  const [l, a, b] = apply(
    LMS_TO_OKLAB,
    Math.cbrt(long),
    Math.cbrt(medium),
    Math.cbrt(short),
  );
  return { l, a, b };
}

export function oklabToXyz(lab: OKLab): XYZ {
  const [long, medium, short] = apply(OKLAB_TO_LMS, lab.l, lab.a, lab.b);
  const [x, y, z] = apply(LMS_TO_XYZ, long ** 3, medium ** 3, short ** 3);
  return { x, y, z };
}
