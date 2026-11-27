# Changelog

## 0.3.0

The layout system (design#239, owner ruling 2026-11-27 in the fachwerk walkthrough, fachwerk#309).

- `layout`: `work` (nav column, page column, aside column), `focus` (the aside folded, toggleable)
  and `full` (no nav column, `back` link in the header).
- The page column: a sticky header, the scrolling slot (`children`) and a new fixed `footer` bar,
  a `contentinfo` landmark, safe-area padded and lifted above an on-screen keyboard.
- Phone (under 768 px of shell width, the owner's M2): the nav is a focus-trapped drawer from the
  header's menu button (Escape, a click outside, a swipe or a picked row close it; focus returns to
  the button). The phone tab bar is gone.
- The aside (`aside`, was `contextPane`) is a column from 1280 px, a side sheet from 768 px and a
  bottom sheet below, opened by `ShellAsideToggle` (was `ShellContextToggle`).
- `layout="session"` (owner addendum, same day): learning, reading and play on a page of their
  own. No nav, no app header, no aside; `SessionHeader` (exit with an optional confirm, title,
  progress as a bar and `7/20`, status) and an optional `SessionFooter`; the slot centred to a
  `measure` (`text` 65ch or `board` 72rem: the new `shell.measure` / `shell.board` recipe tokens of
  `@hansenexus/tokens` 0.12.0, with the same values as fallbacks on an older tokens); Escape
  is exit; focus stays in the session.
- A skip link to the slot; the overlays' slide respects reduced motion.
- `useShell()` adds `layout`, `width`, `navOpen`, `asideShown`, `toggleAside`; new exports
  `ShellMenuButton`, `ShellAsideToggle`, `SHELL_LAYOUTS`, `SHELL_BREAKPOINTS`, `shellWidthOf`,
  `keyboardInset`, `SessionHeader`, `SessionFooter`, `SHELL_MEASURE`.
- Skinned by the `shell.*` recipe tokens and the `shell` skin slot; the only new tokens are
  `shell.measure` and `shell.board` (tokens 0.12.0).
- Migration: README, "Migrating from 0.2". Every 0.2 prop still compiles.

## 0.2.0

Shell layout recipes, nav sections and the phone More sheet (design#152).
