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

Image files under `VueUI/public/images/` are downloaded from STOWiki, primarily
from [Category:Official images](https://stowiki.net/wiki/Category:Official_images)
(files tagged with `{{STO official image}}`).

Those assets are game artwork and icons created or released by Cryptic Studios /
DECA Games (and related rights holders). Identifying them as official *Star Trek
Online* images is the attribution used on STOWiki; they are **not** licensed as
MIT project code and are generally **not** covered by the wiki’s CC BY-NC-SA
grant for community-authored text.

- Source wiki: [stowiki.net](https://stowiki.net/)
- Local layout: `items/`, `ships/`, `traits/`, `starship-traits/`
- Manifests: `Extractor/output/OfficialImages.json`, `Extractor/output/imageIndex.json`

See also [`VueUI/public/images/NOTICE`](VueUI/public/images/NOTICE).

## How this project uses the material

- Cargo extracts and committed JSON power the GraphQL API and Vue UI.
- The UI shows wiki-derived text and local copies of wiki images for catalog browsing.
- Production deploys import committed JSON; they do not scrape the live wiki.

## Further reading

- [STOWiki:Copyrights](https://stowiki.net/wiki/STOWiki:Copyrights)
- [STOWiki:Policy/Copyright](https://stowiki.net/wiki/STOWiki:Policy/Copyright)
- [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)
