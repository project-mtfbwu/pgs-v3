# Literal asset-reference resolution

> The table records the original full-audit gaps. Batch 1's usage-traced anonymous public set has eight known deployed/stale gaps; its current set and checksum totals are recorded in `batch-1-public-migration-report.md` and `legacy-assets.json`.

This record closes the 16 exact-path gaps found by the completed audit. “Active” means the reference occurs in a reachable legacy template or compiled CSS; it does not mean the missing resource affects the two proof pages. No replacement was invented.

| Missing literal path | Use finding | Alternate-path finding | Proof decision |
| --- | --- | --- | --- |
| `assets/css/app-rtl.min.css` | Optional admin theme switch only; not exercised by the proof or default admin mode | No byte-equivalent stylesheet in the snapshot | Deferred with the unported RTL admin mode; no replacement |
| `assets/css/mCSB_buttons.png` | Vendor CSS sprite used only when mCustomScrollbar arrow buttons are enabled; no matching class/runtime use in either proof page | None | Confirmed unused in proof; no replacement |
| `assets/css/portal.css` | Old public/admin index templates; superseded admin shell uses `material/dist/css/style.min.css` | No equivalent with the same contract | Stale shell reference; excluded |
| `assets/demos/marketing/marketing.css` | Referenced by active public templates including both proof pages | Absent everywhere supplied; deployed URL returns HTTP 404 | Confirmed deployed broken/stale request. The port uses the four core stylesheets that actually render the legacy pages |
| `assets/images/contact-form-arrow-white.png` | Compiled Crafto selector not instantiated in either proof page | None | Unused vendor-theme branch; excluded |
| `assets/images/contact-form-down-arrow.jpg` | Compiled Crafto selector not instantiated in either proof page | None | Unused vendor-theme branch; excluded |
| `assets/images/doc-thumb-2.jpg` | Admin upload fallback in legacy editor/detail screens | No unambiguous byte-equivalent placeholder | Outside proof slice and still unresolved for later admin migration |
| `assets/images/marker02.png` | Compiled map-marker selector not instantiated in either proof page | None | Unused vendor-theme branch; excluded |
| `assets/images/mfg-close.png` | Compiled Magnific Popup cursor only; no matching popup classes in either proof page | None | Unused vendor-theme branch; proof overlays retain their own close controls |
| `assets/img/My-One-apply-Logo-PNG-faviconfavicon-298x300.webp` | Old contact-page Apple touch icon | `favicon.png`, `assets/img/logo.webp`, and an 87px WebP exist but are not byte/layout equivalents | Stale brand-era metadata; no invented mapping |
| `assets/img/My-One-apply-Logo-PNG-faviconfavicon-87x87.png` | Old contact-page shortcut icon | The referenced 87px WebP exists, but format/path behavior differs | Stale metadata; no silent format substitution |
| `assets/js/pages/form-editor.init.js` | Referenced by legacy admin article/event/profile screens | Those templates contain their own TinyMCE initialization, but there is no byte-equivalent helper | Outside proof CMS; minimum V3 editor does not load the missing script |
| `assets/libs/bootstrap/dist/js/bootstrap.min.js` | Old admin auth/reset path | Existing equivalents include `material/assets/libs/bootstrap/dist/js/bootstrap.min.js` and `assets/libs/bootstrap/js/bootstrap.min.js` | Later admin port should use the material path already used by the current auth template |
| `assets/libs/jquery/dist/jquery.min.js` | Old admin auth/reset path | Current auth template uses `material/assets/libs/jquery/dist/jquery.min.js`; an admin library copy also exists | Later admin port mapping is unambiguous; not part of proof |
| `assets/libs/popper.js` | Old admin auth/reset path | `material/assets/libs/popper.js/dist/umd/popper.min.js` and `assets/plugins/popper.min.js` exist | Later admin port mapping is unambiguous; not part of proof |
| `assets/logo.png` | Old admin login logo path | `assets/img/logo.png` exists publicly; the current admin auth view has the old image commented/superseded | Confirmed stale old-login reference; no proof substitution |

## Proof asset set

The proof consumes the real ZIP bytes for the four core CSS files, 22 legacy font/icon files, the four retained runtime scripts, the complete image/media set reached by the homepage and USA DOM (including inline CSS URLs and public admin media shown on the homepage), plus the favicon. `pnpm assets:verify` rejects any missing or altered byte.

The deployed CDN differs byte-for-byte from the ZIP for 57 of the image paths. Those CDN copies are not treated as authoritative and cannot be used to reconstruct a Vercel build; the feature branch must receive the ZIP-derived binary files through Git/LFS or another approved binary-capable upload path.
