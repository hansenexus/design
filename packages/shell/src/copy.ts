import type { StateLocale } from "@hansenexus/ui";

/** The shell's own words; the palette's come from @hansenexus/ui's STATE_COPY.command. */
export type ShellCopy = {
  /** The nav landmark, and the nav drawer's heading. */
  nav: string;
  /** The aside landmark (the right column), and the aside sheet's heading. */
  context: string;
  /** The aside toggle while the aside is hidden. */
  showContext: string;
  /** The aside toggle while the aside is shown. */
  hideContext: string;
  /** The button that opens the ⌘K container, for touch and for anyone who does not know ⌘K. */
  openCommand: string;
  /** @deprecated 0.2's phone More tab; the 0.3 shell has no tab bar. Kept for 0.2 callers. */
  more: string;
  /** The header's menu button that opens the nav drawer under 768 px of shell width. */
  openNav: string;
  /** The close button of the nav drawer and the aside sheet. */
  close: string;
  /** The skip link, the first stop of the keyboard, to the page's slot. */
  skip: string;
  /** The full layout's back link, when the page gives it no label of its own. */
  back: string;
};

export const SHELL_COPY: Record<StateLocale, ShellCopy> = {
  en: {
    nav: "App",
    context: "Context",
    showContext: "Show context panel",
    hideContext: "Hide context panel",
    openCommand: "Search or run a command",
    more: "More",
    openNav: "Open navigation",
    close: "Close",
    skip: "Skip to content",
    back: "Back",
  },
  de: {
    nav: "App",
    context: "Kontext",
    showContext: "Kontextbereich zeigen",
    hideContext: "Kontextbereich ausblenden",
    openCommand: "Suchen oder Befehl ausführen",
    more: "Mehr",
    openNav: "Navigation öffnen",
    close: "Schließen",
    skip: "Zum Inhalt springen",
    back: "Zurück",
  },
};
