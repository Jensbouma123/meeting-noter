import { pinThemeSeedScript } from "./theme-seed";

export function PinThemeSeed() {
  return <script dangerouslySetInnerHTML={{ __html: pinThemeSeedScript }} />;
}
