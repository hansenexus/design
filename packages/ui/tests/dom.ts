// Test preload (bunfig.toml): happy-dom as the global DOM, before react-dom or Radix load, and
// React's act() environment flag. Shared by every ui test file, so load order cannot matter.
// Bun's own fetch classes stay: Bun.serve (gallery-decide.test.ts) only accepts its own Response.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

const KEEP = [
  "fetch",
  "Request",
  "Response",
  "Headers",
  "FormData",
  "Blob",
  "File",
  "URL",
  "URLSearchParams",
  "AbortController",
  "AbortSignal",
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "TextEncoder",
  "TextDecoder",
  "WebSocket",
] as const;
const native = Object.fromEntries(KEEP.map((name) => [name, globalThis[name]]));

GlobalRegistrator.register();
Object.assign(globalThis, native, { IS_REACT_ACT_ENVIRONMENT: true });
