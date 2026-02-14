/* istanbul ignore file */

function getEnvVariable(name: string): string | undefined {
  return process.env[name];
}

// Required env variables — return functions
export function WORKOS_API_KEY(): string {
  return getEnvVariable('WORKOS_API_KEY') ?? '';
}

export function WORKOS_CLIENT_ID(): string {
  return getEnvVariable('WORKOS_CLIENT_ID') ?? '';
}

export function WORKOS_COOKIE_PASSWORD(): string {
  return getEnvVariable('WORKOS_COOKIE_PASSWORD') ?? '';
}

export function WORKOS_REDIRECT_URI(): string {
  return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? '';
}

// Optional env variables — return functions
export function WORKOS_API_HOSTNAME(): string | undefined {
  return getEnvVariable('WORKOS_API_HOSTNAME');
}

export function WORKOS_API_HTTPS(): string | undefined {
  return getEnvVariable('WORKOS_API_HTTPS');
}

export function WORKOS_API_PORT(): string | undefined {
  return getEnvVariable('WORKOS_API_PORT');
}

export function WORKOS_COOKIE_DOMAIN(): string | undefined {
  return getEnvVariable('WORKOS_COOKIE_DOMAIN');
}

export function WORKOS_COOKIE_MAX_AGE(): string | undefined {
  return getEnvVariable('WORKOS_COOKIE_MAX_AGE');
}

export function WORKOS_COOKIE_NAME(): string | undefined {
  return getEnvVariable('WORKOS_COOKIE_NAME');
}

export function WORKOS_COOKIE_SAMESITE(): 'lax' | 'strict' | 'none' | undefined {
  return getEnvVariable('WORKOS_COOKIE_SAMESITE') as 'lax' | 'strict' | 'none' | undefined;
}
