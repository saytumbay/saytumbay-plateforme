/**
 * En-têtes de sécurité du site, source unique : appliqués par `vite preview` (les tests e2e tournent donc
 * sous la vraie politique) et recopiés dans infra/Caddyfile et public/.htaccess pour la production.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Attributs style (React, Leaflet) : 'unsafe-inline' limité aux styles ; aucun script en ligne.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://server.arcgisonline.com https://*.tile.openstreetmap.org",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Frame-Options": "DENY",
};
