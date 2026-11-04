# Apex LineUp — F1 Driver Ranking Lab

An interactive Formula 1 driver ranking tool. Explore how the order changes when you choose a season or year range, adjust the importance of different performance metrics, and compare multiple ranking setups side by side.

## Features

- A circuit presentation is now the default: a horizontal stadium circuit for the overall ranking and a vertical circuit in each comparison column. A small top control switches back to traditional LineUp and remembers the preference. Original local SVG venue artwork supplies service roads, pit garages, stands, parking, landscaping and lighting in both orientations. Coloured contributions bend continuously between the two forms.
- Each circuit contains at most eight cars. Wheel/arrow navigation advances one driver; the previous/next controls or Page Up/Down advance eight. Home/End reach the first/last window. Each comparison setup keeps its own window and retains it when expanded.
- Cars move along normalized score trails and change lanes when ranks change. Attached identity labels, an infield roster, existing team/metric colours and rank-change arrows maintain identity. Click a car or identity to inspect its profile; Enter/Space is also supported. Hover only highlights identity. Wheel input over an open profile advances its originating circuit and closes the card; Escape also dismisses it. The traditional table and its inline profiles remain available.
- Circuit comparison includes a driver rank journey across setups and signed differences relative to the first setup. Clicking a journey node brings that driver into the corresponding circuit window. Main-view controls retain view/shape switching, comparison, setup codes and language; Filters contains only date, search and filtering controls, all expanded without nested menus.
- A full-screen ranking view with scrollable driver panes and no document scrolling.
- Icon-only floating tools at the top open compact filters or a weights-from-order workbench. Opening it overlays the ranking without resizing the main panel. The original search/add, ordered driver list, solve action and adjacent weight results are restored. Radar comparison and compact mode have been removed.
- Search and select drivers in the weights-from-order picker. Reorder or remove selected drivers and weights recalculate automatically. External drag additions are disabled; duplicate and ten-driver limits still apply. The workbench expands only when results are available.
- The labeled Add ranking action duplicates the current weights and opens comparison; the initial setup is My F1 Ranking. Add or import a setup to create another comparison column. Expand a column to edit it; zoom transitions connect each column to its full ranking view. Return to the canvas to compare changes.
- Comparison columns keep a bounded height and scroll independently; double-click a column name to rename it (Enter saves, Escape cancels). The reverse-order tool disappears in comparison view; the filtering icon remains available.
- Changes to weights, presets, reset, and imported codes animate driver order and contribution bars, with persistent rank-change arrows per setup. Driver profiles expand inline beneath their rows.
- Drag the comparison canvas to pan, use the wheel or buttons to zoom, and fit the full canvas with the fit button. There is no six-setup limit.
- Original local SVG artwork adds an Apex monogram, a racing-car illustration, podium wreaths, speed stripes, and consistent control icons. Asset provenance is in `assets/studio/ASSETS.md`.
- Original F1 red/black styling, distinct metric colors, and racing cars approaching a chequered finish; hover a contribution or weight row to isolate that metric. Metric definitions appear on hover or keyboard focus.
- Year range, search, and advanced driver filters; six interface languages. The database/season selector has been removed; date ranges still load the corresponding merged data.
- The language selector is always available in the top controls. Team-color rails reinforce driver identity without changing metric colors.
- Driver stats use readable 14px values and 64px rows without automatic zoom. Columns fill the available width and scroll horizontally within the pane; desktop rank and driver columns remain pinned.
- Driver-stat columns and bars share the exact metric palette used by the stacked ranking. Its sticky header restores clickable metric switches and distribution previews; disabling a metric removes its contribution without losing its saved weight.
- There is no separate weights menu. Each grandstand metric combines its switch, histogram, explanation tooltip, slider, decimal input and individual reset. Traditional LineUp and Driver stats use the same persistent controls in a horizontal strip. Equal reset is in the workspace toolbar. Comparison circuits contain no metric controls.
- Metric switches sit above the rank/driver and score headings, leaving those headings adjacent to their data. The selected year range stays visible in the date control. Missing values and unscorable rows are distinguished from valid zero values; normalized data bars keep their scale and opacity when weights change.
- Local nationality flags and 11 verified contemporary team marks replace repeated identity text. Unknown/historical team marks fall back to the team name; flags retain accessible country names. Sources and licenses are in `assets/identity/`.
- Weight codes belong to the setup group in the top controls. The anchored popover separates read-only export from editable import, so pasting a code never replaces the current setup's export before validation.
- Historical championship points are used throughout. Legacy weight codes remain importable; their former current-rules flag is ignored.

## Run locally

This is a static website with no build step. Serve the repository directory with a local web server, then open the address it prints:

```bash
python -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Opening `index.html` directly as a file may prevent the browser from loading the JSON data.

## Data and interpretation

The bundled data combines historical F1DB records with OpenF1 data for recent seasons. The ranking view normalizes metrics and applies the selected weights; changing the metrics or time range can change the result. Some telemetry-based metrics are unavailable for older seasons, so cross-era comparisons should be read with the displayed data coverage in mind.

Data and field definitions are in `data/`, including `metric_schema.json` and the quality reports. F1DB: https://github.com/f1db/f1db · OpenF1: https://openf1.org

**Team points share** uses [F1DB v2026.18.0](https://github.com/f1db/f1db/releases/tag/v2026.18.0) Grand Prix results. For each driver–constructor stint it divides the driver's race points by that constructor's points in the same races, including only races where another driver started for the constructor. Shares are averaged across stints using comparable starts; at least 10 such starts with a positive team-points denominator are required. Zero denominators and pre-1958 seasons remain missing. `data/team_points_share.json` is generated by `scripts/build_team_points_share.py` under the site's existing race cutoff. Early independent entrants sometimes used the same constructor, so this is an approximation of team contribution, not a direct measure of driver skill. A high share can also reflect a weaker teammate.

This project is an exploratory visualization, not an official Formula 1 ranking.

See [VISUAL_AUDIT.md](VISUAL_AUDIT.md) for the November 2026 visual and interaction review, research references, measured checks and remaining limitations.

The subsequent circuit design, scale semantics, controls and validation are documented in [RACE_VIEW.md](RACE_VIEW.md).

In Reverse ranking, the vertical slider at the left of each metric adjusts its weight. The horizontal interval on the right uses the same metric color as the main ranking and shows feasible values while the other weights keep their current proportions. Moving a slider redistributes the remaining weight and updates all intervals. These intervals are slices through the feasible weight space, not independent global bounds; endpoints from different rows cannot generally be combined.

Grand Prix pole-position counts come from the `polePosition` flag in the [F1DB v2026.18.0](https://github.com/f1db/f1db/releases/tag/v2026.18.0) race-results CSV. Sprint qualifying poles are excluded. `data/pole_positions.json` is generated by `scripts/build_pole_positions.py` and follows the same race cutoff as the bundled season snapshot.

The former project-authored presets have been removed. No published F1/expert numeric recommendations compatible with this app's metrics were verified; see `PRESET_SOURCES.md`. The recommendation registry remains empty. Initialization and reset use equal values of 10 for all available metrics, explicitly as a neutral starting point rather than a recommendation. Individual reset changes only that metric. Some telemetry and early team-share data are unavailable, so available weights are renormalized.
