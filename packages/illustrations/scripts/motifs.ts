/** The eight motifs: each is `src/<id>.tsx`, built to `dist/<id>.js` and exported as `./<id>`. */
export const MOTIFS = {
  empty: "EmptyIllustration",
  "no-results": "NoResultsIllustration",
  error: "ErrorIllustration",
  "404": "NotFoundIllustration",
  offline: "OfflineIllustration",
  "no-permission": "NoPermissionIllustration",
  success: "SuccessIllustration",
  maintenance: "MaintenanceIllustration",
} as const;

export type MotifId = keyof typeof MOTIFS;
