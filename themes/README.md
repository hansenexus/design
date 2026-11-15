# Theme packs

An app's whole design, structure included, swaps by changing its theme pack, never by editing
components (design#143, ruling `dec_2026-11-15_global-design-theme-packs-gallery-workbench`).
The core stays in `packages/`: `@hansenexus/tokens`, `@hansenexus/ui`, `@hansenexus/shell`.

```
themes/<app>/
  pack.json                 { "app": "<app>", "default": "<direction>" }
  <direction>/
    palette.json            the direction's primitives: never emitted, only referenced
    tokens.json             any core token it overrides, recipes included
    tokens.dark.json        per-mode overrides (optional)
    tokens.light.json
    skins/                  structure the recipes cannot express (optional)
      <item>.tsx            one file per skinned item, `<item>.<part>.tsx` for a part
      _<helper>.tsx         shared pieces, at atom level
      index.ts              the direction's `skins` map for its ThemePackDefinition
```

- **Tokens.** A direction overrides the names the core defines (`packages/tokens/tokens/semantic`)
  and adds none; `packages/tokens/tests/packs.test.ts` holds every direction to exactly the core's
  names in both modes. The palette may be any colour: the ratchet exempts a direction's
  `palette.json` and `tokens*.json`, and nothing else in a pack.
- **Recipes** are tokens too: `border.width`/`style`, `elevation.*`, `control.*` (control shape
  as radii), `motif.*`, plus the existing `radius.*` and density (`size.*`). The table is in
  [packages/tokens/README.md](../packages/tokens/README.md#recipes). The atoms of
  `@hansenexus/ui` read them, so a pack never forks an atom.
- **Skins.** What recipes cannot say, a skin says: a component for one slot of
  `@hansenexus/ui`'s `SkinSlots` (molecules, organisms and the `shell` template; atoms have
  none), mounted with `<ThemePack pack={…}>`. A slot the pack leaves out renders the default.
  A skin sits at the level of the item it skins and imports only that level or lower: named
  imports from `@hansenexus/ui` count as the item that exports them, `@hansenexus/shell` as a
  template, `./<file>` as that sibling skin (`bun run ratchet`, `scripts/levels.ts`). Skins are
  not exempt from the raw-colour ratchet.
- **Theme ids.** The default direction's `data-theme` is the app's name; another direction's is
  `<app>-<direction>`, so a candidate can render beside the live one in the gallery.
- **Checks.** `bun run contrast` resolves every direction in both modes against the same WCAG
  rules as the core themes.

| Pack | Directions | Ships in |
| --- | --- | --- |
| `lexilink` | `ledger` (B2 Ledger, default) | `@hansenexus/tokens` (`data-theme="lexilink"`), until lexilink adopts its pack |
