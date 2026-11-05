# Apex LineUp — F1 Driver Ranking Lab

An interactive Formula 1 driver ranking tool. Explore how the order changes when you choose a season or year range, adjust the importance of different performance metrics, and compare multiple ranking setups side by side.

## Features

- A full-screen ranking view with scrollable driver panes and no document scrolling.
- The right-hand tools open metric weights or a floating weights-from-order workbench. Opening it overlays the ranking without resizing the main panel. The original search/add, ordered driver list, solve action and adjacent weight results are restored. Radar comparison and compact mode have been removed.
- Drag a driver's grip from the ranking into the order list. Reorder or remove selected drivers and weights recalculate automatically. Clicking a grip or pressing Enter also adds a driver; external drops validate driver IDs, reject duplicates and enforce the 10-driver limit.
- Add or import a setup to create another comparison column. Expand a column to edit it; zoom transitions connect each column to its full ranking view. Return to the canvas to compare changes.
- Comparison columns keep a bounded height and scroll independently; double-click a column name to rename it (Enter saves, Escape cancels). The right-hand tools and open tool panels disappear in comparison view and return when a column is expanded.
- Changes to weights, presets, reset, and imported codes animate driver order and contribution bars, with persistent rank-change arrows per setup. Driver profiles expand inline beneath their rows.
- Drag the comparison canvas to pan, use the wheel or buttons to zoom, and fit the full canvas with the fit button. There is no six-setup limit.
- Original local SVG artwork adds an Apex monogram, a racing-car illustration, podium wreaths, speed stripes, and consistent control icons. Asset provenance is in `assets/studio/ASSETS.md`.
- Original F1 red/black styling, distinct metric colors, and racing cars approaching a chequered finish; hover a contribution or weight row to isolate that metric. Metric definitions appear on hover or keyboard focus.
- Year range, search, and advanced driver filters; six interface languages. The database/season selector has been removed; date ranges still load the corresponding merged data.
- The language selector is always available in the top controls. Team-color rails reinforce driver identity without changing metric colors.
- Driver stats use readable 14px values and 64px rows without automatic zoom. Columns fill the available width and scroll horizontally within the pane; desktop rank and driver columns remain pinned.
- Driver-stat columns and bars share the exact metric palette used by the stacked ranking. Its sticky header restores clickable metric switches and distribution previews; disabling a metric removes its contribution without losing its saved weight.
- Metric weights use a compact 344px panel with one scrollable list. The equal-reset icon sits immediately beside its heading; individual resets remain beside each value. Long translated labels wrap without hiding the numeric input or slider.
- Metric switches sit above the rank/driver and score headings, leaving those headings adjacent to their data. The selected year range stays visible in the date control. Missing values and unscorable rows are distinguished from valid zero values; normalized data bars keep their scale and opacity when weights change.
- Local nationality flags and 11 verified contemporary team marks replace repeated identity text. Unknown/historical team marks fall back to the team name; flags retain accessible country names. Sources and licenses are in `assets/identity/`.
- Weight codes belong to the setup group in the top controls. The anchored popover separates read-only export from editable import, so pasting a code never replaces the current setup's export before validation.
- Historical championship points are the default. The switch next to the year range recalculates Grand Prix points, points per start, and team points share using a common scoring scale. Weight codes record the selected scoring mode.

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

In Reverse ranking, the vertical slider at the left of each metric adjusts its weight. The horizontal interval on the right uses the same metric color as the main ranking and shows feasible values while the other weights keep their current proportions. Moving a slider redistributes the remaining weight and updates all intervals. These intervals are slices through the feasible weight space, not independent global bounds; endpoints from different rows cannot generally be combined.

Grand Prix pole-position counts come from the `polePosition` flag in the [F1DB v2026.18.0](https://github.com/f1db/f1db/releases/tag/v2026.18.0) race-results CSV. Sprint qualifying poles are excluded. `data/pole_positions.json` is generated by `scripts/build_pole_positions.py` and follows the same race cutoff as the bundled season snapshot.

The former project-authored presets have been removed. No published F1/expert numeric recommendations compatible with this app's metrics were verified; see `PRESET_SOURCES.md`. The recommendation registry remains empty. Initialization and reset use equal values of 10 for all available metrics, explicitly as a neutral starting point rather than a recommendation. Individual reset changes only that metric. Some telemetry and early team-share data are unavailable, so available weights are renormalized.
