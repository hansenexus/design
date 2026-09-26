export type StateLocale = "de" | "en";

export type StateCopy = {
  /** Loading placeholders and the busy container. */
  loading: string;
  /** What the live region says once data arrives. */
  loaded: string;
  empty: { title: string; description: string };
  noResults: { title: string; description: string };
  error: { title: string; description: string; retry: string; digest: string };
  /** The name of a Progress bar without its own label. */
  progress: string;
};

/**
 * The default copy of the state primitives, as plain objects: no i18n library. Every string
 * can be overridden per prop (monorepo apps pass their `states.*` next-intl messages). The
 * German avoids both du and Sie, so it fits any app's register.
 */
export const STATE_COPY: Record<StateLocale, StateCopy> = {
  en: {
    loading: "Loading",
    loaded: "Loaded",
    empty: { title: "Nothing here yet", description: "What gets added will show up here." },
    noResults: {
      title: "No results",
      description: "Try a different search or fewer filters.",
    },
    error: {
      title: "Something went wrong",
      description: "This could not be loaded. Please try again.",
      retry: "Try again",
      digest: "Reference",
    },
    progress: "Progress",
  },
  de: {
    loading: "Wird geladen",
    loaded: "Geladen",
    empty: { title: "Noch nichts da", description: "Was hinzugefügt wird, erscheint hier." },
    noResults: {
      title: "Keine Treffer",
      description: "Andere Suchbegriffe oder weniger Filter probieren.",
    },
    error: {
      title: "Etwas ist schiefgelaufen",
      description: "Das konnte nicht geladen werden. Bitte erneut versuchen.",
      retry: "Erneut versuchen",
      digest: "Referenz",
    },
    progress: "Fortschritt",
  },
};

export const STATE_LOCALES = Object.keys(STATE_COPY) as StateLocale[];
