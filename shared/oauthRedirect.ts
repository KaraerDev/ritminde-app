import { APP_DEEP_LINK_SCHEME } from "./appIdentity";

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map(Number);
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return octets[0] === 10 || octets[0] === 127 ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
}

function isTrustedExpoHost(hostname: string, configuredHosts: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (configuredHosts.some((configured) => configured.toLowerCase() === hostname.toLowerCase())) return true;
  if (host === "localhost" || host.endsWith(".localhost") || isPrivateIPv4(host)) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return true;
  return [".exp.direct", ".expo.dev", ".expo.app"].some((suffix) => host.endsWith(suffix));
}

export function isAllowedWebOAuthRedirectUri(
  raw: string,
  configuredOrigins: readonly string[],
  source?: string,
): boolean {
  try {
    const target = new URL(raw);
    if (target.username || target.password || target.search || target.hash) return false;
    if (target.pathname !== "/oauth/callback" || !configuredOrigins.includes(target.origin)) return false;
    if (!source) return true;
    return new URL(source).origin === target.origin;
  } catch {
    return false;
  }
}

export function isAllowedNativeOAuthRedirectUri(
  raw: string,
  configuredExpoHosts: readonly string[] = [],
  expectedScheme = APP_DEEP_LINK_SCHEME,
): boolean {
  try {
    const target = new URL(raw);
    if (target.username || target.password || target.search || target.hash) return false;

    if (target.protocol === `${expectedScheme}:`) {
      if (target.port) return false;
      return (!target.hostname && target.pathname === "/oauth/callback") ||
        (target.hostname === "oauth" && target.pathname === "/callback");
    }

    if (!["exp:", "exps:"].includes(target.protocol)) return false;
    const validPath = target.pathname === "/oauth/callback" || target.pathname === "/--/oauth/callback";
    return validPath && isTrustedExpoHost(target.hostname, configuredExpoHosts);
  } catch {
    return false;
  }
}
