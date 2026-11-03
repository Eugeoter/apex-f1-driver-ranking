"use strict";

const LOCALES = window.APEX_I18N.locales;
const METRIC_KEYS = window.APEX_I18N.metricKeys;
const LANGUAGE_STORAGE_KEY = "apex-lineup-language-v2";
const WEIGHT_MAX = 100;
const WEIGHT_STEP = 0.1;
const INITIAL_RENDER_LIMIT = 100;
const RENDER_BATCH = 100;

// Recommendation entries require a published numeric weight table for these exact metrics.
// The reviewed F1/AWS methods do not supply one; see PRESET_SOURCES.md.
const PRESETS = {};
const DEFAULT_METRIC_WEIGHT = 10;

const SCENARIO_COLORS = ["#f00827", "#43d5ff", "#c7ff38", "#ffb020", "#ba75ff", "#ff6fb1"];
// Keep the original F1 metric palette stable across historical and modern datasets.
const METRIC_COLORS = ["#fa4e55", "#86d9ff", "#ff8b4d", "#ffc24b", "#fae065", "#d2a7ff", "#ff6c9b", "#a6d665", "#43c4a7", "#49b9dd", "#667fe0", "#a37ce2", "#e783c5", "#d7aa68", "#88bfd0", "#b7c85e", "#f2a66b"];
function metricColor(key) { return METRIC_COLORS[Math.max(0, METRIC_KEYS.indexOf(key)) % METRIC_COLORS.length]; }
const COUNTRY_REGIONS = {ARG:"AR",AUS:"AU",AUT:"AT",BEL:"BE",BRA:"BR",CAN:"CA",CHE:"CH",CHL:"CL",CHN:"CN",COL:"CO",CZE:"CZ",DEN:"DK",DEU:"DE",DNK:"DK",ESP:"ES",FIN:"FI",FRA:"FR",GBR:"GB",GER:"DE",HUN:"HU",IDN:"ID",IND:"IN",IRL:"IE",ITA:"IT",JPN:"JP",LIE:"LI",MAR:"MA",MCO:"MC",MEX:"MX",MON:"MC",MYS:"MY",NED:"NL",NLD:"NL",NZL:"NZ",POL:"PL",PRT:"PT",RUS:"RU",SWE:"SE",THA:"TH",URY:"UY",USA:"US",VEN:"VE",ZAF:"ZA",ZWE:"ZW"};
const TEAM_MARKS = {"Mercedes":"mercedes","Ferrari":"ferrari","Red Bull Racing":"redbullracing","Red Bull":"redbullracing","McLaren":"mclaren","Racing Bulls":"racingbulls","Alpine":"alpine","Haas F1 Team":"haasf1team","Haas":"haasf1team","Audi":"audi","Williams":"williams","Aston Martin":"astonmartin","Cadillac":"cadillac"};


const state = {
  metadata: null,
  dataset: null,
  weights: {},
  enabled: {},
  language: LOCALES[localStorage.getItem(LANGUAGE_STORAGE_KEY)] ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : "en",
  activePreset: null,
  activeScenario: null,
  overview: false,
  page: 0,
  ranked: [],
  scenarios: [],
  search: "",
  filters: {team: "all", country: "all", era: "all", achievement: "all", minStarts: 0},
  view: "stacked",
  zoom: {lineup: 1, compare: 1},
  previousRanks: new Map(),
  expandedDrivers: new Set(),
  visibleLimit: INITIAL_RENDER_LIMIT,
  filteredRanked: [],
  metricHistograms: new Map(),
  interactiveFrame: 0,
  filterTimer: 0,
  comparisonVisible: false,
  comparisonDirty: true,
  comparisonTask: 0
};

const $ = (selector) => document.querySelector(selector);
const driverKey = (driver) => String(driver.driver_id || driver.full_name || driver.driver_number).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function t(key, values = {}) {
  const template = LOCALES[state.language]?.ui[key] ?? LOCALES.en.ui[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

function applyLanguage(language) {
  state.language = LOCALES[language] ? language : "en";
  localStorage.setItem(LANGUAGE_STORAGE_KEY, state.language);
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : state.language;
  $("#language-select").value = state.language;
  document.title = `${t("workspaceTitle")} — Apex LineUp`;
  document.querySelector('meta[name="description"]').content = t("methodTitle");
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = t(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => { element.placeholder = t(element.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => { element.setAttribute("aria-label", t(element.dataset.i18nAria)); });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => { element.title = t(element.dataset.i18nTitle); });
  if (state.dataset) {
    updateSeasonNote(state.dataset.year);
    renderQuality();
    populateFilterOptions();
    renderAll();
    window.APEX_INVERSE.render();
  }
}

function seasonOptionLabel(year) {
  if (String(year) === "all") return t("allSeasons");
  if (String(year) === "modern") return t("modernSeasons");
  return String(year);
}

function updateSeasonNote(selection) {
  const bounds = selectionBounds(selection);
  if (!bounds) return;
  const period = bounds[0] === bounds[1] ? String(bounds[0]) : `${bounds[0]}–${bounds[1]}`;
  const button = $("#period-toggle");
  let label = button.querySelector('.period-label');
  if (!label) { label = document.createElement('span'); label.className = 'period-label'; button.append(label); }
  label.textContent = period;
  button.title = `${t("yearRange")}: ${period}`;
  button.setAttribute('aria-label', button.title);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function studioIcon(name, className = "studio-icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="./assets/studio/icons.svg#${name}"></use></svg>`;
}

function rankLabel(rank) {
  const number = String(rank).padStart(2, "0");
  return rank <= 3 ? `<span class="rank-medal rank-medal-${rank}"><svg viewBox="0 0 32 32" aria-hidden="true"><use href="./assets/studio/icons.svg#medal"></use></svg><span>${number}</span></span>` : number;
}

function metricName(key) {
  const index = METRIC_KEYS.indexOf(key);
  return LOCALES[state.language]?.metrics[index]?.[0] || key;
}

function metricDescription(key) {
  const index = METRIC_KEYS.indexOf(key);
  return LOCALES[state.language]?.metrics[index]?.[1] || "";
}

function presetLabel(key) { return PRESETS[key]?.label?.[state.language] || PRESETS[key]?.label?.en || key; }

function formatWeight(value) { return String(Math.round(Number(value) * 10) / 10); }

function normaliseWeight(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(clamp(parsed, 0, WEIGHT_MAX) * 10) / 10 : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rankDrivers(weights, enabled = state.enabled) {
  if (!state.dataset) return [];
  return state.dataset.drivers.map((driver) => {
    let weighted = 0;
    let availableWeight = 0;
    state.dataset.metrics.forEach((metric) => {
      if (enabled[metric.key] === false) return;
      const value = driver.normalised?.[metric.key];
      const weight = Number(weights[metric.key] || 0);
      if (value !== null && value !== undefined && Number.isFinite(Number(value)) && weight > 0) {
        weighted += Number(value) * weight;
        availableWeight += weight;
      }
    });
    return {...driver, score: availableWeight ? weighted / availableWeight : 0, availableWeight};
  }).sort((a, b) => b.score - a.score || (a.championship_position ?? 99) - (b.championship_position ?? 99) || a.full_name.localeCompare(b.full_name));
}

function normaliseSearchText(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function prepareDataset() {
  state.metricHistograms = new Map();
  state.dataset.drivers.forEach((driver) => {
    driver._searchIndex = normaliseSearchText(`${driver.full_name} ${driver.team_name || ""} ${driver.name_acronym || ""} ${driver.country_code || ""}`);
    if (!Number.isFinite(Number(driver.first_year))) driver.first_year = Number(driver.year) || null;
    if (!Number.isFinite(Number(driver.last_year))) driver.last_year = Number(driver.year) || null;
  });
  state.dataset.metrics.forEach((metric) => {
    const bins = Array(8).fill(0);
    state.dataset.drivers.forEach((driver) => {
      const value = driver.normalised?.[metric.key];
      if (value !== null && value !== undefined && Number.isFinite(Number(value))) bins[Math.min(7, Math.floor(Number(value) * 8))] += 1;
    });
    state.metricHistograms.set(metric.key, bins);
  });
}

function resetDriverFilters({render = true} = {}) {
  state.search = "";
  state.filters = {team: "all", country: "all", era: "all", achievement: "all", minStarts: 0};
  state.page = 0;
  state.visibleLimit = INITIAL_RENDER_LIMIT;
  if ($("#driver-search")) $("#driver-search").value = "";
  if ($("#team-filter")) $("#team-filter").value = "all";
  if ($("#country-filter")) $("#country-filter").value = "all";
  if ($("#era-filter")) $("#era-filter").value = "all";
  if ($("#achievement-filter")) $("#achievement-filter").value = "all";
  if ($("#min-starts-filter")) $("#min-starts-filter").value = "0";
  if (render && state.dataset) {
    renderLineUp({animate: false});
    requestComparisonRender();
  }
}

function populateFilterOptions({preserve = true} = {}) {
  if (!state.dataset) return;
  const selected = preserve ? {...state.filters} : {team: "all", country: "all", era: "all", achievement: "all", minStarts: 0};
  const teams = [...new Set(state.dataset.drivers.map((driver) => String(driver.team_name || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const countries = [...new Set(state.dataset.drivers.map((driver) => String(driver.country_code || "").trim()).filter(Boolean))].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  $("#team-filter").innerHTML = `<option value="all">${escapeHTML(t("filterAllTeams"))}</option>${teams.map((team) => `<option value="${escapeHTML(team)}">${escapeHTML(team)}</option>`).join("")}`;
  $("#country-filter").innerHTML = `<option value="all">${escapeHTML(t("filterAllCountries"))}</option>${countries.map((country) => `<option value="${escapeHTML(country)}">${escapeHTML(countryName(country))}</option>`).join("")}`;
  $("#era-filter").innerHTML = `<option value="all">${escapeHTML(t("filterAllEras"))}</option><option value="1950">${escapeHTML(t("era1950"))}</option><option value="1980">${escapeHTML(t("era1980"))}</option><option value="2000">${escapeHTML(t("era2000"))}</option><option value="2020">${escapeHTML(t("era2020"))}</option>`;
  $("#achievement-filter").innerHTML = `<option value="all">${escapeHTML(t("achievementAll"))}</option><option value="winner">${escapeHTML(t("achievementWinner"))}</option><option value="podium">${escapeHTML(t("achievementPodium"))}</option><option value="points">${escapeHTML(t("achievementPoints"))}</option>`;
  state.filters.team = teams.includes(selected.team) ? selected.team : "all";
  state.filters.country = countries.includes(selected.country) ? selected.country : "all";
  state.filters.era = ["all", "1950", "1980", "2000", "2020"].includes(selected.era) ? selected.era : "all";
  state.filters.achievement = ["all", "winner", "podium", "points"].includes(selected.achievement) ? selected.achievement : "all";
  state.filters.minStarts = Math.max(0, Math.trunc(Number(selected.minStarts) || 0));
  $("#team-filter").value = state.filters.team;
  $("#country-filter").value = state.filters.country;
  $("#era-filter").value = state.filters.era;
  $("#achievement-filter").value = state.filters.achievement;
  $("#min-starts-filter").value = String(state.filters.minStarts);
}

function driverMatchesFilters(driver) {
  if (state.search && !driver._searchIndex.includes(normaliseSearchText(state.search))) return false;
  if (state.filters.team !== "all" && driver.team_name !== state.filters.team) return false;
  if (state.filters.country !== "all" && driver.country_code !== state.filters.country) return false;
  if (Number(driver.race_starts || 0) < state.filters.minStarts) return false;
  if (state.filters.achievement === "winner" && Number(driver.wins || 0) <= 0) return false;
  if (state.filters.achievement === "podium" && Number(driver.podiums || 0) <= 0) return false;
  if (state.filters.achievement === "points" && Number(driver.championship_points || 0) <= 0) return false;
  if (state.filters.era !== "all") {
    const ranges = {"1950": [1950, 1979], "1980": [1980, 1999], "2000": [2000, 2019], "2020": [2020, 9999]};
    const [start, end] = ranges[state.filters.era];
    const first = Number(driver.first_year || driver.year || 0);
    const last = Number(driver.last_year || driver.year || 0);
    if (!first || !last || last < start || first > end) return false;
  }
  return true;
}

function filteredRanking(ranking) {
  return ranking.filter(driverMatchesFilters);
}

function activeFilterCount() {
  return Number(Boolean(state.search)) + Number(state.filters.team !== "all") + Number(state.filters.country !== "all") + Number(state.filters.era !== "all") + Number(state.filters.achievement !== "all") + Number(state.filters.minStarts > 0);
}

function updateFilterStatus(total, shown) {
  $("#filter-summary").textContent = t("resultsShown", {shown, total});
  const count = activeFilterCount();
  const badge = $("#active-filter-count");
  badge.textContent = String(count);
  badge.hidden = count === 0;
  $("#filter-toggle").classList.toggle("active", count > 0);
}

function displayValue(key, value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  const numeric = Number(value);
  if (["win_rate", "podium_rate", "finish_rate", "team_points_share"].includes(key)) return `${(numeric * 100).toFixed(1)}%`;
  if (["race_pace_score", "lap_consistency_score"].includes(key)) return `${(numeric * 100).toFixed(1)}%`;
  if (["race_starts", "wins", "podiums", "pole_positions", "championship_points"].includes(key)) return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
  return numeric.toFixed(1);
}

function safeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch (_) { return ""; }
}

function countryName(code) {
  const region = COUNTRY_REGIONS[code];
  if (!region) return code || "—";
  try { return new Intl.DisplayNames([state.language], {type: "region"}).of(region); }
  catch (_) { return code || "—"; }
}

function driverPortrait(driver, detail = false) {
  const profile = driver.profile || {};
  const local = profile.portrait_url;
  const localSource = /^\/assets\/drivers\/[a-z0-9-]+\.(?:png|jpg|webp|svg)$/.test(local || "")
    ? new URL(String(local).replace(/^\//, ""), document.baseURI).href
    : "";
  const wikiSource = safeExternalUrl(profile.wiki_thumbnail_url);
  const source = profile.portrait_source_name === "Generated F1 helmet avatar" && wikiSource ? wikiSource : localSource || safeExternalUrl(driver.headshot_url) || wikiSource;
  const fallback = `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 36c1-15 5-25 16-27 11 1 16 10 15 25l-6 6H14z" fill="currentColor"/><path d="M13 23c8-6 16-7 24-3l-3 9-20 1z" fill="#090c10" stroke="#fff" stroke-width="1.5"/></svg>`;
  return `<span class="driver-portrait ${detail ? "portrait-large" : ""}"><span class="portrait-fallback">${fallback}</span>${source ? `<img src="${escapeHTML(source)}" alt="" loading="lazy" decoding="async">` : ""}</span>`;
}

function nationalityFlag(driver) {
  const region = COUNTRY_REGIONS[driver.country_code];
  return region ? `<img class="nationality-flag" src="./assets/identity/flag-${region.toLowerCase()}.svg" alt="${escapeHTML(countryName(driver.country_code))}" title="${escapeHTML(countryName(driver.country_code))}" width="20" height="15">` : "";
}
function teamBadge(driver) {
  const team = driver.team_name || t("teamFallback");
  const mark = TEAM_MARKS[team];
  return mark ? `<img class="team-mark" src="./assets/identity/${mark}.webp" alt="${escapeHTML(team)}" title="${escapeHTML(team)}" width="28" height="20">` : `<span class="team-fallback" title="${escapeHTML(team)}">${escapeHTML(team)}</span>`;
}
function driverIdentity(driver) { return nationalityFlag(driver) + teamBadge(driver); }

function driverCell(driver) {
  const expanded = state.expandedDrivers.has(driverKey(driver));
  const profileUrl = safeExternalUrl(driver.profile?.profile_url);
  const name = escapeHTML(driver.full_name);
  const link = profileUrl ? `<a href="${escapeHTML(profileUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(t("openProfile", {name: driver.full_name}))}">${name}<span aria-hidden="true">↗</span></a>` : name;
  return `<div class="driver-cell"><button class="driver-drag" type="button" data-drag-driver="${driverKey(driver)}" aria-label="${escapeHTML(t("dragDriver", {name:driver.full_name}))}" title="${escapeHTML(t("dragDriver", {name:driver.full_name}))}">⠿</button><button class="driver-expand" type="button" data-expand-driver="${driverKey(driver)}" aria-expanded="${expanded}" aria-label="${escapeHTML(t(expanded ? "collapseDriver" : "expandDriver", {name: driver.full_name}))}"><span aria-hidden="true">▾</span></button>${driverPortrait(driver)}<span class="driver-info"><strong>${link}</strong><small class="driver-identity">${driverIdentity(driver)}</small></span></div>`;
}

function driverDetailContent(driver) {
  const profile = driver.profile || {};
  const bio = String(profile.biography || "").trim();
  const shortBio = bio.length > 400 ? `${bio.slice(0, 397).replace(/\s+\S*$/, "")}…` : bio;
  const profileUrl = safeExternalUrl(profile.profile_url);
  const stats = [
    ["profileRaceStarts", driver.race_starts], ["profilePoints", displayValue("championship_points", driver.championship_points)],
    ["profileWins", driver.wins], ["profilePodiums", driver.podiums],
    ["profileFinishRate", displayValue("finish_rate", driver.finish_rate)],
    ["profileQualifying", displayValue("average_qualifying_position", driver.average_qualifying_position)]
  ];
  const usesWikimedia = profile.portrait_source_name === "Wikimedia" || profile.portrait_source_name === "Generated F1 helmet avatar" && profile.wiki_thumbnail_url;
  const portraitSource = t(usesWikimedia ? "portraitSourceWikimedia" : profile.portrait_source_name === "Generated F1 helmet avatar" ? "portraitSourceGenerated" : "portraitSource");
  const carNumber = driver.driver_number !== null && driver.driver_number !== undefined ? ` / #${escapeHTML(driver.driver_number)}` : "";
  return `<div class="driver-detail-inner" ${state.view === "table" ? `role="cell" aria-colspan="${state.dataset.metrics.length + 3}"` : ""} style="--team:#${escapeHTML((driver.team_colour || "777777").replace("#", ""))}">
      <div class="detail-identity">${driverPortrait(driver, true)}<div><span class="detail-kicker">${carNumber}</span><h4>${escapeHTML(driver.full_name)}</h4><p class="driver-identity">${driverIdentity(driver)}</p></div></div>
      <div class="detail-copy"><p lang="${bio ? "en" : escapeHTML(state.language)}">${escapeHTML(shortBio || t("profileUnavailable"))}</p>${profileUrl ? `<a href="${escapeHTML(profileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t("visitProfile"))}</a>` : ""}<small>${bio ? `${escapeHTML(t("profileSource"))} · ` : ""}${escapeHTML(portraitSource)}</small></div>
      <div class="detail-stats">${stats.map(([label, value]) => `<div><strong>${escapeHTML(value ?? "—")}</strong><span>${escapeHTML(t(label))}</span></div>`).join("")}</div>
    </div>`;
}

function bindDriverDragging() {
  let drag = null, suppressClickUntil = 0;
  const accept = (id, target, y) => {
    if (!target?.closest('#inverse-list')) return;
    const row = target.closest('[data-inverse-index]');
    const at = row ? Number(row.dataset.inverseIndex) + Number(y > row.getBoundingClientRect().top + row.offsetHeight/2) : undefined;
    window.APEX_INVERSE.addDriver(id, at);
  };
  const clear = () => {
    drag?.ghost?.remove(); drag = null;
    document.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
  };
  $('#lineup-table').addEventListener('dragstart', event => {
    const row = event.target.closest('[data-driver]');
    if (!row || event.target.closest('a,button')) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-apex-driver', row.dataset.driver);
    if (studioTool !== 'reverse') openStudioTool("reverse");
  });
  $('#lineup-table').addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-drag-driver]');
    if (!handle || event.button !== 0) return;
    event.preventDefault();
    drag = {id:handle.dataset.dragDriver, x:event.clientX, y:event.clientY, pointer:event.pointerId, moved:false};
  });
  document.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (!drag.moved && Math.hypot(event.clientX-drag.x,event.clientY-drag.y) < 6) return;
    event.preventDefault();
    if (!drag.moved) {
      drag.moved = true;
      if (studioTool !== 'reverse') openStudioTool("reverse");
      drag.ghost = document.createElement('div'); drag.ghost.className = 'driver-drag-ghost';
      drag.ghost.textContent = state.dataset.drivers.find(d => driverKey(d) === drag.id)?.full_name || '';
      document.body.append(drag.ghost);
    }
    drag.ghost.style.left = `${event.clientX+12}px`; drag.ghost.style.top = `${event.clientY+12}px`;
    document.querySelectorAll('.is-drop-target').forEach(el => el.classList.remove('is-drop-target'));
    document.elementFromPoint(event.clientX,event.clientY)?.closest('#inverse-list')?.classList.add('is-drop-target');
  }, {passive:false});
  document.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointer) return;
    const id = drag.id;
    if (drag.moved) accept(id,document.elementFromPoint(event.clientX,event.clientY),event.clientY);
    else { if (studioTool !== 'reverse') openStudioTool("reverse"); window.APEX_INVERSE.addDriver(id); }
    suppressClickUntil = performance.now()+300; clear();
  });
  document.addEventListener('pointercancel', clear);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') clear(); });
  $('#lineup-table').addEventListener('click', event => {
    const handle = event.target.closest('[data-drag-driver]');
    if (!handle || performance.now() < suppressClickUntil) return;
    if (studioTool !== 'reverse') openStudioTool("reverse");
    window.APEX_INVERSE.addDriver(handle.dataset.dragDriver);
  });
}

function driverDetail(driver) {
  const expanded = state.expandedDrivers.has(driverKey(driver));
  return `<section class="driver-detail ${expanded ? "is-open" : ""}" data-detail-driver="${driverKey(driver)}" aria-hidden="${!expanded}" ${state.view === "table" ? 'role="row"' : ""} aria-label="${escapeHTML(t("profileHeading"))}">${expanded ? driverDetailContent(driver) : ""}</section>`;
}

function attributeContribution(driver, metric, weights) {
  const normalised = driver.normalised?.[metric.key];
  const weight = Number(weights[metric.key] || 0);
  if (normalised === null || normalised === undefined || !Number.isFinite(Number(normalised)) || weight <= 0) return 0;
  const denominator = Number(driver.availableWeight) || 0;
  return denominator > 0 ? Number(normalised) * weight / denominator : 0;
}

function scoreLabel(driver) { return driver.availableWeight > 0 ? (driver.score * 100).toFixed(1) : "—"; }

function stackedBar(driver, weights, enabled = state.enabled, {small = false} = {}) {
  const rankedDriver = Number.isFinite(driver.availableWeight) ? driver : rankDrivers(weights, enabled).find((item) => driverKey(item) === driverKey(driver));
  if (!(rankedDriver.availableWeight > 0)) return `<span class="stack-track is-unscored" role="img" aria-label="${escapeHTML(t("missingValue"))}"></span>`;
  const segments = state.dataset.metrics.map((metric, index) => {
    if (enabled[metric.key] === false) return "";
    const contribution = attributeContribution(rankedDriver, metric, weights) * 100;
    if (contribution <= 0) return "";
    const raw = displayValue(metric.key, driver[metric.key]);
    const title = t("contributionTooltip", {name: metricName(metric.key), raw, weight: formatWeight(weights[metric.key] || 0), points: contribution.toFixed(1)});
    return `<span class="stack-segment" data-segment-metric="${metric.key}" style="width:${contribution.toFixed(3)}%;--segment:${metricColor(metric.key)}" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}"></span>`;
  }).join("");
  const score = clamp(rankedDriver.score * 100, 0, 100).toFixed(2);
  const car = small ? "" : `<span class="race-car" style="--car-position:${score}%" aria-hidden="true"><svg viewBox="0 0 96 44" focusable="false"><use href="./assets/studio/icons.svg#race-car"></use></svg></span>`;
  return `<span class="stack-track ${small ? "small" : ""}" role="img" aria-label="${escapeHTML(t("stackAria", {name: driver.full_name, score: (rankedDriver.score * 100).toFixed(1)}))}">${segments}${car}<span class="finish-flag" aria-hidden="true"></span></span>`;
}

function encodeWeightCode() {
  const payload = JSON.stringify({v: 2, year: state.dataset?.year, weights: state.weights, enabled: Object.keys(state.enabled).filter((key) => state.enabled[key])});
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `AL2-${btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")}`;
}

function decodeWeightCode(code) {
  const trimmed = code.trim();
  if (!/^AL[12]-/.test(trimmed)) throw new Error(t("importInvalid"));
  let encoded = trimmed.slice(4).replaceAll("-", "+").replaceAll("_", "/");
  encoded += "=".repeat((4 - encoded.length % 4) % 4);
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (![1, 2].includes(payload.v) || payload.weights === null || typeof payload.weights !== "object" || Array.isArray(payload.weights)) throw new Error(t("importVersion"));
  if (Number(trimmed[2]) !== payload.v) throw new Error(t("importVersion"));
  if (payload.v === 2 && !Array.isArray(payload.enabled)) throw new Error(t("importVersion"));
  return payload;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function resetWeights({render = true} = {}) {
  if (!state.dataset) return;
  state.weights = Object.fromEntries(state.dataset.metrics.map(metric => [metric.key, DEFAULT_METRIC_WEIGHT]));
  state.enabled = Object.fromEntries(state.dataset.metrics.map(metric => [metric.key, true]));
  state.activePreset = null;
  if (render) renderAll();
}

function applyPreset(key, {render = true} = {}) {
  const preset = PRESETS[key];
  if (!preset || !state.dataset) return;
  state.weights = Object.fromEntries(state.dataset.metrics.map((metric) => [metric.key, Number(preset.weights[metric.key] || 0)]));
  state.enabled = Object.fromEntries(state.dataset.metrics.map((metric) => [metric.key, true]));
  state.activePreset = key;
  if (render) renderAll();
}

function renderPresets() {
  $("#preset-row").hidden = Object.keys(PRESETS).length === 0;
  $("#preset-row").innerHTML = Object.entries(PRESETS).map(([key, preset]) => (
    `<button class="preset-chip ${state.activePreset === key ? "active" : ""}" data-tooltip="${escapeHTML(preset.preference + " — " + preset.source)}" data-preset="${key}" type="button">${escapeHTML(presetLabel(key))}</button>`
  )).join("");
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });
}

function renderWeights() {
  if (!state.dataset) return;
  const scrollTop = $("#weight-list").scrollTop;
  const previousValues = new Map([...document.querySelectorAll('[data-weight]')].map(input => [input.dataset.weight, Number(input.value)]));
  document.querySelectorAll('[data-weight]').forEach(input => cancelAnimationFrame(input.motionFrame));
  $("#weight-list").innerHTML = state.dataset.metrics.map((metric) => {
    const value = formatWeight(state.weights[metric.key] || 0);
    const active = state.enabled[metric.key] !== false;
    const name = escapeHTML(metricName(metric.key));
    return `<div class="weight-control ${active ? "" : "is-disabled"}" data-control-metric="${metric.key}">
      <div class="weight-label"><button class="weight-enable" type="button" data-toggle-metric="${metric.key}" aria-pressed="${active}" aria-label="${escapeHTML(t(active ? "disableMetric" : "enableMetric", {name: metricName(metric.key)}))}" title="${escapeHTML(t(active ? "disableMetric" : "enableMetric", {name: metricName(metric.key)}))}" style="--segment:${metricColor(metric.key)}">${active ? "✓" : "+"}</button><label tabindex="0" data-tooltip="${escapeHTML(metricDescription(metric.key))}" for="weight-number-${metric.key}">${name}</label><input id="weight-number-${metric.key}" data-weight-input="${metric.key}" type="number" min="0" max="${WEIGHT_MAX}" step="${WEIGHT_STEP}" inputmode="decimal" value="${value}" aria-label="${escapeHTML(t("weightInputAria", {name: metricName(metric.key)}))}"><button class="weight-reset" type="button" data-reset-metric="${metric.key}" aria-label="${escapeHTML(t("resetMetric", {name: metricName(metric.key), value: formatWeight(DEFAULT_METRIC_WEIGHT)}))}" title="${escapeHTML(t("resetMetric", {name: metricName(metric.key), value: formatWeight(DEFAULT_METRIC_WEIGHT)}))}">${studioIcon("reset")}</button></div>

      <input id="weight-${metric.key}" data-weight="${metric.key}" type="range" min="0" max="${WEIGHT_MAX}" step="${WEIGHT_STEP}" value="${value}" aria-label="${escapeHTML(t("weightAria", {name: metricName(metric.key)}))}">
    </div>`;
  }).join("");
  renderWeightValuesOnly(previousValues);
  $("#weight-list").scrollTop = scrollTop;
}

function renderWeightValuesOnly(previousValues = null) {
  document.querySelectorAll("[data-weight]").forEach((input) => {
    const key = input.dataset.weight;
    const control = input.closest(".weight-control");
    const value = formatWeight(state.weights[key] || 0);
    const active = state.enabled[key] !== false;
    window.APEX_MOTION.slider(input, Number(value), previousValues?.get(key) ?? Number(input.value), document.activeElement !== input);
    const numberInput = control.querySelector("[data-weight-input]");
    if (document.activeElement !== numberInput) numberInput.value = value;
    control.classList.toggle("is-disabled", !active);
    const toggle = control.querySelector("[data-toggle-metric]");
    toggle.setAttribute("aria-pressed", String(active));
    toggle.setAttribute("aria-label", t(active ? "disableMetric" : "enableMetric", {name: metricName(key)}));
    toggle.title = toggle.getAttribute("aria-label");
    toggle.textContent = active ? "✓" : "+";
  });
}

function toggleMetric(key) {
  if (!state.dataset.metrics.some((metric) => metric.key === key)) return;
  const restoreToggleFocus = document.activeElement?.matches(".metric-mini");
  state.enabled[key] = state.enabled[key] === false;
  state.activePreset = null;
  renderAll({preserveWeightDOM: true});
  if (restoreToggleFocus) document.querySelector(`.metric-mini[data-toggle-metric="${key}"]`)?.focus({preventScroll:true});
}

function updateWeight(key, rawValue) {
  const value = normaliseWeight(rawValue);
  if (value === null || !state.dataset.metrics.some((metric) => metric.key === key)) return false;
  state.weights[key] = value;
  state.activePreset = null;
  renderWeightValuesOnly();
  document.querySelectorAll("[data-preset]").forEach((button) => button.classList.remove("active"));
  scheduleInteractiveRender();
  return true;
}

function resetMetric(key) {
  if (!state.dataset.metrics.some((metric) => metric.key === key)) return;
  state.weights[key] = DEFAULT_METRIC_WEIGHT;
  state.activePreset = null;
  renderAll({preserveWeightDOM: true});
}

function renderLineUp({animate = true} = {}) {
  if (!state.dataset) return;
  const table = $("#lineup-table");
  const viewport = $("#lineup-scroll");
  const scrollTop = viewport.scrollTop;
  const legendScrollLeft = table.querySelector(".metric-mini-row")?.scrollLeft || 0;
  const before = window.APEX_MOTION.snapshot(viewport, '.lineup-row[data-driver]', 'data-driver');
  state.ranked = rankDrivers(state.weights);
  state.filteredRanked = filteredRanking(state.ranked);
  syncActiveScenario();
  const visibleDrivers = state.filteredRanked.slice(0, state.visibleLimit);
  $("#page-status").textContent = `${state.filteredRanked.length} / ${state.dataset.drivers.length}`;
  const setup = state.scenarios.find(s => s.id === state.activeScenario);
  const changes = setup ? window.APEX_MOTION.history(setup, state.ranked, driverKey, state.dataset.year) : new Map();
  const rankPositions = new Map(state.ranked.map((driver, index) => [driverKey(driver), index + 1]));
  const metrics = state.dataset.metrics;
  const rowInfo = (driver) => {
    const rank = rankPositions.get(driverKey(driver));
    const change = driver.availableWeight > 0 ? changes.get(driverKey(driver)) || 0 : 0;
    const changeClass = change > 0 ? "rank-up" : change < 0 ? "rank-down" : "";
    const team = `#${(driver.team_colour || "777777").replace("#", "")}`;
    return {rank, change, changeClass, team};
  };
  let header = "";
  let rows = "";
  if (state.view !== "table") {
    const totalWeight = Math.max(1, metrics.reduce((sum, metric) => sum + (state.enabled[metric.key] === false ? 0 : Number(state.weights[metric.key] || 0)), 0));
    const histograms = metrics.map((metric, index) => {
      const active = state.enabled[metric.key] !== false;
      const bins = state.metricHistograms.get(metric.key) || Array(8).fill(0);
      const max = Math.max(1, ...bins);
      const spark = bins.map((count) => `<i style="height:${count / max * 100}%;--segment:${metricColor(metric.key)}"></i>`).join("");
      return `<button class="metric-mini ${active ? "" : "is-disabled"}" type="button" data-toggle-metric="${metric.key}" aria-pressed="${active}" aria-label="${escapeHTML(t(active ? "disableMetric" : "enableMetric", {name: metricName(metric.key)}))}" title="${escapeHTML(metricName(metric.key) + ": " + metricDescription(metric.key) + " · " + t("histogramMeaning"))}"><span><i style="--segment:${metricColor(metric.key)}"></i>${escapeHTML(metricName(metric.key))}</span><strong>${active ? `${Math.round((Number(state.weights[metric.key] || 0) / totalWeight) * 100)}%` : escapeHTML(t("metricOff"))}</strong><span class="metric-hist" aria-hidden="true">${spark}</span></button>`;
    }).join("");
    header = `<div class="stacked-header"><div class="metric-mini-row">${histograms}</div><div class="stacked-title"><span>${escapeHTML(t("rankDriver"))}</span><strong tabindex="0" data-tooltip="${escapeHTML(t("scoreMeaning"))}">${escapeHTML(t("scoreColumn"))}</strong><span>0 — 100</span></div></div>`;
    rows = visibleDrivers.map((driver) => {
      const info = rowInfo(driver);
      return `<div class="lineup-row stacked-row ${info.rank <= 3 ? "podium-row" : ""} ${info.changeClass}" data-driver="${driverKey(driver)}" draggable="true" style="--team:${info.team}"><div class="rank-cell">${driver.availableWeight > 0 ? rankLabel(info.rank) : "—"}</div>${driverCell(driver)}<div class="stack-cell">${stackedBar(driver, state.weights, state.enabled)}</div><div class="stack-score"><strong>${scoreLabel(driver)}</strong><small>${info.change > 0 ? `▲${info.change}` : info.change < 0 ? `▼${-info.change}` : " /100"}</small></div></div>${driverDetail(driver)}`;
    }).join("");
  } else {
    const columns = metrics.map(() => "minmax(112px, 1fr)");
    const template = `44px 230px 100px ${columns.join(" ")}`;
    header = `<div class="lineup-row header" style="grid-template-columns:${template}"><div>#</div><div>${escapeHTML(t("driverTeamColumn"))}</div><div>${escapeHTML(t("scoreColumn"))}</div>${metrics.map((metric) => `<div class="metric-heading ${state.enabled[metric.key] === false ? "metric-disabled" : ""}" style="--segment:${metricColor(metric.key)}" tabindex="0" data-tooltip="${escapeHTML(metricDescription(metric.key) + " · " + t("normalizedMeaning"))}">${escapeHTML(metricName(metric.key))} · ${escapeHTML(t("weightPrefix"))}${state.enabled[metric.key] === false ? escapeHTML(t("metricOff")) : formatWeight(state.weights[metric.key] || 0)}</div>`).join("")}</div>`;
    rows = visibleDrivers.map((driver) => {
      const info = rowInfo(driver);
      return `<div class="lineup-row ${info.rank <= 3 ? "podium-row" : ""} ${info.changeClass}" data-driver="${driverKey(driver)}" draggable="true" style="grid-template-columns:${template};--team:${info.team}"><div class="rank-cell">${driver.availableWeight > 0 ? rankLabel(info.rank) : "—"}</div>${driverCell(driver)}<div class="score-cell"><strong>${scoreLabel(driver)}</strong><small>${info.change > 0 ? `▲${info.change}` : info.change < 0 ? `▼${-info.change}` : "/100"}</small><span class="score-track"><i style="--score:${(driver.score * 100).toFixed(2)}%"></i></span></div>${metrics.map((metric) => { const normalized = driver.normalised?.[metric.key]; const missing = normalized == null || !Number.isFinite(Number(normalized)); const bar = missing ? 0 : Number(normalized) * 100; return `<div class="metric-cell ${missing ? "is-missing" : ""} ${state.enabled[metric.key] === false ? "metric-disabled" : ""}" data-metric="${metric.key}" style="--segment:${metricColor(metric.key)}" title="${escapeHTML(metricName(metric.key) + ": " + displayValue(metric.key, driver[metric.key]) + " · " + (missing ? t("missingValue") : t("normalizedValue", {value:bar.toFixed(1)})))}"><span>${displayValue(metric.key, driver[metric.key])}</span><span class="metric-track"><i style="--bar:${bar.toFixed(2)}%;--opacity:1"></i></span></div>`; }).join("")}</div>${driverDetail(driver)}`;
    }).join("");
  }
  // The document stays fixed; only the driver pane scrolls.
  table.innerHTML = header + (visibleDrivers.length ? rows : `<div class="ranking-empty" role="status">${escapeHTML(t("inverseNoResults"))}</div>`);
  if (state.view === "table") {
    table.setAttribute("role", "table");
    table.setAttribute("aria-label", t("tableView"));
    table.querySelectorAll(".lineup-row").forEach(row => {
      row.setAttribute("role", "row");
      [...row.children].forEach(cell => cell.setAttribute("role", row.classList.contains("header") ? "columnheader" : "cell"));
    });
  } else { table.removeAttribute("role"); table.removeAttribute("aria-label"); }
  table.classList.toggle("stacked-mode", state.view !== "table");
  table.style.minWidth = state.view === "table" ? `${374 + metrics.length * 112}px` : "";
  updateFilterStatus(state.filteredRanked.length, visibleDrivers.length);
  state.previousRanks = rankPositions;
  viewport.scrollTop = scrollTop;
  if (table.querySelector(".metric-mini-row")) table.querySelector(".metric-mini-row").scrollLeft = legendScrollLeft;
  window.APEX_MOTION.animate(viewport, ".lineup-row[data-driver]", "data-driver", before, animate);

}

function frozenScenario(name, weights, colorIndex, enabled = state.enabled, presetKey = null) {
  return {id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name, presetKey, weights: {...weights}, enabled: {...enabled}, color: SCENARIO_COLORS[colorIndex % SCENARIO_COLORS.length], ranking: null};
}

function scenarioName(scenario) { return scenario.presetKey ? presetLabel(scenario.presetKey) : scenario.name; }

function scenarioRanking(scenario) {
  if (!scenario.ranking) scenario.ranking = rankDrivers(scenario.weights, scenario.enabled);
  return scenario.ranking;
}

function initialiseScenarios() {
  const scenario = frozenScenario(t("customScenario", {number:1}), state.weights, 0, state.enabled);
  state.scenarios = [scenario];
  state.activeScenario = scenario.id;
  $("#setup-name").value = scenario.name;
  state.page = 0;
  setOverview(false);
}

function renderScenarios() { syncActiveScenario(); }

function svgElement(name, attributes = {}, text = null) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text !== null) element.textContent = text;
  return element;
}

function requestComparisonRender({force = false} = {}) {
  state.comparisonDirty = true;
  if (!state.comparisonVisible && !force) return;
  if (state.comparisonTask) {
    if ("cancelIdleCallback" in window) window.cancelIdleCallback(state.comparisonTask);
    else clearTimeout(state.comparisonTask);
  }
  const run = () => {
    state.comparisonTask = 0;
    if (!state.comparisonDirty) return;
    if (renderComparison() !== false) state.comparisonDirty = false;
  };
  state.comparisonTask = "requestIdleCallback" in window ? window.requestIdleCallback(run, {timeout: 350}) : window.setTimeout(run, 30);
}

function renderComparison() {
  const container = $('#comparison-chart');
  if (container.querySelector('.scenario-rename')) return false;
  if (!state.dataset || state.scenarios.length < 2) { container.replaceChildren(); return; }
  const previous = new Map([...container.querySelectorAll('.comparison-column')].map(column => {
    const list = column.querySelector('.comparison-rows');
    return [column.dataset.scenario, {scrollTop:list.scrollTop, snapshot:window.APEX_MOTION.snapshot(list, '.compare-row', 'data-flow-driver')}];
  }));
  state.scenarios.forEach(setup => { if (!previous.has(setup.id) && setup.seedMotion?.size) previous.set(setup.id, {scrollTop:0, snapshot:setup.seedMotion}); delete setup.seedMotion; });
  const rankings = state.scenarios.map(scenarioRanking);
  const filteredRankings = rankings.map(filteredRanking);
  const columnWidth = 350, gap = 76, headerHeight = 48;
  const rowHeight = 32;
  const listHeight = Math.min(480, Math.max(140, container.clientHeight - 156));
  const height = headerHeight + listHeight;
  const width = state.scenarios.length * columnWidth + (state.scenarios.length - 1) * gap;
  const rankMaps = rankings.map(ranking => new Map(ranking.map((driver, i) => [driverKey(driver), i + 1])));
  const columns = filteredRankings.map((ranking, index) => {
    const scenario = state.scenarios[index], name = scenarioName(scenario);
    const changes = window.APEX_MOTION.history(scenario, rankings[index], driverKey, state.dataset.year);
    const rows = ranking.slice(0, scenario.visibleLimit || INITIAL_RENDER_LIMIT).map(driver => {
      const key = driverKey(driver), rank = rankMaps[index].get(key), change = driver.availableWeight > 0 ? changes.get(key) || 0 : 0;
      const direction = change > 0 ? 'rank-up' : change < 0 ? 'rank-down' : '';
      const delta = change > 0 ? `▲${change}` : change < 0 ? `▼${-change}` : '';
      return `<div class="compare-row ${direction}" data-flow-driver="${key}" style="--team:#${(driver.team_colour || '777777').replace('#','')}" title="${escapeHTML(t('comparisonRowTooltip',{name:driver.full_name,rank:driver.availableWeight > 0 ? rank : "—",score:scoreLabel(driver)}))}"><span class="compare-rank">${driver.availableWeight > 0 ? rank : "—"}</span><span class="compare-driver">${escapeHTML(driver.name_acronym || driver.driver_number)}</span>${stackedBar(driver,scenario.weights,scenario.enabled,{small:true})}<span class="comparison-score"><strong>${scoreLabel(driver)}</strong><small>${delta}</small></span></div>`;
    }).join('');
    return `<section class="comparison-column" data-scenario="${scenario.id}" style="left:${index*(columnWidth+gap)}px;height:${height}px;--scenario:${scenario.color};view-transition-name:${scenario.id===state.activeScenario?'ranking-focus':'none'}" aria-label="${escapeHTML(t('comparisonRankAria',{name}))}"><div class="comparison-column-head">${studioIcon("flag", "column-flag")}<strong class="scenario-title" data-rename-scenario="${scenario.id}" tabindex="0" role="button" title="${escapeHTML(name)}">${escapeHTML(name)}</strong><div class="column-actions"><button data-expand-scenario="${scenario.id}" title="${escapeHTML(t('lineupTitle'))}" aria-label="${escapeHTML(t('lineupTitle'))}">${studioIcon("expand")}</button><button data-delete-scenario="${scenario.id}" title="${escapeHTML(t('scenarioRemove',{name}))}" aria-label="${escapeHTML(t('scenarioRemove',{name}))}">${studioIcon("close")}</button></div></div><div class="comparison-rows" tabindex="0" aria-label="${escapeHTML(t('comparisonRankAria',{name}))}" style="height:${listHeight}px">${rows || `<div class="empty-chart">${escapeHTML(t('resultsShown',{shown:0,total:0}))}</div>`}</div></section>`;
  }).join('');
  container.innerHTML = `<div class="comparison-board" style="width:${width}px;height:${height}px;--compare-row-height:${rowHeight}px">${columns}</div>`;
  const board = container.firstElementChild;
  board.style.zoom = String(state.zoom.compare);
  const svg = svgElement('svg', {viewBox:`0 0 ${width} ${height}`,width,height,class:'comparison-links',role:'img','aria-label':t('comparisonFlowAria')});
  board.prepend(svg);
  const lists = [...board.querySelectorAll('.comparison-rows')];
  lists.forEach((list,index) => { state.scenarios[index].loadPending = false; list.scrollTop = previous.get(state.scenarios[index].id)?.scrollTop || 0; });
  const displayMaps = filteredRankings.map(ranking => new Map(ranking.map((driver,i) => [driverKey(driver),i])));
  const motionStart = performance.now();
  let linksAnimating = previous.size > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const drawLinks = () => {
    const progress = linksAnimating ? Math.min(1, (performance.now() - motionStart) / 460) : 1;
    const eased = 1 - Math.pow(1 - progress, 3);
    const position = (index, key) => {
      const target = displayMaps[index].get(key) * rowHeight;
      const from = previous.get(state.scenarios[index].id)?.snapshot.get(key)?.top ?? target;
      return headerHeight + from + (target - from) * eased + rowHeight / 2 - lists[index].scrollTop;
    };
    const fragment = document.createDocumentFragment();
    filteredRankings[0].forEach(driver => {
      const key = driverKey(driver);
      for (let index=0; index<lists.length-1; index++) {
        const start = (index+1)*columnWidth + index*gap, end=start+gap;
        const y1 = position(index, key);
        const y2 = position(index+1, key);
        if (y1<headerHeight || y2<headerHeight || y1>height || y2>height) continue;
        fragment.appendChild(svgElement('path',{d:`M ${start} ${y1} C ${start+gap*.42} ${y1}, ${end-gap*.42} ${y2}, ${end} ${y2}`,class:'driver-flow',style:'--flow:#8293a6','data-flow-driver':key}));
      }
    });
    svg.replaceChildren(fragment);
    if (linksAnimating && progress < 1 && board.isConnected) requestAnimationFrame(drawLinks);
  };
  let linkFrame = 0;
  lists.forEach((list,index) => {
    list.addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const rows = [...list.querySelectorAll('.compare-row')];
      const current = rows.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : current < 0 ? 0 : clamp(current + (event.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1);
      rows[next]?.focus();
    });
    list.addEventListener('scroll', () => {
      linksAnimating = false;
      const setup = state.scenarios[index];
      const limit = setup.visibleLimit || INITIAL_RENDER_LIMIT;
      if (!setup.loadPending && list.scrollTop + list.clientHeight >= list.scrollHeight - 200 && limit < filteredRankings[index].length) {
        setup.loadPending = true; setup.visibleLimit = limit + RENDER_BATCH; requestComparisonRender();
      }
      if (linkFrame) return;
      linkFrame = requestAnimationFrame(() => { linkFrame=0; drawLinks(); });
    }, {passive:true});
    window.APEX_MOTION.animate(list,'.compare-row','data-flow-driver',previous.get(state.scenarios[index].id)?.snapshot || new Map());
  });
  drawLinks();
  board.querySelectorAll('.compare-row').forEach(row => { row.tabIndex = -1; row.setAttribute('aria-label', row.title); });
  board.addEventListener('focusin', event => {
    const row = event.target.closest('.compare-row');
    if (row) focusFlow(row.dataset.flowDriver,true);
  });
  board.addEventListener('focusout', event => {
    const row = event.target.closest('.compare-row');
    if (row) focusFlow(row.dataset.flowDriver,false);
  });
  board.addEventListener('mouseover', event => {
    const row = event.target.closest('.compare-row');
    if (row && !row.contains(event.relatedTarget)) focusFlow(row.dataset.flowDriver,true);
  });
  board.addEventListener('mouseout', event => {
    const row = event.target.closest('.compare-row');
    if (row && !row.contains(event.relatedTarget)) focusFlow(row.dataset.flowDriver,false);
  });
}

function focusFlow(driverNumber, active) {
  const board = $("#comparison-chart .comparison-board");
  if (!board) return;
  board.classList.toggle("has-focus", active);
  board.querySelectorAll("[data-flow-driver]").forEach((element) => element.classList.toggle("active", active && element.dataset.flowDriver === String(driverNumber)));
}

function renderCode() {
  $("#weight-code").value = encodeWeightCode();
}

function scheduleInteractiveRender() {
  if (state.interactiveFrame) return;
  state.interactiveFrame = requestAnimationFrame(() => {
    state.interactiveFrame = 0;
    renderLineUp();
    renderCode();
    requestComparisonRender();
  });
}

function renderAll({preserveWeightDOM = false} = {}) {
  renderPresets();
  if (preserveWeightDOM) renderWeightValuesOnly();
  else renderWeights();
  renderLineUp();
  renderCode();
  requestComparisonRender();
  if (!preserveWeightDOM) {
    renderScenarios();
    requestComparisonRender();
  }
}

function renderQuality() {}

function availableYears() {
  return (state.metadata?.seasons || [])
    .map((season) => Number(season.year))
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
}

function selectionBounds(selection) {
  const years = availableYears();
  if (!years.length) return null;
  const value = String(selection);
  if (/^\d{4}-\d{4}$/.test(value)) {
    const [first, second] = value.split("-").map(Number);
    return [Math.min(first, second), Math.max(first, second)];
  }
  if (value === "modern") return [Math.max(2023, years[0]), years.at(-1)];
  if (value === "all") return [years[0], years.at(-1)];
  const year = Number(value);
  return Number.isInteger(year) ? [year, year] : [years[0], years.at(-1)];
}

function syncPeriodControls(selection) {
  const bounds = selectionBounds(String(selection));
  if (bounds) { $("#year-from").value = String(bounds[0]); $("#year-to").value = String(bounds[1]); }
}

async function applyYearRange() {
  let start = Number($("#year-from").value);
  let end = Number($("#year-to").value);
  if (start > end) [start, end] = [end, start];
  const selection = start === end ? String(start) : `${start}-${end}`;
  await loadSeason(selection);
}

async function loadSeason(year, {resetScenarios = true} = {}) {
  const table = $("#lineup-table");
  table.innerHTML = `<div class="loading">${escapeHTML(t("loadSeason", {year}))}</div>`;
  try {
    const response = await fetch(`./api/lineup?year=${encodeURIComponent(year)}`);
    if (!response.ok) throw new Error(t("loadSeasonFailed", {year}));
    state.dataset = await response.json();
  } catch (apiError) {
    if (!window.APEX_STATIC_DATA) throw apiError;
    state.dataset = await window.APEX_STATIC_DATA.lineup(year);
  }
  state.expandedDrivers.clear();
  window.APEX_INVERSE.reset();
  state.previousRanks.clear();
  state.page = 0;
  state.visibleLimit = INITIAL_RENDER_LIMIT;
  prepareDataset();
  state.scenarios.forEach(s => { s.ranking = null; });
  populateFilterOptions();
  resetWeights({render:false});
  if (resetScenarios) initialiseScenarios();
  else {
    const active = state.scenarios.find(s => s.id === state.activeScenario);
    if (active) { state.weights = {...active.weights}; state.enabled = {...active.enabled}; }
  }
  state.comparisonDirty = true;
  const seasonInfo = state.metadata.seasons.find((season) => String(season.year) === String(year));
  syncPeriodControls(year);
  updateSeasonNote(year);
  renderAll();
}

async function importCode() {
  const message = $("#code-message");
  try {
    const payload = decodeWeightCode($("#weight-import").value);
    if (payload.year && String(payload.year) !== String(state.dataset.year)) {
      const option = state.metadata.seasons.find(item => String(item.year) === String(payload.year));
      const range = /^\d{4}-\d{4}$/.test(String(payload.year));
      if (!option && !range) throw new Error(t("importNoSeason", {year: payload.year}));
      await loadSeason(payload.year, {resetScenarios: false});
    }

    const validKeys = new Set(state.dataset.metrics.map((metric) => metric.key));
    const imported = {};
    Object.entries(payload.weights).forEach(([key, value]) => {
      if (validKeys.has(key)) {
        const weight = normaliseWeight(value);
        if (weight !== null) imported[key] = weight;
      }
    });
    if (!Object.keys(imported).length) throw new Error(t("importNoMetrics"));
    state.weights = Object.fromEntries(state.dataset.metrics.map((metric) => [metric.key, imported[metric.key] ?? 0]));
    state.enabled = Object.fromEntries(state.dataset.metrics.map((metric) => [metric.key, payload.v === 1 || payload.enabled.includes(metric.key)]));
    state.activePreset = null;
    addScenarioFromWeights();
    renderAll();
    message.textContent = t("codeApplied");
    message.style.color = "";
    showToast(t("codeImported"));
    $("#weight-import").value = "";
    closeStudioTools();
  } catch (error) {
    message.textContent = error.message;
    message.style.color = "#ff6b7c";
  }
}

async function copyCode() {
  const code = $("#weight-code").value;
  try {
    await navigator.clipboard.writeText(code);
  } catch (_) {
    $("#weight-code").select();
    document.execCommand("copy");
  }
  $("#code-message").textContent = t("codeCopied");
  $("#code-message").style.color = "";
  showToast(t("codeCopied"));
}

async function shareSite() {
  const url = `${window.location.origin}${window.location.pathname}`;
  const shareData = {title: document.title, text: t("shareSiteText"), url};
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      showToast(t("siteShared"));
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast(t("siteLinkCopied"));
  } catch (error) {
    if (error?.name === "AbortError") return;
    const input = document.createElement("input");
    input.value = url;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    showToast(t("siteLinkCopied"));
  }
}

function setView(view) {
  state.view = view;
  ["stacked", "table"].forEach(key => {
    $("#view-" + key).classList.toggle("active", key === view);
    $("#view-" + key).setAttribute("aria-pressed", String(key === view));
  });
  renderLineUp({animate:false});
}

function setZoom(which, value) {
  state.zoom[which] = clamp(value, .02, 3);
  const surface = which === "lineup" ? $("#lineup-table") : $("#comparison-chart .comparison-board");
  if (surface) surface.style.zoom = String(state.zoom[which]);
  document.querySelector(`[data-zoom-controls="${which}"] [data-zoom-value]`).textContent = `${Math.round(state.zoom[which] * 100)}%`;
}

function bindViewport(which) {
  const scroll = which === "lineup" ? $("#lineup-scroll") : $("#comparison-chart");
  const controls = document.querySelector(`[data-zoom-controls="${which}"]`);
  let dragging = null;
  controls.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.zoom;
    setZoom(which, action === "reset" ? 1 : state.zoom[which] + (action === "in" ? .2 : -.2));
  }));
  const panButton = controls.querySelector("[data-pan-toggle]");
  panButton.addEventListener("click", () => {
    const active = panButton.getAttribute("aria-pressed") !== "true";
    panButton.setAttribute("aria-pressed", String(active));
    scroll.classList.toggle("pan-active", active);
  });
  scroll.addEventListener("wheel", (event) => {
    if (!state.overview || (event.target.closest(".comparison-rows") && !event.ctrlKey)) return;
    event.preventDefault();
    const before = state.zoom[which];
    const bounds = scroll.getBoundingClientRect();
    const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
    const left = scroll.scrollLeft, top = scroll.scrollTop;
    setZoom(which, before * (event.deltaY < 0 ? 1.12 : 1 / 1.12));
    scroll.scrollLeft = (left + x) * state.zoom[which] / before - x;
    scroll.scrollTop = (top + y) * state.zoom[which] / before - y;
  }, {passive: false});
  scroll.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input, a, .comparison-rows, .scenario-title") || (event.button !== 0 && event.button !== 1)) return;
    dragging = {x: event.clientX, y: event.clientY, left: scroll.scrollLeft, top: scroll.scrollTop};
    scroll.setPointerCapture(event.pointerId);
    scroll.classList.add("is-panning");
    event.preventDefault();
  });
  scroll.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    scroll.scrollLeft = dragging.left - (event.clientX - dragging.x);
    scroll.scrollTop = dragging.top - (event.clientY - dragging.y);
  });
  const finishPan = () => { dragging = null; scroll.classList.remove("is-panning"); };
  scroll.addEventListener("pointerup", finishPan);
  scroll.addEventListener("pointercancel", finishPan);
}

function applyDriverFiltersFromControls() {
  state.search = normaliseSearchText($("#driver-search").value.trim());
  state.filters.team = $("#team-filter").value;
  state.filters.country = $("#country-filter").value;
  state.filters.era = $("#era-filter").value;
  state.filters.achievement = $("#achievement-filter").value;
  state.filters.minStarts = Math.max(0, Math.trunc(Number($("#min-starts-filter").value) || 0));
  state.page = 0;
  state.visibleLimit = INITIAL_RENDER_LIMIT;
  renderLineUp({animate: false});
  requestComparisonRender();
}

function scheduleFilterUpdate() {
  clearTimeout(state.filterTimer);
  state.filterTimer = window.setTimeout(applyDriverFiltersFromControls, 90);
}

function loadMoreDrivers() {
  if (state.visibleLimit >= state.filteredRanked.length) return;
  state.visibleLimit = Math.min(state.filteredRanked.length, state.visibleLimit + RENDER_BATCH);
  renderLineUp({animate: false});
}

function setupComparisonObserver() {
  const section = $("#compare");
  if (!("IntersectionObserver" in window)) {
    state.comparisonVisible = true;
    requestComparisonRender({force: true});
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    state.comparisonVisible = true;
    requestComparisonRender({force: true});
    observer.disconnect();
  // Keep the expensive multi-column comparison out of the initial render.
  // A small lead-in still lets it finish just before the user reaches it.
  }, {rootMargin: "120px 0px"});
  observer.observe(section);
}

function bindEvents() {
  window.APEX_INVERSE.init({state, t, escapeHTML, driverKey, rankDrivers, renderAll, metricName, driverIdentity,
    metricColor});
  $("#language-select").addEventListener("change", (event) => applyLanguage(event.target.value));
  $("#share-site").addEventListener("click", shareSite);
  $("#reset-weights").addEventListener("click", () => resetWeights());
  $("#view-stacked").addEventListener("click", () => setView("stacked"));
  $("#view-table").addEventListener("click", () => setView("table"));
  $("#filter-toggle").addEventListener("click", (event) => {
    const open = event.currentTarget.getAttribute("aria-expanded") !== "true";
    event.currentTarget.setAttribute("aria-expanded", String(open));
    $("#filter-drawer").hidden = !open;
  });
  $("#reset-filters").addEventListener("click", () => resetDriverFilters());
  ["#team-filter", "#country-filter", "#era-filter", "#achievement-filter"].forEach((selector) => $(selector).addEventListener("change", applyDriverFiltersFromControls));
  $("#min-starts-filter").addEventListener("input", scheduleFilterUpdate);
  let lineupScrollFrame = 0;
  $('#lineup-scroll').addEventListener('scroll', () => {
    if (lineupScrollFrame) return;
    lineupScrollFrame = requestAnimationFrame(() => {
      lineupScrollFrame = 0;
      const viewport = $('#lineup-scroll');
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 200) loadMoreDrivers();
    });
  }, {passive:true});
  bindViewport("compare");
  setupComparisonObserver();
  $("#weight-list").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-metric]");
    if (toggle) toggleMetric(toggle.dataset.toggleMetric);
    const reset = event.target.closest("[data-reset-metric]");
    if (reset) resetMetric(reset.dataset.resetMetric);
  });
  $("#lineup-table").addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle-metric]");
    if (toggle) toggleMetric(toggle.dataset.toggleMetric);
    const expand = event.target.closest("[data-expand-driver]");
    if (expand) {
      const key = expand.dataset.expandDriver;
      if (state.expandedDrivers.has(key)) state.expandedDrivers.delete(key);
      else state.expandedDrivers.add(key);
      const open = state.expandedDrivers.has(key);
      expand.setAttribute("aria-expanded", String(open));
      const driver = state.dataset.drivers.find((item) => driverKey(item) === key);
      expand.setAttribute("aria-label", t(open ? "collapseDriver" : "expandDriver", {name: driver?.full_name || key}));
      const detail = $("#lineup-table").querySelector(`[data-detail-driver="${key}"]`);
      if (detail && open && !detail.firstElementChild && driver) detail.innerHTML = driverDetailContent(driver);
      detail?.classList.toggle("is-open", open);
      detail?.setAttribute("aria-hidden", String(!open));
    }
    if (event.target.closest("[data-load-more]")) loadMoreDrivers();
  });
  $("#lineup-table").addEventListener("error", (event) => {
    if (event.target.matches(".driver-portrait img")) event.target.closest(".driver-portrait").classList.add("no-photo");
  }, true);
  $("#weight-list").addEventListener("input", (event) => {
    const slider = event.target.closest("[data-weight]");
    if (slider) updateWeight(slider.dataset.weight, slider.value);
    const number = event.target.closest("[data-weight-input]");
    if (number && number.value !== "") updateWeight(number.dataset.weightInput, number.value);
  });
  $("#weight-list").addEventListener("change", (event) => {
    const number = event.target.closest("[data-weight-input]");
    if (!number) return;
    if (!updateWeight(number.dataset.weightInput, number.value)) number.value = formatWeight(state.weights[number.dataset.weightInput] || 0);
    number.value = formatWeight(state.weights[number.dataset.weightInput] || 0);
  });
  $("#weight-list").addEventListener("focusout", (event) => {
    const number = event.target.closest("[data-weight-input]");
    if (number) number.value = formatWeight(state.weights[number.dataset.weightInput] || 0);
  });
  $("#driver-search").addEventListener("input", (event) => {
    scheduleFilterUpdate();
  });
  $("#copy-code").addEventListener("click", copyCode);
  $("#import-code").addEventListener("click", importCode);
  $("#year-range-filter").addEventListener("submit", (event) => {
    event.preventDefault();
    applyYearRange();
  });
  $("#reset-year-range").addEventListener("click", () => loadSeason("all"));
  $("#save-scenario").addEventListener("click", () => {
    syncActiveScenario();
    addScenarioFromWeights();
    renderAll();
  });
  bindStudio();
}

function syncActiveScenario() {
  const current = state.scenarios.find(s => s.id === state.activeScenario);
  if (!current) return;
  current.weights = {...state.weights}; current.enabled = {...state.enabled}; current.ranking = null;
}
function setOverview(open) {
  const next = open && state.scenarios.length > 1;
  const changed = state.overview !== next;
  const update = () => {
    state.overview = next;
    $(".studio").classList.toggle("is-comparing", next);
    $(".tool-rail").hidden = next;
    if (next) closeStudioTools();
    $("#single-view").hidden = next;
    $("#compare").hidden = !next;
    $("#overview-toggle").hidden = state.scenarios.length < 2;
    $("#overview-toggle").setAttribute("aria-pressed", String(next));
    $("#overview-toggle").innerHTML = studioIcon(next ? "collapse" : "expand");
    state.comparisonVisible = next;
    if (next) { renderComparison(); state.comparisonDirty = false; }
    else if (state.dataset) renderLineUp({animate: false});
  };
  if (!changed || !state.dataset || matchMedia("(prefers-reduced-motion: reduce)").matches) { update(); return; }
  state.viewTransition?.skipTransition();
  if (document.startViewTransition) {
    state.viewTransition = document.startViewTransition(update);
    state.viewTransition.finished.catch(() => {});
  } else {
    update();
    $(next ? "#compare" : "#single-view").animate([
      {opacity: .2, transform: next ? "scale(1.12)" : "scale(.84)"},
      {opacity: 1, transform: "scale(1)"}
    ], {duration: 420, easing: "cubic-bezier(.22,.7,.2,1)"});
  }
}
function openScenario(id) {
  state.viewTransition?.skipTransition();
  syncActiveScenario();
  const s = state.scenarios.find(s => s.id === id);
  if (!s) return;
  state.activeScenario = id; state.weights = {...s.weights}; state.enabled = {...s.enabled};
  state.activePreset = null; state.page = 0;
  $("#setup-name").value = scenarioName(s);
  window.APEX_INVERSE.invalidate();
  setView("stacked"); setOverview(false); renderAll();
}
function addScenarioFromWeights() {
  const s = frozenScenario(`${t("customScenario", {number: state.scenarios.length + 1})}`, state.weights, state.scenarios.length, state.enabled);
  s.rankPositions = new Map(state.ranked.map((driver, i) => [driverKey(driver), i + 1]));
  const source = state.overview ? document.querySelector(`.comparison-column[data-scenario="${state.activeScenario}"] .comparison-rows`) : $('#lineup-scroll');
  s.seedMotion = window.APEX_MOTION.snapshot(source, state.overview ? '.compare-row' : '.lineup-row[data-driver]', state.overview ? 'data-flow-driver' : 'data-driver');
  if (!state.overview) {
    const scale = (32) / (38);
    const headerHeight = source?.querySelector(".stacked-header,.lineup-row.header")?.getBoundingClientRect().height || 0;
    s.seedMotion.forEach(row => { row.top = (row.top - headerHeight) * scale; });
  }
  state.scenarios.push(s); state.activeScenario = s.id;
  $("#setup-name").value = s.name;
  setOverview(true);
}
function fitCanvas() {
  const board = $("#comparison-chart .comparison-board"), viewport = $("#comparison-chart");
  if (!board) return;
  setZoom("compare", Math.min((viewport.clientWidth - 48) / parseFloat(board.style.width), (viewport.clientHeight - 48) / parseFloat(board.style.height), 1));
  viewport.scrollLeft = 0; viewport.scrollTop = 0;
}
let studioTool = null;
function closeStudioTools({restoreFocus = false} = {}) {
  const previous = studioTool;
  ["settings", "reverse", "code"].forEach(key => {
    $("#"+key+"-panel").hidden = true;
    $("#"+key+"-toggle").setAttribute("aria-expanded", "false");
  });
  studioTool = null;
  if (restoreFocus && previous) $("#"+previous+"-toggle").focus();
}
function positionCodePanel() {
  const panel = $("#code-panel");
  if (innerWidth <= 720) { panel.style.right = ""; panel.style.top = ""; return; }
  const anchor = $(".setup-cluster").getBoundingClientRect();
  panel.style.right = `${Math.max(12, innerWidth - anchor.right)}px`;
  panel.style.top = `${anchor.bottom + 10}px`;
}
function openStudioTool(key) {
  closeStudioTools(); studioTool = key;
  $("#"+key+"-panel").hidden = false;
  $("#"+key+"-toggle").setAttribute("aria-expanded", "true");
  if (key === "reverse") {
    if (state.overview) setOverview(false);
  }
  if (key === "code") { positionCodePanel(); renderCode(); $("#code-message").textContent = ""; $("#weight-import").focus(); }
}
function bindStudio() {
  bindDriverDragging();
  window.addEventListener("resize", () => { if (studioTool === "code") positionCodePanel(); });
  ["settings", "reverse", "code"].forEach(key => {
    $("#"+key+"-toggle").onclick = () => studioTool === key ? closeStudioTools({restoreFocus:true}) : openStudioTool(key);
    $("#"+key+"-close").onclick = () => closeStudioTools({restoreFocus:true});
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeStudioTools({restoreFocus:true}); $("#filter-drawer").hidden = true; $("#filter-toggle").setAttribute("aria-expanded", "false"); $("#period-popover").hidden = true; } });
  document.addEventListener("pointerdown", e => {
    if (studioTool === "code" && !e.target.closest("#code-panel,#code-toggle")) closeStudioTools();
  });
  $("#period-toggle").onclick = () => { const el = $("#period-popover"); el.hidden = !el.hidden; $("#period-toggle").setAttribute("aria-expanded", String(!el.hidden)); };
  $("#year-range-filter").addEventListener("submit", () => { $("#period-popover").hidden = true; });
  $("#overview-toggle").onclick = () => setOverview(!state.overview);
  $("#setup-name").addEventListener("change", e => {
    const s = state.scenarios.find(s => s.id === state.activeScenario);
    if (s) { s.name = e.target.value.trim() || t("customScenario", {number:1}); s.presetKey = null; requestComparisonRender(); }
  });
  const beginRename = title => {
    if (title.querySelector('input')) return;
    const scenario = state.scenarios.find(s => s.id === title.dataset.renameScenario);
    if (!scenario) return;
    const input = document.createElement('input'); input.className = 'scenario-rename';
    input.value = scenarioName(scenario); input.maxLength = 32; input.setAttribute('aria-label', 'Setup name');
    title.replaceChildren(input); input.focus(); input.select();
    let finished = false;
    const finish = save => {
      if (finished) return; finished = true;
      if (save && input.value.trim()) { scenario.name = input.value.trim(); scenario.presetKey = null; }
      title.textContent = scenarioName(scenario); title.title = scenarioName(scenario);
      title.closest('.comparison-column').setAttribute('aria-label', t('comparisonRankAria', {name:scenarioName(scenario)}));
      if (scenario.id === state.activeScenario) $('#setup-name').value = scenarioName(scenario);
      if (state.comparisonDirty) requestComparisonRender();
    };
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); finish(e.key === 'Enter'); } });
  };
  $('#comparison-chart').addEventListener('dblclick', e => {
    const title = e.target.closest('[data-rename-scenario]'); if (title) beginRename(title);
  });
  $('#comparison-chart').addEventListener('keydown', e => {
    if (e.target.matches('[data-rename-scenario]') && (e.key === 'Enter' || e.key === 'F2')) { e.preventDefault(); beginRename(e.target); }
  });
  $("#comparison-chart").addEventListener("click", e => {
    const expand = e.target.closest("[data-expand-scenario]");
    if (expand) openScenario(expand.dataset.expandScenario);
    const remove = e.target.closest("[data-delete-scenario]");
    if (remove) {
      state.scenarios = state.scenarios.filter(s => s.id !== remove.dataset.deleteScenario);
      if (state.activeScenario === remove.dataset.deleteScenario) openScenario(state.scenarios[0].id);
      if (state.scenarios.length < 2) setOverview(false);
      else requestComparisonRender();
    }
  });
  $("#fit-canvas").onclick = fitCanvas;
  $("#comparison-chart").addEventListener("keydown", e => {
    if (e.target.closest("button, input, [data-rename-scenario], .comparison-rows")) return;
    const viewport = e.currentTarget;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "0"].includes(e.key)) e.preventDefault();
    if (e.key === "ArrowLeft") viewport.scrollLeft -= 90;
    if (e.key === "ArrowRight") viewport.scrollLeft += 90;
    if (e.key === "ArrowUp") viewport.scrollTop -= 90;
    if (e.key === "ArrowDown") viewport.scrollTop += 90;
    if (e.key === "+" || e.key === "=") setZoom("compare", state.zoom.compare * 1.2);
    if (e.key === "-") setZoom("compare", state.zoom.compare / 1.2);
    if (e.key === "0") fitCanvas();
  });
  window.addEventListener("apex-weights-applied", () => { openStudioTool("settings"); });
  new ResizeObserver(() => { if (state.dataset) renderLineUp({animate:false}); if (state.overview) requestComparisonRender(); }).observe($("#lineup-scroll"));
  const tooltip = $("#metric-tooltip");
  function showTip(target) {
    const rect = target.getBoundingClientRect(); tooltip.textContent = target.dataset.tooltip; tooltip.hidden = false;
    tooltip.style.left = `${Math.max(12, Math.min(rect.left - 290, innerWidth - 310))}px`;
    tooltip.style.top = `${Math.max(12, Math.min(rect.top, innerHeight - 100))}px`;
  }
  document.addEventListener("mouseover", e => { const target = e.target.closest("[data-tooltip]"); if (target) showTip(target); else tooltip.hidden = true; });
  document.addEventListener("focusin", e => { const target = e.target.closest("[data-tooltip]"); if (target) showTip(target); else tooltip.hidden = true; });
  document.addEventListener("focusout", () => { tooltip.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") tooltip.hidden = true; });
  let highlightedMetric;
  const highlightMetric = e => {
    const key = e.target.closest("[data-segment-metric]")?.dataset.segmentMetric || e.target.closest("[data-control-metric]")?.dataset.controlMetric || e.target.closest(".metric-mini")?.dataset.toggleMetric;
    if (key === highlightedMetric) return;
    highlightedMetric = key;
    document.querySelectorAll(".stack-segment").forEach(s => s.classList.toggle("metric-dimmed", Boolean(key) && s.dataset.segmentMetric !== key));
  };
  document.addEventListener("mouseover", highlightMetric);
  document.addEventListener("focusin", highlightMetric);
}

async function initialise() {
  applyLanguage(state.language);
  bindEvents();
  try {
    try {
      const response = await fetch("./api/seasons");
      if (!response.ok) throw new Error(t("fetchUnavailable"));
      state.metadata = await response.json();
    } catch (apiError) {
      if (!window.APEX_STATIC_DATA) throw apiError;
      state.metadata = await window.APEX_STATIC_DATA.metadata();
    }
    const years = availableYears();
    const yearOptions = years.map((year) => `<option value="${year}">${year}</option>`).join("");
    $("#year-from").innerHTML = yearOptions;
    $("#year-to").innerHTML = yearOptions;
    if (!state.metadata.default_year) throw new Error(t("noSeasons"));
    renderQuality();
    await loadSeason(state.metadata.default_year);
  } catch (error) {
    $("#lineup-table").innerHTML = `<div class="loading">${escapeHTML(error.message)}</div>`;
  }
}

initialise();
