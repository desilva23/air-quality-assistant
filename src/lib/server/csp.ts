/**
 * The Content-Security-Policy for pages. Scripts must carry this request's
 * nonce, which Next.js adds to the tags it renders, and 'strict-dynamic' lets
 * those scripts load the app's chunks. A script an attacker manages to inject
 * has no nonce, so it doesn't run.
 */
export function contentSecurityPolicy(nonce: string, dev: boolean): string {
  const styles = dev ? "'unsafe-inline'" : `'nonce-${nonce}'`;
  return [
    "default-src 'self'",
    // React uses eval for its debugging tools in development, never in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // The development server injects styles at runtime; production serves stylesheets.
    `style-src 'self' ${styles}`,
    // Map tiles come from OpenStreetMap's tile servers.
    "img-src 'self' data: https://tile.openstreetmap.org",
    "font-src 'self'",
    // The browser only talks to this app; air data and the AI are fetched by the server.
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
