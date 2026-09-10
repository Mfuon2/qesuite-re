// The package version is injected by Vite. Bumping apps/app/package.json
// invalidates the registered worker URL and starts a new splash session.
// Vite replaces this identifier in production. The typeof guard keeps the
// local dev server usable even when its transform pipeline serves the module
// source unchanged.
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
