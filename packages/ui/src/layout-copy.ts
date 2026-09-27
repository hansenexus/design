import type { StateLocale } from "./state-copy";

export type AlertTone = "info" | "success" | "warning" | "critical";

export type LayoutCopy = {
  /** Read before an Alert's text, so the tone never rests on colour and shape alone. */
  tone: Record<AlertTone, string>;
  /** The close button of a dismissible Alert or Banner. */
  dismiss: string;
  /** A CardSkeleton or loading Avatar without its own label. */
  loading: string;
  /** Accordion content that has nothing in it. */
  empty: string;
};

/**
 * The default copy of the layout primitives (Card, Alert, Banner, Avatar, Accordion), plain
 * objects like STATE_COPY, and like it without du or Sie. Every string has a prop to override it.
 */
export const LAYOUT_COPY: Record<StateLocale, LayoutCopy> = {
  en: {
    tone: { info: "Info", success: "Success", warning: "Warning", critical: "Critical" },
    dismiss: "Dismiss",
    loading: "Loading",
    empty: "Nothing here yet.",
  },
  de: {
    tone: { info: "Hinweis", success: "Erfolg", warning: "Warnung", critical: "Kritisch" },
    dismiss: "Schließen",
    loading: "Wird geladen",
    empty: "Noch nichts da.",
  },
};
