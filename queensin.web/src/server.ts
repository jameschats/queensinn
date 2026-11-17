import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * Hostnames this server renders for. Angular rejects unknown hosts (SSRF guard), so the list
 * comes from SITE_URL + ALLOWED_HOSTS at runtime rather than angular.json, keeping one build
 * for every environment. Pattern from DailyCalendarShop.
 */
function allowedHosts(): string[] {
  const hosts = new Set(['localhost', '127.0.0.1']);
  for (const h of (process.env['ALLOWED_HOSTS'] ?? '').split(',')) if (h.trim()) hosts.add(h.trim());
  const site = process.env['SITE_URL'];
  if (site) {
    try {
      hosts.add(new URL(site).hostname);
    } catch {
      console.warn(`[ssr] SITE_URL is not a valid URL: "${site}"`);
    }
  }
  return [...hosts];
}

const app = express();
// trustProxyHeaders is safe only because this process binds to loopback behind Nginx.
const angularApp = new AngularNodeAppEngine({ allowedHosts: allowedHosts(), trustProxyHeaders: true });

// config.js differs per environment and is rewritten on deploy, so it must not be cached for a year
// like the hashed bundles. Registered before express.static so it wins.
app.get('/config.js', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(join(browserDistFolder, 'config.js'));
});

// config.js changes per environment and must never be cached long.
app.get('/config.js', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

// Search engines. A test site (NOINDEX=true, the default for any domain other than the real one) hides itself completely;
// the real site is open to crawlers except for the admin, and publishes a sitemap.
const noindex = process.env['NOINDEX'] === 'true';
const siteUrl = (process.env['SITE_URL'] ?? '').replace(/\/$/, '');
const PUBLIC_PATHS = ['/', '/bookroom', '/kvr-mahal', '/about-us', '/activities', '/contact', '/terms-conditions', '/cancellation-policy', '/privacy-policy'];

app.use((req, res, next) => {
  if (noindex || req.path.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    noindex
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`,
  );
});

app.get('/sitemap.xml', (_req, res) => {
  if (noindex || !siteUrl) { res.status(404).type('text/plain').send('Not found'); return; }
  const urls = PUBLIC_PATHS.map((p) => `  <url><loc>${siteUrl}${p === '/' ? '' : p}</loc></url>`).join('\n');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
});

// Two addresses from the old Wix site that no longer have a page of their own. A permanent redirect keeps old links
// and search results working: /book-online was an empty booking widget and /properties an unused listing template.
app.get(['/book-online', '/properties'], (_req, res) => {
  res.redirect(301, '/bookroom');
});

app.use(express.static(browserDistFolder, { maxAge: '1y', index: false, redirect: false }));

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
