# anddone.club

The website for **And Done**, the iOS app that turns Apple Health workouts
into shareable cards. Plain static HTML and CSS, no build step.

| Path | Page |
|---|---|
| `/` | Landing page: one screen, wordmark, headline, QR to the app |
| `/get` | Redirect (in `vercel.json`) to the TestFlight public link; point it at the App Store listing at launch, and every printed QR follows |
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
the Vercel CLI straight from this folder. There is no GitHub repository and no
Git integration: nothing deploys unless someone runs the command.

```sh
npx vercel@65.1.0 deploy --prod
```

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

## The landing background

`assets/hero-wide.jpg` (2880×1800) and `assets/hero-tall.jpg` (1290×2796) are
composed from real exports of the app's own templates (Neon Pulse, Border
Beam, Border Fire, and the Race Bib and Medal stickers) rendered from the app's
fixture workouts, so no photo licences are involved. `assets/og.jpg` is a crop
of the wide one. `assets/qr.svg` encodes `https://anddone.club/get`.

## App Store Connect URLs

- Privacy Policy URL: `https://anddone.club/privacy/`
- Support URL: `https://anddone.club/support/`
- Marketing URL (optional): `https://anddone.club/`
