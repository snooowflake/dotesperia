// Dotesperia compatibility contracts. Vendor networking and provisioning

// implementations have been removed. Only owner-hosted MCP and native Codex

// inference are available in this fork. These adapters cannot be re-enabled.

export const BOAT_API_DEFAULT: string = "";

export const ELEVENLABS_API_DEFAULT: string = "";

export const INCLUDED_TOKEN_ENV = ["OMB_CLOUD_BOAT_TOKEN", "OMB_CLOUD_VOICE_TOKEN", "OMB_CLOUD_DECIDER_TOKEN"] as const;

export interface ServiceCredential {
    token: string;
    api: string;
    included: boolean;
}

export function holdIncludedServices(env?: NodeJS.ProcessEnv): void {
  void env;
  for (const key of INCLUDED_TOKEN_ENV) delete (env ?? process.env)[key];
}

export const boatProviderApi: (env?: NodeJS.ProcessEnv) => string = () => "";

export const elevenLabsProviderApi: (env?: NodeJS.ProcessEnv) => string = () => "";

export function boatCredential(own: string | undefined, env?: NodeJS.ProcessEnv): ServiceCredential | null {
  void own;
  void env;
  return null;
}

export function voiceCredential(own: string | undefined, env?: NodeJS.ProcessEnv): ServiceCredential | null {
  void own;
  void env;
  return null;
}

export function deciderCredential(own: string | undefined, ownBaseUrl: string | undefined, env?: NodeJS.ProcessEnv): ServiceCredential | null {
  void own;
  void ownBaseUrl;
  void env;
  return null;
}
