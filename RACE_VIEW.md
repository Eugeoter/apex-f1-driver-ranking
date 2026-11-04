# Circuit presentation

This is an alternative presentation of the existing weighted LineUp score. It does not simulate actual lap times, racing distances, overtaking skill or uncertainty.

## Design

The existing palette is retained: asphalt `#0d1116`, lane surface `#27323c`, primary red `#f00827`, kerb red `#b02b40`, foreground `#dae2ec`, muted text `#91a0b0`. Metric and team colours still come from the existing registries. Existing site typography is retained, with tabular score numerals. A single racecourse is the central visual; the infield contains the driver key rather than additional introductory copy.

Overall ranking uses a horizontal stadium. Comparison uses a vertical stadium per setup, retaining the column name, rename, expand and remove controls. Cars carry short rank/acronym labels with leader lines; names and numeric scores are in the infield, and the full existing profile opens from the car or its identity. The identity key is now an SVG foreignObject with bounds strictly inside the inner kerb, so changes in viewport aspect ratio cannot expand it across the racing lanes. Small screens keep the horizontal circuit and place the two grandstands below it; local zoom makes the track details accessible.

The grandstand controls have bevelled canopies, raked seat terraces and a low adjustment deck. Only hovering the metric name shows a short definition; slider/value/reset areas do not open a description. Driver identity and score share one line, using one full-width infield column until two columns can fit without truncating names. Vertical circuits use surnames with full accessible names and profiles.

Comparison cards follow the circuit aspect ratio. The grid selects the largest fitting scale and automatically wraps/scales when setup count or viewport size changes; manual pan/zoom remains available between these changes. Membership changes animate card position and scale, respecting reduced motion.

The repeated metric colours encode the same metric in all views. A team's colour identifies its car and identity marker. The shared start/finish opening and 0/25/50/75/100 landmarks explain direction without adding prose to the main view. A concise normalization explanation is available on the score key.

## Numerical interpretation

Each lane independently spans 0–100. An outer lane is physically longer, but the **fraction of a completed lane** is the score. Distance on the screen is therefore not directly comparable across lanes; use progress and the numeric scores. Single-metric precision remains available in Driver stats and traditional LineUp.

Paths use 181 equally spaced arc-length samples, with the same topology for all lanes. Each coloured segment occupies exactly its existing weighted contribution divided by 100 along the sampled path. Missing-metric normalization, enabled metrics, score calculation and sorting are unchanged. Cars with no usable weighted data are not plotted as zero-score competitors; their score/rank remain unavailable.

## Interaction and motion

- Default: circuit. The main-view toolbar contains the circuit/traditional LineUp switch, ranking/table tabs, setup controls, comparison switch, weight code and language. The shape preference is stored locally. Icon-only floating tools above the canvas open Filters and Weights from order without reserving a side column. Filters presents dates, search and advanced driver filters together, with no secondary toggle; it remains available in comparison view. The labeled Add ranking action clones the active weights and opens comparison. The initial name is My F1 Ranking.
- Eight drivers per circuit; wheel or Up/Down moves one position. Previous/next buttons and Page Up/Down move eight; Home/End reach bounds.
- Each setup keeps an independent window. Filtering resets the window; expanding a comparison setup retains its window.
- Wheel over a circuit changes drivers. Ctrl+wheel or the local +/− buttons zoom that circuit from its fitted size up to 300%; drag a zoomed circuit to pan. Fit resets its zoom and pan. Comparison background pan and canvas zoom remain available independently.
- Metric controls form two grandstands around the main circuit. Each combines an enabled switch, definition tooltip, eight-bin metric distribution, animated weight slider, decimal input and reset. These persistent controls do not rebuild during a slider gesture. Scrollable grandstands keep all 17 modern metrics accessible. Comparison circuits have no grandstands or weight controls; expand a setup to edit it. Traditional LineUp and Driver stats have the same controls in a horizontal strip. There is no separate weights menu.
- Weight changes animate contributions, car progress and lane reassignment. The identity key uses the same keyed motion, with the existing per-setup rank deltas. Page changes explicitly enable a 780ms departure/arrival transition even after a shape switch or an immediate resize render; outgoing markers fade before the new batch enters.
- The shape switch matches visible drivers and interpolates every sampled path point and coloured contribution between straight and curved geometry over 800 ms. It does not rely on a screenshot crossfade.
- Click a car or identity to open its profile; keyboard activation also opens it. Hover/focus only highlights the driver and updates the rank journey. Click again, click outside, use the close button, or press Escape to dismiss. Wheel input over a profile closes it and advances the originating circuit; momentum remains assigned to that circuit after the card disappears.
- Weights from order accepts additions only through search/select and Add. Internal ordering retains drag and arrow buttons, but external drag additions and main-ranking drag handles are removed. Its compact overlay expands horizontally only when a result exists.
- Original horizontal/vertical SVG venue artwork includes service roads, pit garages, stands, parking, trees and lighting. This is decorative and never intercepts pointer events or alters score geometry.
- Circuit comparison uses a compact rank journey for the selected driver across all setups. Hover/focus updates it; clicking a setup node locates that driver in its eight-car window. The first setup is the reference, with signed rank differences beside scores and in the journey. These cross-setup differences are distinct from the existing temporal arrows for the latest weight edit. Unscorable ranks remain unavailable. The outer comparison frame cannot scroll on focus, keeping the journey visible while its canvas retains pan/zoom.
- Existing ranking/table, filters, metric switches, reset, weight code, weights-from-order, scenario rename/expand/remove and language controls remain connected to their original state.
- Reduced-motion preference removes the custom path, car and roster animations.

## Validation

`node tests/verify_race_track.mjs` validates both orientations and all eight lane geometries, finite bounds, approximately uniform arc-length samples, the start/finish gap, window boundaries including empty and fewer-than-eight datasets, and infield corners against the inner kerb at several responsive widths. Existing ranking-motion, visual-semantics and driver-drop tests remain applicable.

Browser checks exercised the horizontal circuit, vertical comparison circuits, both shape-switch directions, small decimal and large weight edits, reset, disabled metrics, rank deltas, profile content, empty searches, first/last windows, independent comparison windows, rename and expansion, original Driver stats, and 390×844 mobile layout. Native wheel input was checked in both orientations: the selected comparison window changed while canvas zoom stayed at 100%.

The circuit is intentionally an expressive, exploratory view. It is not a substitute for aligned bars when exact segment comparisons are required, and does not claim a formal usability/accessibility certification. Existing traditional LineUp and data tables are preserved for that reason.

## Linked metrics and driver wheel

Hovering a stacked contribution or Driver stats metric highlights its matching control and table column, scrolling only the control strip if needed. Hovering controls highlights corresponding data; keyboard focus uses the same mapping.

The driver profile uses an original steering-wheel SVG radar for starts, points, wins, podiums, finish rate and average qualifying position. The radar uses existing normalized values (higher is better, including qualifying); labels retain raw values. Missing axes are omitted rather than converted to zero. Solver results now separate numeric weights, feasible ranges and horizontal sliders, with fixed intervals displayed once.

## Compact controls and profiles

One toolbar button cycles circuit, traditional LineUp and Driver stats. Filters, search, clearing filters and changing years animate the resulting view; reduced-motion settings are respected. Main circuit grandstands divide the available height among all metrics without scrolling. Input controls occupy a separate deck beneath the seat distribution.

The compact profile places a small steering-wheel radar beside six numbered raw-value readouts; the index and metric color connect each readout to its axis. A short biography and source link keep the card scroll-free. The same readouts are retained in inline LineUp/table details.

## Motion continuity update

The view switch uses only circuit, stacked-bar and table icons, with localized accessible names and hover hints. The horizontal grandstand strip has a fixed seat zone and separate control deck; both traditional LineUp and Driver stats use it.

Rank animations batch geometry reads before writes and animate transforms instead of widths/left offsets. New edits capture rendered segment positions, so interrupted motion continues from the displayed state. Zero-width contributions collapse without changing adjacent layout. Slider easing is not restarted by unrelated repaints; comparison updates are coalesced onto the next frame rather than delayed until browser idle. Circuit repainting skips unchanged lane paths and contributions, and shape changes capture the current race rather than jumping to its final positions first.

## Finish-rate correction and help

Historical records with no retirement reason were previously counted as finishes even when their result was DNS, DNQ or DNPQ. Recomputed 446 affected F1DB driver-season records from the bundled race-results archive and updated the importer. Finish rates now remain in [0, 1]; period-level normalization no longer uses invalid rates as its upper bound. OpenF1 rows are unchanged.

The help icon documents the bundled sources, aggregation, normalization, missing values and weighted contributions in concise Chinese/English. Radar axes use color dots instead of ordinal numbers. Metric highlighting reapplies after DOM replacement, including newly visible cars. Shared font fallbacks and explicit identity line boxes prevent language-dependent vertical drift.
