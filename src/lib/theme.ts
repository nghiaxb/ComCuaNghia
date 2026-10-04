import { useSyncExternalStore } from "react";

export type ThemePreference = "system" | "light" | "dark";
const key = "com-cua-nghia:theme";
const system = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();
const parse = (value: string | null): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";
let preference: ThemePreference = "system";
try {
  preference = parse(localStorage.getItem(key));
} catch {
  // Theme remains usable when browser storage is unavailable.
}
const resolved = () =>
  preference === "system" ? (system.matches ? "dark" : "light") : preference;
const snapshot = () => `${preference}:${resolved()}`;
function apply() {
  const mode = resolved();
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", mode === "dark" ? "#101b16" : "#f7f6f0");
  for (const listener of listeners) listener();
}
export function setThemePreference(value: ThemePreference) {
  preference = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the chosen mode in this tab even without persistent storage.
  }
  apply();
}
system.addEventListener("change", apply);
window.addEventListener("storage", (event) => {
  if (event.key !== key && event.key !== null) return;
  try {
    if (event.storageArea !== localStorage) return;
  } catch {
    return;
  }
  preference = parse(event.newValue);
  apply();
});
apply();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useTheme() {
  useSyncExternalStore(subscribe, snapshot);
  return {
    preference,
    resolved: resolved(),
    setPreference: setThemePreference,
  };
}
