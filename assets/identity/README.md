# Driver identity assets

- Team marks: downloaded from image URLs on https://www.formula1.com/en/teams on 2026-11-03. The 11 contemporary official team marks are identification assets; rights remain with their respective owners. They are not evidence of endorsement.
- Flags: `lipis/flag-icons`, MIT license, https://github.com/lipis/flag-icons . The license is included as `FLAG-LICENSE.txt`.
- Exact downloaded URLs and byte counts are recorded in `sources.json`.

Team mappings are explicit. Historic teams without a verified corresponding asset retain their names; they are not assigned a successor team's badge. Country flags correspond to the dataset's nationality codes using present-day country identifiers, not historical flag variants. Alternative codes such as NED/NLD and GER/DEU share the same flag.

The UI embeds losslessly decoded PNG copies of these team marks in `TEAM_BADGE_IMAGES` in `app.js`, avoiding per-logo requests and broken-image placeholders. Original WebP files and source attribution remain available here.
