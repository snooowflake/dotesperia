// Activated before the server loads configuration or providers. No environment
// switch disables this profile. Unit tests may still exercise upstream modules.
let active = false;
export function enablePrivateRuntime(): void { active = true; }
export function privateRuntimeEnabled(): boolean { return active; }
