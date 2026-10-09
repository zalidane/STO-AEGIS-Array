# Attribution

STO-AEGIS Array redistributes game data and media originally published on
[Star Trek Online Wiki (STOWiki)](https://stowiki.net/). This notice covers
third-party content shipped with or shown by this project. Original project
source code remains under the MIT License in [`LICENSE`](LICENSE).

## Intellectual property

*Star Trek* and related marks are the intellectual property of Paramount,
Gene Roddenberry, Cryptic Studios, DECA Games, Atari, and Arc Games (and their
respective licensors). This project is an unofficial fan tool and is not
affiliated with, endorsed by, or sponsored by those parties.

## Wiki text and Cargo data

Textual content extracted from STOWiki (including Cargo table fields such as
names, descriptions, obtained notes, and other article text we display) is used
under STOWiki’s licensing terms:

- Source: [STOWiki](https://stowiki.net/) contributors
- License: [Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0)](https://creativecommons.org/licenses/by-nc-sa/3.0/)
- Policy: [STOWiki:Copyrights](https://stowiki.net/wiki/STOWiki:Copyrights)

When reusing that material, you must provide attribution, keep the NonCommercial
restriction, and share adaptations under the same license (or a compatible one).

Extracted JSON under `Extractor/output/` is derived from STOWiki Cargo tables
and inherits those terms for wiki-authored text fields.

## Images

Game artwork and icons shown on the hosted site are © Cryptic Studios / Arc Games / DECA / Paramount; sourced from STOWiki; not covered by this repo's licenses; unofficial non-commercial fan site; removed on rights-holder request.

They were sourced from [STOWiki](https://stowiki.net/), primarily
[Category:Official images](https://stowiki.net/wiki/Category:Official_images)
(files tagged with `{{STO official image}}`). The hosted site loads them at
runtime from separate object storage (layout `<kind>/<filename>`; manifests in
`Extractor/output/OfficialImages.json` and `imageIndex.json`). They are **not**
covered by this project's MIT License or by STOWiki's CC BY-NC-SA license for
community text.

The image files are no longer stored in git; they are served from Cloudflare R2 at `img.aegisarray.com`.
Local development serves that tree when `VITE_IMAGE_BASE_URL` is unset.
Placeholder art the UI needs stays in `VueUI/public/placeholders/` and is not
part of the object-storage tree. Hosting steps: [`docs/image-hosting.md`](docs/image-hosting.md).

- Source wiki: [stowiki.net](https://stowiki.net/)
- Object key layout: `items/`, `ships/`, `traits/`, `starship-traits/`, `tray-skills/`
- Local extract (not the production URL): `VueUI/public/images/`
- Manifests: `Extractor/output/OfficialImages.json`, `Extractor/output/imageIndex.json`

See also [`VueUI/public/images/NOTICE`](VueUI/public/images/NOTICE).

## How this project uses the material

- Cargo extracts and committed JSON power the GraphQL API and Vue UI.
- The UI shows wiki-derived text and game images loaded from object storage at runtime (local `/images` when `VITE_IMAGE_BASE_URL` is unset).
- Production deploys import committed JSON; they do not scrape the live wiki.

## Further reading

- [STOWiki:Copyrights](https://stowiki.net/wiki/STOWiki:Copyrights)
- [STOWiki:Policy/Copyright](https://stowiki.net/wiki/STOWiki:Policy/Copyright)
- [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)
