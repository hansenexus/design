// `virtual:editor`, built by scripts/edit.ts (design#151): every pack direction's editable tokens
// in both modes, for the live editor.
declare module "virtual:editor" {
  import type { EditorTheme } from "./edit";
  export const EDITOR_THEMES: readonly EditorTheme[];
}
