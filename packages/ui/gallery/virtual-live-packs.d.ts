// `virtual:live-packs`, built by scripts/live.ts (design#149): main's pack directions under
// `<id>@live`, and where main came from.
declare module "virtual:live-packs" {
  import type { ThemePackDefinition } from "../src";
  export const LIVE_PACKS: readonly ThemePackDefinition[];
  export const LIVE_SOURCE: string;
}
