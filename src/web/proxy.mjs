// Behind a reverse proxy: the identity the proxy forwards, and the origin a request must come from.
//
// Forward auth (Caddy + Authelia, Traefik, nginx-auth-request, …) authenticates the request at
// the proxy and forwards the user's identity in a header. WeshCraft honours those headers only
// when the request really came from a trusted peer — otherwise anybody who can reach the port
// could claim to be anybody.

import net from 'node:net';

/** An IPv4/IPv6 address as its bytes, or null. */
function ipBytes(ip) {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, ''); // an IPv4-mapped IPv6 address
  if (net.isIPv4(clean)) return clean.split('.').map(Number);
  if (!net.isIPv6(clean)) return null;
  const parts = clean.split('::');
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts.length > 1 && parts[1] ? parts[1].split(':') : [];
  const fill = 8 - head.length - tail.length;
  const groups = [...head, ...Array(Math.max(0, fill)).fill('0'), ...tail];
  const bytes = [];
  for (const g of groups.slice(0, 8)) {
    const n = parseInt(g || '0', 16) || 0;
    bytes.push((n >> 8) & 255, n & 255);
  }
  return bytes;
}

/** Parse "10.0.0.0/8", "192.168.1.7", "::1" or "*" into a matcher. */
export function parseTrusted(list = []) {
  const rules = [];
  for (const raw of list) {
    const s = String(raw).trim();
    if (!s) continue;
    if (s === '*' || s === 'any') return () => true;
    const [addr, bits] = s.split('/');
    const bytes = ipBytes(addr);
    if (!bytes) continue;
    const max = bytes.length * 8;
    const prefix = bits == null ? max : Math.max(0, Math.min(max, Number(bits) || 0));
    rules.push({ bytes, prefix });
  }
  if (!rules.length) return () => false;
  return ip => {
    const b = ipBytes(ip);
    if (!b) return false;
    return rules.some(r => {
      if (b.length !== r.bytes.length) return false;
      let bits = r.prefix;
      for (let i = 0; i < b.length && bits > 0; i++) {
        const take = Math.min(8, bits);
        const mask = take === 8 ? 255 : (0xff << (8 - take)) & 0xff;
        if ((b[i] & mask) !== (r.bytes[i] & mask)) return false;
        bits -= take;
      }
      return true;
    });
  };
}

/** The address the request came from (the proxy, when there is one). */
export const peerOf = req => {
  const raw = req.socket?.remoteAddress || '';
  return raw.replace(/^::ffff:/, '');
};

/** The headers a proxy may use to forward the identity, in the order they are tried. */
export const USER_HEADERS = ['remote-user', 'x-forwarded-user', 'x-forwarded-preferred-username', 'x-authentik-username'];
export const EMAIL_HEADERS = ['remote-email', 'x-forwarded-email'];
export const GROUP_HEADERS = ['remote-groups', 'x-forwarded-groups'];

/** The authenticated user, when the peer is trusted. Null otherwise. */
export function identity(req, trusted) {
  if (!trusted(peerOf(req))) return null;
  const pick = names => {
    for (const n of names) {
      const v = req.headers[n];
      if (v) return String(Array.isArray(v) ? v[0] : v).trim();
    }
    return null;
  };
  const user = pick(USER_HEADERS);
  if (!user) return null;
  const groups = pick(GROUP_HEADERS);
  return { user, email: pick(EMAIL_HEADERS), groups: groups ? groups.split(/[ ,]+/).filter(Boolean) : [] };
}

/** The scheme and host the client used, when the peer is trusted. */
export function forwarded(req, trusted) {
  if (!trusted(peerOf(req))) return { scheme: null, host: null };
  const proto = req.headers['x-forwarded-proto'];
  const host = req.headers['x-forwarded-host'];
  return {
    scheme: typeof proto === 'string' ? proto.split(',')[0].trim() : null,
    host: typeof host === 'string' ? host.split(',')[0].trim() : null,
  };
}

/**
 * Is this request from our own site? A cross-origin POST is refused: the proxy's authentication
 * does not stop it, because the browser sends the proxy's cookies by itself.
 * @returns {boolean} true when the request may change something
 */
export function sameOrigin(req, { publicUrl = null, trusted = () => false } = {}) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  // A machine client (the MCP, the plugin) authenticates with a token and sends no Origin.
  const origin = req.headers.origin;
  if (!origin) return true;
  const fwd = forwarded(req, trusted);
  const expected = publicUrl
    ? new URL(publicUrl).origin
    : fwd.host ? `${fwd.scheme || 'http'}://${fwd.host}` : null;
  if (!expected) return false; // a proxied request with an Origin we cannot place: refuse
  let want;
  try { want = new URL(expected).origin; } catch { return false; }
  if (origin === want) return true;
  // The Sec-Fetch-Site header is the modern answer to the same question.
  const site = req.headers['sec-fetch-site'];
  if (site === 'same-origin' || site === 'none') return true;
  return false;
}

/** The client's address, through the proxy when it is trusted. */
export function clientIp(req, trusted) {
  if (!trusted(peerOf(req))) return peerOf(req);
  const fwd = req.headers['x-forwarded-for'];
  if (!fwd) return peerOf(req);
  const first = String(Array.isArray(fwd) ? fwd[0] : fwd).split(',')[0].trim();
  return first || peerOf(req);
}
