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
  /** Overlays: the close control of a Sheet. */
  overlay: { close: string };
  /** Breadcrumb and Pagination. `{page}` and `{count}` are filled by `fillCopy`. */
  navigation: {
    breadcrumb: string;
    /** The collapsed middle of a Breadcrumb. */
    more: string;
    pagination: string;
    previous: string;
    next: string;
    /** One page button's name. */
    page: string;
    /** Announced once a page has loaded. */
    pageOf: string;
    /** Announced while a requested page is still loading. */
    loadingPage: string;
  };
  /** The command palette. `{query}` and `{count}` are filled by `fillCopy`. */
  command: {
    label: string;
    placeholder: string;
    /** Nothing typed and nothing to suggest. */
    empty: string;
    noResults: string;
    results: { one: string; other: string };
    /** The search itself failed. */
    error: string;
    /** The keyboard hints in the footer. */
    hints: { navigate: string; select: string; close: string };
  };
};

/** Fills `{name}` placeholders in a copy string; unknown names stay as they are. */
export function fillCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  );
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
    overlay: { close: "Close" },
    navigation: {
      breadcrumb: "Breadcrumb",
      more: "Show hidden levels",
      pagination: "Pagination",
      previous: "Previous",
      next: "Next",
      page: "Page {page}",
      pageOf: "Page {page} of {count}",
      loadingPage: "Loading page {page}",
    },
    command: {
      label: "Command palette",
      placeholder: "Type a command or search",
      empty: "Start typing to search.",
      noResults: "Nothing matches “{query}”.",
      results: { one: "1 result", other: "{count} results" },
      error: "The search failed. Results may be missing.",
      hints: { navigate: "navigate", select: "open", close: "close" },
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
    overlay: { close: "Schließen" },
    navigation: {
      breadcrumb: "Seitenpfad",
      more: "Ausgeblendete Ebenen zeigen",
      pagination: "Seitennavigation",
      previous: "Zurück",
      next: "Weiter",
      page: "Seite {page}",
      pageOf: "Seite {page} von {count}",
      loadingPage: "Seite {page} wird geladen",
    },
    command: {
      label: "Befehlspalette",
      placeholder: "Befehl oder Suchbegriff eingeben",
      empty: "Zum Suchen tippen.",
      noResults: "Nichts passt zu „{query}“.",
      results: { one: "1 Treffer", other: "{count} Treffer" },
      error: "Die Suche ist fehlgeschlagen. Es fehlen womöglich Treffer.",
      hints: { navigate: "wählen", select: "öffnen", close: "schließen" },
    },
  },
};

export const STATE_LOCALES = Object.keys(STATE_COPY) as StateLocale[];
