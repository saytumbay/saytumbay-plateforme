import "@testing-library/jest-dom/vitest";

// Node 25 et suivants exposent leur propre `localStorage` global, indéfini sans `--localstorage-file` :
// il masque celui de jsdom. On remet le stockage de jsdom pour que les tests passent sur toute version de Node.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
for (const name of ["localStorage", "sessionStorage"] as const) {
  let usable = false;
  try {
    usable = typeof globalThis[name]?.clear === "function";
  } catch {
    usable = false;
  }
  if (!usable && jsdomWindow) {
    Object.defineProperty(globalThis, name, { value: jsdomWindow[name], configurable: true, writable: true });
  }
}
