# anddone.club

The website for **And Done**, the iOS app that turns Apple Health workouts
into shareable cards. Plain static HTML and CSS, no build step.

| Path | Page |
|---|---|
| `/` | Holding page (the marketing landing page replaces it later) |
| `/privacy/` | Privacy policy — App Store Connect › App Privacy › Privacy Policy URL |
| `/support/` | Support and FAQ — App Store Connect › Support URL |

Shared styles, the script logo (from the app's `BrandScriptMark` outlines)
and icons live in `assets/`.

## Preview locally

```sh
python3 -m http.server 4173
```

then open http://localhost:4173.

## Hosting: GitHub Pages on anddone.club

1. Push this repository to GitHub.
2. Repository › Settings › Pages: deploy from the `main` branch, root folder.
   The `CNAME` file already names `anddone.club`.
3. At the domain registrar, set DNS:
   - `A` records for `anddone.club`: `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - `AAAA` records: `2606:50c0:8000::153`, `2606:50c0:8001::153`,
     `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` for `www`: `<github-username>.github.io`
4. Back in Settings › Pages, tick **Enforce HTTPS** once the certificate is issued.

## App Store Connect URLs

- Privacy Policy URL: `https://anddone.club/privacy/`
- Support URL: `https://anddone.club/support/`
- Marketing URL (optional): `https://anddone.club/`
