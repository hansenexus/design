import type { StateLocale } from "@hansenexus/ui";

/** The shell's own words; the palette's come from @hansenexus/ui's STATE_COPY.command. */
export type ShellCopy = {
  /** The nav landmark. */
  nav: string;
  /** The context pane landmark. */
  context: string;
  showContext: string;
  hideContext: string;
  /** The button that opens the ⌘K container, for touch and for anyone who does not know ⌘K. */
  openCommand: string;
};

export const SHELL_COPY: Record<StateLocale, ShellCopy> = {
  en: {
    nav: "App",
    context: "Context",
    showContext: "Show context panel",
    hideContext: "Hide context panel",
    openCommand: "Search or run a command",
  },
  de: {
    nav: "App",
    context: "Kontext",
    showContext: "Kontextbereich zeigen",
    hideContext: "Kontextbereich ausblenden",
    openCommand: "Suchen oder Befehl ausführen",
  },
};
