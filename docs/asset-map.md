# Legacy asset map

## Public assets

`assets/` contains 459 files (~16.2 MB in the Git tree): 12 compiled CSS files, 32 JavaScript files, 124 Sass sources, 235 `img` assets, 12 dynamic `images`, 22 fonts, 16 document objects, 5 legacy email-runtime files, and 1 video.

Primary CSS: `style.css`, `responsive.css`, `vendors.css`, `icon.css` plus minified forms/maps. These define the visual baseline and must be imported before component refactoring.

Primary first-party/runtime JS:

- `jquery.js`, `main.js`, `pgs-autocomplete.js`, `vendors.js`/`vendors.min.js`
- Bootstrap bundle
- Swiper
- GSAP, anime, Atropos, imagesLoaded, Isotope
- Magnific Popup, mCustomScrollbar, justified gallery
- countdown, count-to, easy pie chart, fitvids
- parallax, particles, skrollr, smooth-scroll, splitting, sticky-kit and helpers

Required fonts/icons: Bootstrap Icons, Font Awesome, Feather, Icomoon, Themify and their SVG/font files. Actual font files are Git LFS objects and must be fetched, checked for licensing, and copied intact before visual comparison.

## Admin assets

`pgs_admin/assets/` contains 3,607 files (~61.9 MB in the tree): admin CSS/JS, 112 uploaded images/media, 59 fonts, and 3,395 library/plugin files. Major families include Bootstrap/admin theme assets, DataTables/export/select, Font Awesome, Material Design Icons, PDFMake, charting/editor/form plugins, and duplicated dependency trees.

The admin asset tree must be usage-traced; do not copy all vendor debris blindly. Preserve assets actually referenced by present admin views, then replace libraries only with parity tests.

## LFS and media warning

The repository tracks PNG/JPG/JPEG/GIF/WebP/MP4/PDF/DOCX/font/ZIP and other binaries using Git LFS. Connector tree sizes near 128–133 bytes are LFS pointer sizes, not real media. A credentialed `git lfs pull` (or equivalent authenticated LFS download) is required for actual parity assets.

Legacy dynamic/private files appear under public paths such as `assets/documents`, `assets/images`, and `pgs_admin/assets/images`. Do not copy student documents or PII into V3 public assets. Classify each object into:

- public immutable design asset → Next.js `public/legacy` or public Storage;
- editable marketing media → public CMS media bucket;
- private student document → private Storage bucket and metadata table;
- preview/temp artifact → ephemeral private storage with expiry;
- obsolete/duplicate/vendor sample → exclude after reference check.

## Missing/unresolved assets

The completed Hostinger snapshot reconciliation found 16 missing literal references. Their active/stale status and alternate-path decisions are recorded in [`asset-gap-resolution.md`](asset-gap-resolution.md). Most importantly, `/assets/demos/marketing/marketing.css` is referenced by active public templates but is absent from the ZIP/repository and returns HTTP 404 in the deployed product. It therefore contributes no rules to the rendered legacy baseline and is intentionally not approximated in V3.

The Batch 1 usage-traced set pins 217 required files (152,129,388 bytes) in `legacy-assets.json`. Each file was extracted from `public_html.zip`, verified as real bytes, and checked by SHA-256. Same-origin absolute `purpleguide.study` references are normalized and included; student documents remain excluded. The source ZIP itself remains excluded.

## Migration sequence

1. Fetch LFS objects and hash a read-only legacy asset manifest.
2. Extract all `src`, `href`, CSS `url()`, dynamic admin file paths, and deployed network assets.
3. Classify public/CMS/private/ephemeral/excluded.
4. Copy public baseline without renaming paths initially where practical.
5. Upload editable/private media with legacy-ID mapping.
6. Add broken-link, MIME, dimension, duplicate, and license checks.
7. Visual-test before optimizing or replacing any plugin.
