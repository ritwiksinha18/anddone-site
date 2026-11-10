# anddone.club

The website for **And Done**, the iOS app that turns Apple Health workouts
into shareable cards. Plain static HTML and CSS, no build step.

| Path | Page |
|---|---|
| `/` | Landing page: photograph, animated route, headline, QR to the app |
| `/get` | Redirect (in `vercel.json`) to the App Store listing (`apps.apple.com/app/and-done-club/id6797864835`). The QR and the yellow button both use `/get`, so changing the destination here moves every printed QR with it |
| `/privacy/` | Privacy policy — App Store Connect › App Privacy › Privacy Policy URL |
| `/support/` | Support and FAQ — App Store Connect › Support URL |

Shared styles, the script logo (from the app's `BrandScriptMark` outlines)
and icons live in `assets/`.

## Preview locally

```sh
python3 -m http.server 4173
```

then open http://localhost:4173.

## Hosting: Vercel, deployed from this folder

The site is a Vercel project (`anddone-site`, personal account) deployed with
the Vercel CLI straight from this folder. The code lives in the private repo
`ritwiksinha18/anddone-site` on GitHub, but the repo is not connected to
Vercel: pushing or merging changes nothing on anddone.club. A deploy happens
only when someone with access to the Vercel project runs the command below.

To experiment, branch and push freely, and preview locally with
`python3 -m http.server 4173` (see above).

```sh
python3 scripts/stamp.py
npx vercel@65.1.0 deploy --prod
```

`scripts/stamp.py` adds a content hash to every CSS/JS link (`site.css?v=…`).
Run it before each deploy, or browsers can pair a new page with an old
cached stylesheet. CSS/JS are also served revalidate-always; images and the
font cache for a day. `README.md` and `scripts/` are kept out of the upload
by `.vercelignore`.

`vercel.json` holds the `/get` redirect, trailing-slash URLs and asset caching.
`.vercel/` (the project link) is git-ignored.

### Domain

`anddone.club` and `www.anddone.club` are added to the project. DNS stays at
GoDaddy (the registrar). In GoDaddy › Domains › anddone.club › DNS:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `216.198.79.1` |
| `A` | `@` | `64.29.17.1` |
| `CNAME` | `www` | `3af6b98d0581a583.vercel-dns-017.com` |

Delete GoDaddy's own `A` records for `@` (the parking IPs `13.248.243.5` and
`76.223.105.230`) and the existing `www` CNAME first. Then
`npx vercel@65.1.0 domains verify anddone.club` reports when it's live, and
Vercel issues the certificate on its own.

`www.anddone.club` redirects (308) to `anddone.club`. That is set on the www
domain in the Vercel project (Settings › Domains), not in `vercel.json`.

## The landing page

- `assets/runners.jpg` (2000 px) and `runners-1200.jpg`: the black-and-white
  photograph, supplied by Ritwik. Portrait screens crop to the second runner.
- `assets/route.js`: the isometric route above the headline, in WebGL, ported
  from the app's `RenderEngine/RouteShaders.metal` (route line, ground
  shadow, Tracer curtain). Reduced motion gets the finished route, still.
- `assets/qr.svg` / `assets/qr.js`: the QR (encodes `https://anddone.club/get`)
  with its embossed dots, and the hover that lifts it toward the cursor.
  Regenerate the SVG if the URL ever changes, and check it still scans.
- `assets/showcase.js` / `assets/clay.js`: the "A look for every finish"
  section: nine clay phones on a turning ring, rendered with Three.js
  (`assets/vendor/`, MIT, pinned to 0.160.0 and self-hosted). The 3D loads
  only as the section approaches. Screens are `assets/screens/screen-flat-*`,
  cut from the App Store mockups. Without WebGL it falls back to a plain row.
- `lab/`: design experiments for the screenshot section (wave wall, deck,
  pinned stage, flat orbit, clay orbit). Preview locally at `/lab/…`; it is
  excluded from deploys by `.vercelignore`.
- `assets/fonts/archivo-latin.woff2`: Archivo (OFL), used at 125% width only
  where SF Pro Expanded isn't installed.
- `assets/og.jpg`: link-preview crop of the photograph.

## App Store Connect URLs

- Privacy Policy URL: `https://anddone.club/privacy/`
- Support URL: `https://anddone.club/support/`
- Marketing URL (optional): `https://anddone.club/`
