// The controls scene: Menu with its radio group and an open sub-menu, a live ContextMenu (the
// screenshot spec right-clicks it open), Toggle, ToggleGroup, Slider and ScrollArea in their
// states. Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { type ReactNode, useState } from "react";
import {
  Button,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  ScrollArea,
  Slider,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from "../src";
import { Bell, MapIcon, More, Server } from "./icons";

function Section({
  title,
  wide,
  children,
}: {
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        wide ? "flex min-w-0 flex-col gap-3.5 lg:col-span-2" : "flex min-w-0 flex-col gap-3.5"
      }
    >
      <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

/**
 * A stage that holds an open popup: the transform makes it the containing block, and the popup
 * is portalled into it once the element exists, so it stays inside the frame.
 */
function Frame({
  height,
  children,
}: {
  height: number;
  children: (container: HTMLElement) => ReactNode;
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <div
      ref={setEl}
      data-frame=""
      className="relative overflow-hidden rounded-hn-lg border border-hn-line-subtle bg-hn-surface-page p-4"
      style={{ height, transform: "translateZ(0)" }}
    >
      {el ? children(el) : null}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4">
      {children}
    </div>
  );
}

const noFocus = (e: Event) => e.preventDefault();

const HOSTS = [
  "kran-01",
  "kran-02",
  "kran-03",
  "kran-04",
  "pegel",
  "lotsen-api",
  "lotsen-worker",
  "speicher-web",
  "speicher-db",
  "zoll-gateway",
  "zoll-queue",
  "schleuse-01",
  "schleuse-02",
  "werft-ci",
];

/** A live context menu over a machine card; the interaction spec drives it. */
function LiveContextMenu() {
  const [picked, setPicked] = useState("none");
  const [quay, setQuay] = useState("4");
  const [follow, setFollow] = useState(true);
  return (
    <div className="flex flex-col gap-2">
      <ContextMenu>
        <ContextMenuTrigger
          data-testid="context-target"
          className="flex h-28 items-center justify-center rounded-hn-lg border border-dashed border-hn-line-strong bg-hn-surface-card font-hn-mono text-sm text-hn-ink-body select-none"
        >
          kran-04 · right-click or long-press
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuLabel>kran-04</ContextMenuLabel>
          <ContextMenuItem onSelect={() => setPicked("Open terminal")}>
            Open terminal
            <ContextMenuShortcut>⌘T</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuCheckboxItem checked={follow} onCheckedChange={(c) => setFollow(c === true)}>
            Follow logs
          </ContextMenuCheckboxItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Move to quay</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup value={quay} onValueChange={setQuay}>
                <ContextMenuRadioItem value="3">Quay 3</ContextMenuRadioItem>
                <ContextMenuRadioItem value="4">Quay 4</ContextMenuRadioItem>
                <ContextMenuRadioItem value="5">Quay 5</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem variant="danger" onSelect={() => setPicked("Restart machine")}>
            Restart machine
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <span className="font-hn-mono text-[12.5px] text-hn-ink-muted">
        picked: <span data-testid="context-picked">{picked}</span>, quay{" "}
        <span data-testid="context-quay">{quay}</span>
      </span>
    </div>
  );
}

export function Controls() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Controls
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Section title="Menu: radio group, an open sub-menu">
          <Frame height={340}>
            {(container) => (
              <Menu open modal={false}>
                <MenuTrigger asChild>
                  <Button variant="secondary" aria-label="Machine actions">
                    <More />
                  </Button>
                </MenuTrigger>
                <MenuContent
                  align="start"
                  className="w-40 min-w-0!"
                  container={container}
                  onCloseAutoFocus={noFocus}
                >
                  <MenuLabel>Density</MenuLabel>
                  <MenuRadioGroup value="comfortable">
                    <MenuRadioItem value="compact">Compact</MenuRadioItem>
                    <MenuRadioItem value="comfortable">Comfortable</MenuRadioItem>
                    <MenuRadioItem value="touch">Touch</MenuRadioItem>
                  </MenuRadioGroup>
                  <MenuSeparator />
                  <MenuSub open>
                    <MenuSubTrigger>Move to quay</MenuSubTrigger>
                    <MenuSubContent container={container} className="w-32 min-w-0!">
                      <MenuItem>Quay 3</MenuItem>
                      <MenuItem>Quay 5</MenuItem>
                      <MenuItem disabled>Quay 6 (full)</MenuItem>
                    </MenuSubContent>
                  </MenuSub>
                  <MenuItem variant="danger">Restart machine</MenuItem>
                </MenuContent>
              </Menu>
            )}
          </Frame>
        </Section>
        <Section title="ContextMenu: live">
          <Card>
            <LiveContextMenu />
          </Card>
        </Section>
        <Section title="Toggle: ghost, outline, pressed, disabled">
          <Card>
            <div className="flex flex-wrap items-center gap-2.5">
              <Toggle aria-label="Mute alerts">
                <Bell />
              </Toggle>
              <Toggle aria-label="Mute alerts" defaultPressed>
                <Bell />
              </Toggle>
              <Toggle variant="outline">
                <MapIcon />
                Map
              </Toggle>
              <Toggle variant="outline" defaultPressed>
                <MapIcon />
                Map
              </Toggle>
              <Toggle variant="outline" size="sm" defaultPressed>
                Offline only
              </Toggle>
              <Toggle variant="outline" disabled>
                Disabled
              </Toggle>
            </div>
          </Card>
        </Section>
        <Section title="ToggleGroup: single (outline), multiple (ghost)">
          <Card>
            <ToggleGroup type="single" variant="outline" defaultValue="grid" aria-label="View">
              <ToggleGroupItem value="map">Map</ToggleGroupItem>
              <ToggleGroupItem value="grid">Grid</ToggleGroupItem>
              <ToggleGroupItem value="list">List</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="multiple"
              defaultValue={["crit", "warn"]}
              aria-label="Show statuses"
              data-testid="status-filter"
            >
              <ToggleGroupItem value="crit">Crit</ToggleGroupItem>
              <ToggleGroupItem value="warn">Warn</ToggleGroupItem>
              <ToggleGroupItem value="ok">OK</ToggleGroupItem>
              <ToggleGroupItem value="off" disabled>
                Off
              </ToggleGroupItem>
            </ToggleGroup>
          </Card>
        </Section>
        <Section title="Slider: single, range, disabled">
          <Card>
            <div className="flex flex-col gap-1.5 text-[13px] text-hn-ink-muted">
              <span id="replicas-label">Replicas</span>
              <Slider defaultValue={[3]} min={0} max={8} aria-labelledby="replicas-label" />
            </div>
            <div className="flex flex-col gap-1.5 text-[13px] text-hn-ink-muted">
              <span>CPU alert band, %</span>
              <Slider defaultValue={[25, 75]} thumbLabels={["Minimum", "Maximum"]} />
            </div>
            <Slider defaultValue={[40]} disabled aria-label="Volume (disabled)" />
          </Card>
        </Section>
        <Section title="ScrollArea: vertical, horizontal">
          <Card>
            <ScrollArea type="always" className="h-40 rounded-hn-md border border-hn-line-subtle">
              <ul className="m-0 flex list-none flex-col p-0 pr-3 font-hn-mono text-sm text-hn-ink-primary">
                {HOSTS.map((h) => (
                  <li
                    key={h}
                    className="flex items-center gap-2 border-b border-hn-line-subtle px-3 py-1.5"
                  >
                    <Server />
                    {h}
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <ScrollArea
              type="always"
              scrollbars="horizontal"
              className="rounded-hn-md border border-hn-line-subtle"
            >
              <div className="flex w-max gap-2 p-3 pb-4">
                {HOSTS.map((h) => (
                  <span
                    key={h}
                    className="rounded-hn-pill border border-hn-line-strong px-2.5 py-1 font-hn-mono text-[12.5px] text-hn-ink-body"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </Section>
      </div>
    </main>
  );
}
