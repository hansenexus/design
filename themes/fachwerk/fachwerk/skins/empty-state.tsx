import { cx, type Skin } from "@hansenexus/ui";

/** An empty Gefach: the state framed by a beam on the hatch, as fachwerk draws an empty seat. */
export const EmptyState: Skin<"empty-state"> = ({ Base, className, ...props }) => (
  <div className={cx("border border-hn-line-subtle bg-(image:--hn-motif-hatch)", className)}>
    <Base {...props} />
  </div>
);
