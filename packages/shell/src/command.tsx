// The shell's ⌘K container. The shell owns the mechanics (the shortcut, the modal, focus in and
// back out, closing); what the palette offers comes from outside, as command sets, or the whole
// palette body comes from outside through `palette`. That is how an ops preset such as Lotse's
// CommandBar mounts in it with no change here (dec_2026-09-29_global-design-shell-gallery-atomic:
// the open core owns the generic ⌘K container, Lotse owns the ops content).
import { Command, type CommandGroup, type CommandItem, DialogOverlay } from "@hansenexus/ui";
import { Dialog as DialogPrimitive } from "radix-ui";
import { type ReactNode, useRef } from "react";
import { type Capabilities, navVisible } from "./nav-visibility";

/** One entry: a palette row plus what it does. A rejected `run` is swallowed (see runCommand). */
export type ShellCommand = CommandItem & { run: () => void | Promise<void> };

/**
 * A command set from one source: the app's nav, an addon, a preset. Ids need to be unique only
 * inside their set; the shell namespaces them by the set's id.
 */
export type ShellCommandSet = {
  id: string;
  /** The group heading in the default palette. */
  heading?: string;
  commands: readonly ShellCommand[];
};

/** What a custom palette body gets from the shell. */
export type ShellPaletteContext = {
  /** Close the container; focus goes back to where it was when ⌘K was pressed. */
  close: () => void;
  /** The shell's `commands`, for a body that wants to show them too. */
  sets: readonly ShellCommandSet[];
  /** Close, then run a command, swallowing a rejection. */
  run: (command: ShellCommand) => void;
};

/**
 * A custom palette body. Rendered inside the modal, which focuses its first focusable element on
 * open and closes on Escape or a click outside. The body brings its own chrome.
 */
export type ShellPalette = (context: ShellPaletteContext) => ReactNode;

const SEP = ":";

/** The sets as @hansenexus/ui Command groups, each item id prefixed with its set's id. */
export function commandGroups(sets: readonly ShellCommandSet[]): CommandGroup[] {
  return sets
    .filter((set) => set.commands.length > 0)
    .map((set) => ({
      id: set.id,
      heading: set.heading,
      items: set.commands.map(({ run: _run, ...item }) => ({
        ...item,
        id: `${set.id}${SEP}${item.id}`,
      })),
    }));
}

/** The command behind a namespaced group item id. */
export function findCommand(
  sets: readonly ShellCommandSet[],
  groupItemId: string
): ShellCommand | undefined {
  for (const set of sets) {
    const prefix = `${set.id}${SEP}`;
    if (!groupItemId.startsWith(prefix)) continue;
    const found = set.commands.find((c) => c.id === groupItemId.slice(prefix.length));
    if (found) return found;
  }
  return undefined;
}

/**
 * Runs a command. A rejected run (a cancelled confirm, a denied grant) must not take the app down
 * with it, so it is swallowed here; the command reports its own failure.
 */
export function runCommand(command: ShellCommand): void {
  void Promise.resolve()
    .then(() => command.run())
    .catch(() => undefined);
}

export type NavCommandItem = {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  keywords?: string[];
  requires?: readonly string[];
};

/**
 * The nav as a command set ("Go to …"), with the same visibility rule as ShellNav: a row the
 * capabilities hide is not offered in the palette either.
 */
export function navCommands(
  items: readonly NavCommandItem[],
  {
    navigate,
    capabilities = {},
    id = "nav",
    heading = "Go to",
  }: {
    navigate: (href: string) => void;
    capabilities?: Capabilities;
    id?: string;
    heading?: string;
  }
): ShellCommandSet {
  return {
    id,
    heading,
    commands: items
      .filter((item) => navVisible(item.requires, capabilities))
      .map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        keywords: [...(item.keywords ?? []), item.href.replace(/^\//, "")].filter(Boolean),
        run: () => navigate(item.href),
      })),
  };
}

/** The container's body: the custom palette when there is one, the default Command otherwise. */
export function PaletteBody({
  sets,
  palette,
  close,
  label,
  locale,
}: {
  sets: readonly ShellCommandSet[];
  palette?: ShellPalette;
  close: () => void;
  label?: string;
  locale?: "de" | "en";
}) {
  const run = (command: ShellCommand) => {
    close();
    runCommand(command);
  };
  if (palette) return <>{palette({ close, sets, run })}</>;
  return (
    <Command
      groups={commandGroups(sets)}
      onSelect={(item) => {
        const command = findCommand(sets, item.id);
        if (command) run(command);
      }}
      label={label}
      locale={locale}
      autoFocus
      className="shadow-hn-lift"
    />
  );
}

/**
 * The modal around the body, portalled into the shell's own root. The root has layout
 * containment, so the fixed overlay covers the shell (the whole window in an app, the card in the
 * gallery), and the shell's data-theme applies inside.
 */
export function CommandContainer({
  open,
  onOpenChange,
  container,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: HTMLElement | null;
  title: string;
  children: ReactNode;
}) {
  // ⌘K opens it from anywhere, so there is no trigger to hand focus back to: remember what had
  // focus when it opened. Read during render, before the body takes focus in an effect.
  const returnTo = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== "undefined") {
    const focused = document.activeElement;
    returnTo.current = focused instanceof HTMLElement ? focused : null;
  }
  wasOpen.current = open;
  if (!container) return null;
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal container={container}>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          data-shell-command=""
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnTo.current?.focus();
          }}
          className="fixed top-[12%] left-1/2 z-50 w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
