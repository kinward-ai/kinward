# Kinward PWA — Installation Guide

## Files to add

```
client/public/
├── manifest.json          ← copy here
├── sw.js                  ← copy here
├── apple-touch-icon.png   ← copy here
├── favicon-16x16.png      ← copy here
├── favicon-32x32.png      ← copy here
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## Add to your index.html `<head>`

```html
<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#D4622B">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Kinward">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
```

## Register the service worker

Add this script at the bottom of your index.html `<body>`, or in your main app entry:

```html
<script>
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then(() => {
      console.log("[kinward] Service worker registered");
    });
  }
</script>
```

## Test it

1. Restart your Vite dev server
2. Open Kinward in Chrome on a phone
3. You should see an "Add to Home Screen" prompt (or use browser menu → "Install app" / "Add to Home Screen")
4. The app icon should show the Kinward shield on dark background
5. Opening from home screen should launch in standalone mode (no browser chrome)

## Notes

- The service worker caches static assets but does NOT cache API calls — chat always needs the live server
- Bump the `CACHE_NAME` version in sw.js whenever you deploy new static assets
- The `theme_color` (burnt orange) controls the status bar color on Android
- `background_color` (dark charcoal) is the splash screen color while the app loads
