import type { ResponsiveSize, SizeTier } from "../../../lib/sizing-tokens/index.js";
import type { FileInputMessages } from "./types.js";
export declare const plural: (n: number) => string;
export declare const DEFAULT_MESSAGES: FileInputMessages;
export declare const AVATAR_SIZE: Record<SizeTier, string>;
export declare function stepDown(size: ResponsiveSize<SizeTier>): ResponsiveSize<SizeTier>;
export declare const PEER_FOCUS = "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500";
export declare const SAFE_PREVIEW: RegExp;
