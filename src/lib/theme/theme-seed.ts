import { THEME_STORAGE_KEY } from "@jensbouma123/acciva-ui/theme";
import type { ThemeSeed } from "./theme-seed.types";

export const THEME_SEED: ThemeSeed = {
  seed: "#3f6f8a",
  harmony: "analogous",
};

export const pinThemeSeedScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=${JSON.stringify(THEME_SEED)};var o={};try{o=JSON.parse(localStorage.getItem(k)||"{}")||{};}catch(e){}if(o.primaryHex!==s.seed||o.harmony!==s.harmony){o.primaryHex=s.seed;o.harmony=s.harmony;delete o.tokenOverrides;localStorage.setItem(k,JSON.stringify(o));}}catch(e){}})();`;
