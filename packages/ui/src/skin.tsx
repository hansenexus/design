import { type ComponentType, createContext, type ReactNode, useContext } from "react";

/**
 * The skin slots (design#143): every molecule, organism and template a theme pack may draw its
 * own way, keyed by slot, valued by the props the slot takes. A slot is `<item>` for the item's
 * main component or `<item>.<part>` for one of its parts (`card.header`). Each skinnable file
 * adds its slots by declaration merging, so `Skins` only accepts slots that exist:
 *
 *   declare module "./skin" { interface SkinSlots { card: CardProps } }
 *
 * A package outside @hansenexus/ui merges into "@hansenexus/ui" the same way (the shell does).
 * Atoms never have a slot: a pack changes an atom through recipe tokens, never by forking it.
 */
// biome-ignore lint/suspicious/noEmptyInterface: filled by declaration merging in each item.
export interface SkinSlots {}

export type SkinSlot = keyof SkinSlots;

/** A skin receives the slot's props plus `Base`, the default component, to wrap or replace. */
export type SkinProps<K extends SkinSlot> = SkinSlots[K] & { Base: ComponentType<SkinSlots[K]> };

export type Skin<K extends SkinSlot> = ComponentType<SkinProps<K>>;

/** A pack's skins: any subset of the slots. A missing slot renders the default. */
export type Skins = { [K in SkinSlot]?: Skin<K> };

/** A theme pack as an app mounts it: its data-theme id and its skins. */
export type ThemePackDefinition = {
  /** The data-theme value the pack's tokens are scoped to. */
  id: string;
  skins?: Skins;
};

const SkinContext = createContext<Skins>({});

export type ThemePackProps = {
  pack: ThemePackDefinition;
  children?: ReactNode;
};

/**
 * Provides a pack's skins to everything inside. It renders no element and sets no attribute:
 * put `data-theme={pack.id}` on <html> (or the subtree) yourself, as the tokens expect. An inner
 * ThemePack replaces the outer one's skins for its subtree, so the gallery can render packs side
 * by side.
 */
export function ThemePack({ pack, children }: ThemePackProps) {
  return <SkinContext.Provider value={pack.skins ?? {}}>{children}</SkinContext.Provider>;
}

/** The active pack's skin for `slot`, or undefined when the pack leaves it at the default. */
export function useSkin<K extends SkinSlot>(slot: K): Skin<K> | undefined {
  return useContext(SkinContext)[slot] as Skin<K> | undefined;
}

const SLOTS = new Set<string>();

/** Every slot a skinnable() call has registered, for the gallery and the contract tests. */
export function skinSlots(): string[] {
  return [...SLOTS].sort();
}

/**
 * Makes `Base` skinnable under `slot`: inside a ThemePack whose skins name the slot, the skin
 * renders with the props and `Base`; anywhere else, `Base` renders as it is.
 */
export function skinnable<K extends SkinSlot>(
  slot: K,
  Base: ComponentType<SkinSlots[K]>
): ComponentType<SkinSlots[K]> {
  SLOTS.add(slot);
  function Skinned(props: SkinSlots[K]) {
    const Override = useSkin(slot);
    if (!Override) return <Base {...(props as SkinSlots[K] & object)} />;
    const skinProps = { ...(props as object), Base } as SkinProps<K>;
    return <Override {...skinProps} />;
  }
  Skinned.displayName = `Skinnable(${slot})`;
  return Skinned;
}
