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
  /** Form states: the field-level and form-level messages of the form set. */
  form: {
    /** After a submit with field errors: the form-level summary. */
    invalid: string;
    /** On the submit button while the server has not answered. */
    pending: string;
    /** The server refused or failed; nothing was saved. */
    serverError: { title: string; description: string };
  };
  /** DatePicker and Calendar. */
  date: {
    placeholder: string;
    rangePlaceholder: string;
    previousMonth: string;
    nextMonth: string;
    /** The popover's name. */
    calendar: string;
  };
  /** Combobox: the list's own states. `{query}` is replaced by what was typed. */
  combobox: {
    placeholder: string;
    loading: string;
    empty: string;
    noResults: string;
    error: string;
    retry: string;
  };
  /** DataTable selection and filters. `{row}` is replaced by the row's label. */
  table: {
    selectAll: string;
    selectRow: string;
    clearFilters: string;
  };
};

/** Replaces each `{name}` in a copy template with its value. */
export function fillCopy(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => values[name] ?? whole);
}

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
    form: {
      invalid: "Some fields need attention. Check the marked fields.",
      pending: "Saving",
      serverError: {
        title: "Not saved",
        description: "The server did not accept this. Nothing was changed; please try again.",
      },
    },
    date: {
      placeholder: "Pick a date",
      rangePlaceholder: "Pick a date range",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      calendar: "Calendar",
    },
    combobox: {
      placeholder: "Search",
      loading: "Loading options",
      empty: "No options yet",
      noResults: "Nothing matches “{query}”",
      error: "The options could not be loaded.",
      retry: "Try again",
    },
    table: {
      selectAll: "Select all rows",
      selectRow: "Select {row}",
      clearFilters: "Clear filters",
    },
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
    form: {
      invalid: "Einige Angaben fehlen oder stimmen nicht. Bitte die markierten Felder prüfen.",
      pending: "Wird gespeichert",
      serverError: {
        title: "Nicht gespeichert",
        description:
          "Der Server hat das nicht angenommen. Nichts wurde geändert; bitte erneut versuchen.",
      },
    },
    date: {
      placeholder: "Datum wählen",
      rangePlaceholder: "Zeitraum wählen",
      previousMonth: "Vorheriger Monat",
      nextMonth: "Nächster Monat",
      calendar: "Kalender",
    },
    combobox: {
      placeholder: "Suchen",
      loading: "Optionen werden geladen",
      empty: "Noch keine Optionen",
      noResults: "Nichts passt zu „{query}“",
      error: "Die Optionen konnten nicht geladen werden.",
      retry: "Erneut versuchen",
    },
    table: {
      selectAll: "Alle Zeilen auswählen",
      selectRow: "{row} auswählen",
      clearFilters: "Filter zurücksetzen",
    },
  },
};

export const STATE_LOCALES = Object.keys(STATE_COPY) as StateLocale[];
