# Deployment (filled in at Stage 8)

Same pattern as DailyCalendarShop: Nginx (TLS, /uploads, proxy) → `queensin-api.service` (127.0.0.1:5090)
and `queensin-ssr.service` (127.0.0.1:4030, env API_BASE_URL, SITE_URL, ALLOWED_HOSTS). Write
`/config.js` per environment with the same API_BASE_URL / SITE_URL.
