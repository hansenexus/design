import type { StateLocale } from "@hansenexus/ui";

/**
 * The page patterns' own words (design#240): TabbedPage, Wizard, Queue. Kept apart from
 * SHELL_COPY so a 0.3 ShellCopy object still type-checks. Every string is a prop default; `{n}`
 * style placeholders are filled with fillCopy.
 */
export type PatternCopy = {
  /** TabbedPage: the confirm before a tab switch or a leave that would drop unsaved changes. */
  unsavedTitle: string;
  unsavedBody: string;
  unsavedDiscard: string;
  unsavedStay: string;
  /** TabbedPage: the select that stands in for a long tab bar on a phone. */
  tabsSelect: string;
  /** Wizard footer. */
  wizardBack: string;
  wizardNext: string;
  wizardFinish: string;
  wizardCancel: string;
  /** Wizard: a step's validation failed without a message of its own. */
  wizardInvalid: string;
  /** Wizard: the exit confirm while there are changes. */
  wizardExitTitle: string;
  wizardExitBody: string;
  wizardExitLeave: string;
  wizardExitStay: string;
  /** Queue: the list in the aside, and its toggle. */
  queueList: string;
  /** Queue header: review progress, `{done}` of `{total}`. */
  queueProgress: string;
  /** Queue header (create mode): `{count}` items added so far. */
  queueCount: string;
  queuePrev: string;
  queueNext: string;
  /** Queue: the shortcut overlay's button and heading. */
  queueShortcuts: string;
  queueShortcutPrev: string;
  queueShortcutNext: string;
  queueShortcutHelp: string;
  queueShortcutSave: string;
  /** Queue: nothing open is left. */
  queueDoneTitle: string;
  queueDoneBody: string;
  /** Queue (create): save the form and start the next item, or save an edit. */
  queueSaveNext: string;
  queueSaveEdit: string;
  queueCancelEdit: string;
  queueEdit: string;
  queueRemove: string;
  /** Queue (create): the list before the first item. */
  queueEmptyList: string;
  /** Queue: finish the session. */
  queueFinish: string;
  /** Queue item statuses, read after the item in the list. */
  queueStatus: Record<"open" | "done" | "skipped" | "flagged", string>;
};

export const PATTERN_COPY: Record<StateLocale, PatternCopy> = {
  en: {
    unsavedTitle: "Discard unsaved changes?",
    unsavedBody: "This section has changes that are not saved yet.",
    unsavedDiscard: "Discard",
    unsavedStay: "Keep editing",
    tabsSelect: "Section",
    wizardBack: "Back",
    wizardNext: "Next",
    wizardFinish: "Finish",
    wizardCancel: "Cancel",
    wizardInvalid: "Check the entries in this step.",
    wizardExitTitle: "Leave without finishing?",
    wizardExitBody: "What you entered so far is not created.",
    wizardExitLeave: "Leave",
    wizardExitStay: "Stay",
    queueList: "All items",
    queueProgress: "{done} of {total} done",
    queueCount: "{count} added",
    queuePrev: "Previous item",
    queueNext: "Next item",
    queueShortcuts: "Keyboard shortcuts",
    queueShortcutPrev: "Previous item",
    queueShortcutNext: "Next item",
    queueShortcutHelp: "Show these shortcuts",
    queueShortcutSave: "Save and start the next one",
    queueDoneTitle: "All done",
    queueDoneBody: "Every item in this queue has been handled.",
    queueSaveNext: "Save and next",
    queueSaveEdit: "Save changes",
    queueCancelEdit: "Cancel edit",
    queueEdit: "Edit",
    queueRemove: "Remove",
    queueEmptyList: "Nothing added yet.",
    queueFinish: "Finish",
    queueStatus: { open: "open", done: "done", skipped: "skipped", flagged: "flagged" },
  },
  de: {
    unsavedTitle: "Ungespeicherte Änderungen verwerfen?",
    unsavedBody: "In diesem Bereich gibt es Änderungen, die noch nicht gespeichert sind.",
    unsavedDiscard: "Verwerfen",
    unsavedStay: "Weiter bearbeiten",
    tabsSelect: "Bereich",
    wizardBack: "Zurück",
    wizardNext: "Weiter",
    wizardFinish: "Fertig",
    wizardCancel: "Abbrechen",
    wizardInvalid: "Bitte die Angaben in diesem Schritt prüfen.",
    wizardExitTitle: "Ohne Abschluss verlassen?",
    wizardExitBody: "Die bisherigen Angaben werden nicht angelegt.",
    wizardExitLeave: "Verlassen",
    wizardExitStay: "Bleiben",
    queueList: "Alle Einträge",
    queueProgress: "{done} von {total} erledigt",
    queueCount: "{count} erfasst",
    queuePrev: "Vorheriger Eintrag",
    queueNext: "Nächster Eintrag",
    queueShortcuts: "Tastenkürzel",
    queueShortcutPrev: "Vorheriger Eintrag",
    queueShortcutNext: "Nächster Eintrag",
    queueShortcutHelp: "Diese Übersicht zeigen",
    queueShortcutSave: "Speichern und nächsten beginnen",
    queueDoneTitle: "Alles erledigt",
    queueDoneBody: "Jeder Eintrag in dieser Liste ist bearbeitet.",
    queueSaveNext: "Speichern & weiter",
    queueSaveEdit: "Änderung speichern",
    queueCancelEdit: "Bearbeiten abbrechen",
    queueEdit: "Bearbeiten",
    queueRemove: "Entfernen",
    queueEmptyList: "Noch nichts erfasst.",
    queueFinish: "Fertig",
    queueStatus: { open: "offen", done: "erledigt", skipped: "übersprungen", flagged: "markiert" },
  },
};
