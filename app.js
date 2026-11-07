"use strict";

const LOCALES = window.APEX_I18N.locales;
const METRIC_KEYS = window.APEX_I18N.metricKeys;
const LANGUAGE_STORAGE_KEY = "apex-lineup-language-v2";
const WEIGHT_MAX = 100;
const WEIGHT_STEP = 0.1;
const INITIAL_RENDER_LIMIT = 40;
const RENDER_BATCH = 100;

// Recommendation entries require a published numeric weight table for these exact metrics.
// The reviewed F1/AWS methods do not supply one; see PRESET_SOURCES.md.
const PRESETS = {};
const DEFAULT_METRIC_WEIGHT = 10;

const SCENARIO_COLORS = ["#f00827", "#43d5ff", "#c7ff38", "#ffb020", "#ba75ff", "#ff6fb1"];
function metricColor(key) { return window.APEX_METRIC_TEXTURES.color(key); }
const COUNTRY_REGIONS = {ARG:"AR",AUS:"AU",AUT:"AT",BEL:"BE",BRA:"BR",CAN:"CA",CHE:"CH",CHL:"CL",CHN:"CN",COL:"CO",CZE:"CZ",DEN:"DK",DEU:"DE",DNK:"DK",ESP:"ES",FIN:"FI",FRA:"FR",GBR:"GB",GER:"DE",HUN:"HU",IDN:"ID",IND:"IN",IRL:"IE",ITA:"IT",JPN:"JP",LIE:"LI",MAR:"MA",MCO:"MC",MEX:"MX",MON:"MC",MYS:"MY",NED:"NL",NLD:"NL",NZL:"NZ",POL:"PL",PRT:"PT",RUS:"RU",SWE:"SE",THA:"TH",URY:"UY",USA:"US",VEN:"VE",ZAF:"ZA",ZWE:"ZW"};
const TEAM_MARKS = {"Mercedes":"mercedes","Ferrari":"ferrari","Red Bull Racing":"redbullracing","Red Bull":"redbullracing","McLaren":"mclaren","Racing Bulls":"racingbulls","Alpine":"alpine","Haas F1 Team":"haasf1team","Haas":"haasf1team","Audi":"audi","Williams":"williams","Aston Martin":"astonmartin","Cadillac":"cadillac"};
// Embedded PNG marks avoid extra requests and stale/missing image responses.
const TEAM_BADGE_IMAGES = {"alpine":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA/klEQVR42u2XQRKDIAxFPx3vVXqypidDT5ZuHMdpQQHDiM5/SwWF5BEjQAghhBBCukJVvaoG/Ud+xw4dLl4AvK8aedENrqjMpj5dKKSqHkC4pTJd65OhzJpkhh4n+a4AfOT2B8AYuT71rkyYzwKa6jNHzxsrE3Y2GKyjJ4YlUjI2KaapN6wyPjLeVp9I9MTC94Lx4XC1KE1niTLN9ElFr3LTSWUs9HGxSCRqNBI1es3WImvm7s2ZcqPXI1LVk3TCki037+RZcVRqNTv0HOfcq2UjFowKxvGPl2WJbFF9rHt3b/jMoiwOuS9K/GiPJk62ap1bKHOKPoQQQgghN+ULjpHVFtGMneEAAAAASUVORK5CYII=","astonmartin":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABRklEQVR42u2W4XGDMAyF9TJBRmEDzAQdCZgMd4Ns5P6olXtRbJq2pO313nfH2ciWJUtCiZkQQgghhBBCiN8BpZRkZunQQ4GlJX+GLSulbEdHpZSydJw/3I5nYDOz9RO6o5m9/oEKyngwtTms+zuPFmUAskee50GHiTZYxj6MZrYCyCc/nOo2Nw6/O7jun8Oe3NHxMp13nN8LWLQ9AXifd+rXSyR3HPT5UN8vD6R7qPsGkl1InnYuYxSs1Z03Mzu1OgiAKUSBx5nWXoLxOYxcmmfSOdfR5TM52sx+jfrEzjcz8EFnydUYZycBWGg9cTA63SfxWv0+bjIfHT20ddVn83ZZ3xO3S3ac9/la0L0+P9K73GG6SIr9P+xJDcdZf/nq7wQOuAzX+Qhg8nLyMqCL3bXjp5XKd0uslzX9exNCCCGEEEKI/8IbtUL9zv0Zg8YAAAAASUVORK5CYII=","audi":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABe0lEQVR42u1WQXLEIAwT+Vjcl4V9mcnL6AW2jheCnR56qDWzswwRsuMYARAIBAKBQCAQCAT+K5KeqLUSAAKwtykCUACcAJBSyop7CB4AvDRvwv21JgbJ53oFt59ErrWSmucH3AuvxTdprpLnVgXLC2ZHIayabODl2cO86rlVoElAMnLZEP8z1x7FsZhXielWcGhaivgTXwiQsfqsx3dVanug3rQQ9+LJ8SKPrpm3tx2lVIzOdbb/IlxibHFX1zgmNOou07VXxRS57lsTLpb2Gb3IJNiugpVZJdVUcRwBBQA27wJHkPJAG8r/V6DNGehD/Kb1SI3Pm1bQB1cx5lG2Jrx8Y9l3uk0GeInNlr1fyrUfxY7mBzaaV47V11h83WGjV+7Dg6w6DrJs9PXqTn4gkg3+Ww1cNvLIwWXdLWlglYfsY9Xv8hZ5iB4+FZfUsxH3sWZK6Wv1ifQN8N3Pi4vY8PLWN7NDk1eaZlgXtSTprzQDgUAgEAgEAoGAG9/E4XbxKyh4IgAAAABJRU5ErkJggg==","cadillac":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABvUlEQVR42u2WO07DQBCG/0E+AAUKLSVCFJyA2CfgSLs+AWfhBF7fwAUHoKWjoB8K1tHY2pfXSRFpviaRnew8/9kBFEVRFEVRFEWphJjZAjAA3BX53frPHgDAzAP/016D997XAQAaEUkLwPggzOo//Q57RwBPwfIT3Vc4b4M+MbP1kVlRkRlbmanQWYtzuZxB+nhKwsrg4CvRiT7by9kqwMwMwBFRNz9rMob3MkpjkXYotTO3zCgfNoEfxTI/VrbRkApwQ6WD9mMVMKtxBQA9EbkKwfUF4zCHi3xfakD2WaYai8NTgfmpljrnocDGBOANQEtElKuA8wb7wDiNOfmaeH1DRLaictL2VywJKRG/nGkK1d7wvZhWlplNqB2bhLAmP05L+Em8e88IuaQi8V0o0rOD0EF6mSJyzPwN4BDJ/sfOCk7zlgCgW+utiTg062DM3QsF+9PthjaSa4xMoIlNQSrYOWTvBSdOpgJjSMQicCMS5bz2ppWIoyOcCntQjsJ59ZZG7wA8i7XhIAMQFShx9iTgknuHdggrFdQngF8Aj6sWagOtOObukosEUBDUUXx3WzOrKIqiKIqiKMrF+QOgey5VNZj1MwAAAABJRU5ErkJggg==","ferrari":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAADCUlEQVR42u1YQc6iMBh9TGbvcIP/CNyAkrCWf++CeACTuUHhJM7GlYuJrk1absB/gl927hxP0NlQrYVCMUX9Z/ySxrRIeY++7/UrwCte8X+HN8KcpG6h0ucAirrP6/ZwAkT5DQEQ3/dLAIjj+DSbzSZJkgQAsNlsytVqdQKA3W43OR6PgStS3kCwVPYl2OVyCQBIkiTYbDYlAMzncwBADRS+75dxHJ/kZJKcgVg+hJQVgcVi8fNwOLzPZrOJOq4DleH7fnk8Hn8o/T+m/+nEAECSWq/XxNUKZL7vJzqAOvYAQAh5C8PwetnI5fmcX15mURRybF8PvbURsyFgGxkAUbdPAJ+UUkEpFX3BGOu9zhgThBA5t1CaU2dhlNJeQCowSqkghAhCiBVZed90Ov0A8MslgUwMCMaYSNNUaG9TEEKs56CUiocQqB9sbLYr8TACQoizZGpdX4G3lWB9b298t2XAOb9yla5gjF1szvMa7mM7j018G7NOybKs6QYOwTsjoHq8Cj7P86sxfZ94GgJRFMHzvPMbbwM/xtsfpAZT8qVpepWweuKqFtrmQKZ5673A2QoYi6qqqs7JaZKTKiv1Ouf83EaXkEnnNsCDIABjrOFknHMURXEXAq1PyPMcSZIgDENQSo03l2XZasNdObHdbn87TQKTfmUh1rcTm8oIAK15UBeQ7mI6nX6Y6h4dXBAExlJCB9s2xhgTyiFq/HKizWFsSbQRcF0H9VqpyQ775CQr1lst1EkeWBRknRWqQf9sFAKmPOgj0FZSmxJ7LP3ffLAB0MiHruOobRl9VxmpKyHvN80zVD7ejatATbu1uqvu93tUVXUeY4x1bl6cc0RRFLn8cjdoFeSJSyamPNh3bVh3cR9XudAlv7GTt1Ham8AYdtWrVbmrdQ7Z2GRfktPBS4nph/vRncd2X5B1kSSglxjqx65HSadTSirwtq90bdceIZ2GlHQSprpIv3ZP1xlEwiaeCfxgEs8I3oqE8uX5qYMQQkyHlAxfKJjq/18N/FlSz2CTr3jFvxx/ARubyK9Ekf9aAAAAAElFTkSuQmCC","haasf1team":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABwUlEQVR42u1Za27DMAiGafcqPVnpyZycjP1Jq8yzHQy4ySQjVU1Vh3y8HwGYNGnSpDMJRzEWEdouX9/L+6GIyyW1ISIsIkl0lHZCXgK4h+i/AndbBD3gAeBxcGwBgHW7vmUxUaMnIvJozbf8nI80KSJ0xOMM8GzJVJH8rD7vziaNWOJI8FQC36np/YcV/CVSABP4htuRRoAQK1RMTA7LcWdioGjts0f7hnrCob7vjBuN66SwWCgwS5H31sBqrfBlkOnZUampde9mjfzMvec53f4fmXJbFirwSB/zf2XabGa2UQKkwLSpsZAvkI0CaNJm0uR6jQDfjQC8Ff4ihRB/gjLjt5aCOx8zCwItWq2HDylHh6KsX/NN16iomJE5rP50DORR2k8dWOhwpKwcosLoeM9+PxoFqcYDAOBeWrFsOH4Jh4gYVsz2Zo9MmxHtS3c77eg2ydoARk1jXAHGlsIWMThZ02t1TMy2de+PpwWJHmzCBu8K+NjNRCMtmjcTLcuesU5UC9KIoS7waLVEnqcrfcu6u6asbpy3WlSuBy00Hvig5o/l7HcFRouwV+s4SpjN5/OZ4rVqXy77mmnSpEmTuugH9NMWPLgnTEUAAAAASUVORK5CYII=","mclaren":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA7UlEQVR42u2XfQqEIBDFZ8B7rZ4sO5nuydx/DMSl1pWZVHo/CCpCnuObj4gAAAAAAJ4LjxaQUrL51hLR6+LTNxFFZo7DBaeUQr568LeeQI7wEV0rtGxkZqe2gSx6K6wh731m1rSHOkuKPsuDlYR/Rd90CPfCCfkve1cVysK34Y2rSl7TWFHCJI3X1S9MQyksrRLLrlhFJp50VxI6ub2pC1edMuRnK5D0Xr3qHGIlBF+sryf+xlmoFUszsrT4hg0Emh3VEeEG8V5SvJlkX274n1anfQKtRGUfv6r4MHWJ/GEdTyuiOZ4AAAAAADyZDzwIQ+py73bxAAAAAElFTkSuQmCC","mercedes":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACVklEQVR42u1YW47DIAy0q71X2JOFnAxyMu/H4mqKSIJ5tKtVLFVplQJ+jO3BRLfccsst/0pExOF3/Z0/RwlPUFyfS/oe4W87EUVmjmmNZ2bfc+5jkPKeiEL6PJVlZnXQlpRfiCiISBARp8qn9R+Bi5df8UdKiEgoRSsZIQqztxkBWA5nioOicvE+qJGj8+PoQKder1wjlZEMUyNhVR4iJTWeVThOywmr5zEChmiZI/GorDBERCsRbbVlrwXPae9dS3HNHo+aTXUjY81uSsjsjLXLgNz7Rl2wgS0NtixEtF9F4SoCEbwfO1LINULpMgpfFxvFVKM3a8L/GVJWU8ePSi5UIWkxCju1GULJ+zkZs8AgDkjqLa1bzQaA1ftszM9ko60RWN6VB3wSgZDz99q8AfgRESFtNlc0JXrM/D3tPgA9w6lyqGSuuJGObK0KXdLlo7IJ9wQUX6pStdR96o0MPZvKbqlqrFoWmTlmMJvSB05ZIb4DFvni8fRxhXcBL/lnhjTfEXRhqZFlkwd/BJUTuvxiyJERoIMfngeZ4qZDClHxV1VoCIwwKi2XmxMPB6Qb8Lx0DFdUgbXUjXvnOSdn6UjmqXzXWRCFQG8QHLMMuRsDXv07B1C1EK25UkaYqk2doiH2a+/fVY0s32iGEdrgrLhnaz5gQk9IZE9EyxFx66YSaeMF7su+hw5k/ChYlW/iQnDAmjU1Z8W6lsrU7Xer8mYIneUBzo9KdBoInwMip07YOqcefbiFTooEzhVqO1KIMIKN8oQkxEGWKwy5PuftW2655Zbh8gOkDHhXCFhSKwAAAABJRU5ErkJggg==","racingbulls":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAB60lEQVR42u1YXY7uIAjVybev0pVJV6ZdGfOiGYbgX9VObq4n6UsrLXCOCDVmY2NjY2PjfwIRAZXh4wWKLT21fTMADuwMIGv7VwH8coT6UWXia0JMwRhzxisoz13B9qrYwhsM+AatY+Y+CDuUC95gIJfZblhru3W/KoDjKbuKPIv4rJCYot3QuN71MvmZ6DhmnAjW2lImIbPRr4rddAbczP1gjHFEVAt+2R5IOBUHLvuDWob98IEWSxvWymittAr71DJg5llXKa0F4JV67isBUMHxasswta1QPgziwPFaUKkkFhzPMqYcaDilPKbMZhjQpOaf9D6KnZ/VPkAugFI7UGidSZOe8g4YDYCEJGhCxn1mvZdBrKhCOCCTKgui+YMZVQgr1WkFmhxvOYmveKCknsYt6dMXz8HYQPsMIPtWU+lsaiWstciO/7MwmY3ODAd717GSkZ4N+ZQJmsZAY7bvxvVBzMKnwobLDDjTZmKvZB+UCzP9E2j1fqQajUoHa5tO9FDIgpbSkT2VH5IQyyAKCQRG/aHJijmDxhjP1hxMckFIB9i92xhzl1j4tAzZMQsQHXZC86XR7452R7QFNkbe1trAnLuT4+l9MfDQMlrmaj/X+6P/lkIma/97KvTDrH78Ncc3NjY2Njb+JXwD2nLWq9o8GcsAAAAASUVORK5CYII=","redbullracing":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABkklEQVR42u2XUZLDIAiGIbP3ijlZyMm0J2Mfqh3KitEk3c3O8M102lQDv4CRADiO4ziO4zjOX4GfMMrMIf8s3wkAABHTraPBzIGZSSxAjlEZv7P4MJih24inE2V2ac1+LOrWws/4lheRn9CA8HIPH63rIzaEb6pFI3ZEzIIGM1eII3by/GCJo4bwaAgfiqIKQsuu9TQLVvTJSFXkNt0RVJHvJRraAgDAZNUYAMR8EO1tMj2+DsztIQDAqoLzU9dOOkeixdaTxchYPOAjHt2oVq3qa2rYpcEFvI1ru1NlDbpf2RrjZWxRJTQb8UmixJZ8/1bx2c1UORxWJTABwIKIqJxKUUEvrpKFOc8rcyIikqjnlO3rz6N16n+pUy0K4XOlg1yFwSQ21FzLEDMHREzZ6UNvZBGwTXy/+RTayn8rM7+6W8wTZOQ3q/3NQmarxJRjyhF+iTCEFd/F57LTnpdMPnWaR/NA73RFM9fbV4mWPV7amo8KuOs7AdUyUhZ3pvv81VdKUSL/65XScRzHcRzHcYb4BvbohivH9uylAAAAAElFTkSuQmCC","williams":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA9klEQVR42u2YSw6DMAxE7YiDkZPVPVm4WbphUUFB/gXaap7EBjxoRmQCgggAAAAAAPwP/RxR6Nt6qLS9d+l6dveYssMb54WIHsrxhZl3AUqi+TbQPDFz/XS+JJkXIpoN87PFPBHVowslybzFDDHzcmZqw3Odzw/gMf/GrDQvw3ahbkOMO4+qU+Wq0lqf2lFpUwJYS+sor7Yf9gDBdd+ipY12YDRi9cvRt2kii3bdf2UAZmaPriR6qDdpUzogUe2dASRDe1eAlqV1dydS4m3xIlov5edL61xCkq29MoCM0F4VoI38IeBhsqxPxUdWdeoAAAAAAICDFy69tR4a6v6UAAAAAElFTkSuQmCC"};


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
  shape: "circuit",
  shapeMorphing: false,
  traceDriver: null,
  traceCollapsed: false,
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
  window.APEX_HELP?.render(state.language);
  document.title = "Apex F1 Driver Ranking";
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
  $('#filters-toggle').title = `${t("filters")} · ${period}`;
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
  const activeMetrics=(state.scoringMetrics||state.dataset.metrics)
    .filter(metric=>enabled[metric.key]!==false&&Number(weights[metric.key])>0)
    .map(metric=>[metric.key,Number(weights[metric.key])]);
  return state.dataset.drivers.map((driver) => {
    let weighted = 0;
    let availableWeight = 0;
    activeMetrics.forEach(([key,weight]) => {
      const value = driver.normalised?.[key];
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
  state.scoringMetrics=state.dataset.metrics.slice();
  state.dataset.metrics=window.APEX_METRIC_ORDER.ordered(state.dataset.metrics);
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
    renderLineUp({animate: true});
    requestComparisonRender();
    animateFilteredView();
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
  $("#filters-toggle").classList.toggle("has-filters", count > 0);
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

function driverPortraitSource(driver) {
  const profile = driver.profile || {};
  const local = profile.portrait_url;
  const localSource = /^\/assets\/drivers\/[a-z0-9-]+\.(?:png|jpg|webp|svg)$/.test(local || "")
    ? new URL(String(local).replace(/^\//, ""), document.baseURI).href
    : "";
  const wikiSource = safeExternalUrl(profile.wiki_thumbnail_url);
  return profile.portrait_source_name === "Generated F1 helmet avatar" && wikiSource ? wikiSource : localSource || safeExternalUrl(driver.headshot_url) || wikiSource;
}

function driverPortrait(driver, detail = false) {
  const source = driverPortraitSource(driver);
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
  return mark ? `<img class="team-mark" src="${TEAM_BADGE_IMAGES[mark]}" alt="${escapeHTML(team)}" title="${escapeHTML(team)}" width="28" height="20">` : `<span class="team-fallback" title="${escapeHTML(team)}">${escapeHTML(team)}</span>`;
}
function driverIdentity(driver) { return nationalityFlag(driver) + teamBadge(driver); }

function driverCell(driver) {
  const expanded = state.expandedDrivers.has(driverKey(driver));
  const profileUrl = safeExternalUrl(driver.profile?.profile_url);
  const name = escapeHTML(driver.full_name);
  const link = profileUrl ? `<a href="${escapeHTML(profileUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(t("openProfile", {name: driver.full_name}))}">${name}<span aria-hidden="true">↗</span></a>` : name;
  return `<div class="driver-cell"><button class="driver-expand" type="button" data-expand-driver="${driverKey(driver)}" aria-expanded="${expanded}" aria-label="${escapeHTML(t(expanded ? "collapseDriver" : "expandDriver", {name: driver.full_name}))}"><span aria-hidden="true">▾</span></button>${driverPortrait(driver)}<span class="driver-info"><strong>${link}</strong><small class="driver-identity">${driverIdentity(driver)}</small></span></div>`;
}

function driverWheel(driver) {
  const keys=['race_starts','championship_points','wins','podiums','finish_rate','average_qualifying_position'];
  const center={x:210,y:145},r=70;
  const point=(i,radius)=>{const angle=-Math.PI/2+i*Math.PI/3;return {x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};};
  const points=keys.map((key,i)=>{const value=driver.normalised?.[key];return value==null||!Number.isFinite(Number(value))?null:point(i,r*Math.max(0,Math.min(1,Number(value))));});
  const polygon=radius=>keys.map((_,i)=>{const p=point(i,radius);return `${p.x},${p.y}`;}).join(' ');
  const path=points.every(Boolean)?`<polygon class="wheel-value" points="${points.map(p=>`${p.x},${p.y}`).join(' ')}"/>`:points.map((p,i)=>{const next=points[(i+1)%6];return p&&next?`<path class="wheel-value" d="M${p.x},${p.y}L${next.x},${next.y}"/>`:'';}).join('');
  return `<div class="driver-wheel" title="${escapeHTML(t('normalizedMeaning'))}"><svg viewBox="0 0 420 290" role="img" aria-label="${escapeHTML(driver.full_name+' · '+t('normalizedMeaning'))}">
    <path class="wheel-rim" d="M80 54Q38 47 28 84L16 196Q17 240 60 243L103 210H317L360 243Q403 240 404 196L392 84Q382 47 340 54L305 76H115Z"/>
    <path class="wheel-grip" d="M67 80Q47 77 44 101L34 190Q32 214 52 218L79 196L88 105Z M353 80Q373 77 376 101L386 190Q388 214 368 218L341 196L332 105Z"/>
    <path class="wheel-trim" d="M95 62H325M102 224H318"/>
    <rect class="wheel-screen" x="112" y="61" width="196" height="170" rx="26"/>
    ${[.25,.5,.75,1].map(scale=>`<polygon class="wheel-grid" points="${polygon(r*scale)}"/>`).join('')}
    ${keys.map((_,i)=>{const p=point(i,r);return `<path class="wheel-axis" d="M210 145L${p.x} ${p.y}"/>`;}).join('')}
    ${path}
    ${keys.map((key,i)=>{const dot=points[i],p=point(i,83);return `${dot?`<circle cx="${dot.x}" cy="${dot.y}" r="3" fill="${metricColor(key)}"/>`:''}<text x="${p.x}" y="${p.y+3}" class="wheel-index" text-anchor="middle" fill="${metricColor(key)}">●</text>`;}).join('')}
    <text x="210" y="284" text-anchor="middle" class="wheel-scale">0–100</text>
  </svg><div class="wheel-readouts">${keys.map((key,i)=>`<div style="--segment:${metricColor(key)};--metric-texture:${window.APEX_METRIC_TEXTURES.css(key)}"><i aria-hidden="true">●</i><span>${escapeHTML(metricName(key))}</span><strong class="wheel-number">${escapeHTML(displayValue(key,driver[key]))}</strong></div>`).join('')}</div></div>`;
}

function driverDetailContent(driver) {
  const profile = driver.profile || {};
  const bio = String(profile.biography || "").trim();
  const shortBio = bio.length > 180 ? `${bio.slice(0, 177).replace(/\s+\S*$/, "")}…` : bio;
  const profileUrl = safeExternalUrl(profile.profile_url);
  const usesWikimedia = profile.portrait_source_name === "Wikimedia" || profile.portrait_source_name === "Generated F1 helmet avatar" && profile.wiki_thumbnail_url;
  const portraitSource = t(usesWikimedia ? "portraitSourceWikimedia" : profile.portrait_source_name === "Generated F1 helmet avatar" ? "portraitSourceGenerated" : "portraitSource");
  const carNumber = driver.driver_number !== null && driver.driver_number !== undefined ? ` / #${escapeHTML(driver.driver_number)}` : "";
  return `<div class="driver-detail-inner" ${state.view === "table" ? `role="cell" aria-colspan="${state.dataset.metrics.length + 3}"` : ""} style="--team:#${escapeHTML((driver.team_colour || "777777").replace("#", ""))}">
      <div class="detail-identity">${driverPortrait(driver, true)}<div><span class="detail-kicker">${carNumber}</span><h4>${escapeHTML(driver.full_name)}</h4><p class="driver-identity">${driverIdentity(driver)}</p></div></div>
      <div class="detail-copy"><p lang="${bio ? "en" : escapeHTML(state.language)}">${escapeHTML(shortBio || t("profileUnavailable"))}</p>${profileUrl ? `<a href="${escapeHTML(profileUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(t("visitProfile"))}</a>` : ""}<small>${bio ? `${escapeHTML(t("profileSource"))} · ` : ""}${escapeHTML(portraitSource)}</small></div>
      ${driverWheel(driver)}
    </div>`;
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
    return `<span class="stack-segment" data-segment-metric="${metric.key}" style="width:${contribution.toFixed(3)}%;--segment:${metricColor(metric.key)};--metric-texture:${window.APEX_METRIC_TEXTURES.css(metric.key)}" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}"></span>`;
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

function metricControl(metric) {
  const key=metric.key, active=state.enabled[key]!==false, value=formatWeight(state.weights[key]||0);
  const bins=state.metricHistograms.get(key)||[], max=Math.max(1,...bins);
  return `<div class="grandstand-card weight-control ${active?'':'is-disabled'}" data-control-metric="${key}" style="--segment:${metricColor(key)};--metric-texture:${window.APEX_METRIC_TEXTURES.css(key)}">
    <div class="grandstand-metric" role="button" tabindex="0" data-align-metric="${key}" aria-label="${escapeHTML(metricName(key))}"><span class="grandstand-label"><span class="grandstand-name" data-metric-hint="${escapeHTML(metricDescription(key).split(/[;；]/)[0])}">${escapeHTML(metricName(key))}</span><input class="metric-enable" type="checkbox" data-toggle-metric="${key}" ${active?'checked':''} aria-label="${escapeHTML(t(active?'disableMetric':'enableMetric',{name:metricName(key)}))}"></span><strong class="metric-share"></strong><span class="grandstand-seats" aria-hidden="true">${bins.map(n=>`<i style="height:${n/max*100}%"></i>`).join('')}</span></div>
    <div class="grandstand-adjust"><input data-weight="${key}" type="range" min="0" max="${WEIGHT_MAX}" step="${WEIGHT_STEP}" value="${value}" aria-label="${escapeHTML(t('weightAria',{name:metricName(key)}))}"><input data-weight-input="${key}" type="number" min="0" max="${WEIGHT_MAX}" step="${WEIGHT_STEP}" inputmode="decimal" value="${value}" aria-label="${escapeHTML(t('weightInputAria',{name:metricName(key)}))}"><button class="weight-reset" data-reset-metric="${key}" title="${escapeHTML(t('resetMetric',{name:metricName(key),value:DEFAULT_METRIC_WEIGHT}))}" aria-label="${escapeHTML(t('resetMetric',{name:metricName(key),value:DEFAULT_METRIC_WEIGHT}))}">${studioIcon('reset')}</button></div></div>`;
}
function renderWeights() {
  if(!state.dataset)return;
  const dock=$('#metric-dock'), signature=state.language+state.dataset.year+state.dataset.metrics.map(m=>m.key).join(',');
  dock.hidden=state.shape==='circuit'&&state.view!=='table';
  if(dock.dataset.signature!==signature){dock.innerHTML=state.dataset.metrics.map(metricControl).join('');dock.dataset.signature=signature;}
  renderWeightValuesOnly();
}
function renderWeightValuesOnly() {
  const total=state.dataset.metrics.reduce((n,m)=>n+(state.enabled[m.key]!==false?Number(state.weights[m.key]||0):0),0)||1;
  document.querySelectorAll('.weight-control').forEach(control=>{
    const key=control.dataset.controlMetric, value=Number(state.weights[key]||0), active=state.enabled[key]!==false;
    const signature=`${state.language}:${value}:${active}:${total}`;
    if(control.dataset.weightSignature===signature)return;
    control.dataset.weightSignature=signature;
    const slider=control.querySelector('[data-weight]'), number=control.querySelector('[data-weight-input]');
    window.APEX_MOTION.slider(slider,value,Number(slider.value),document.activeElement!==slider);
    if(document.activeElement!==number)number.value=formatWeight(value);
    control.classList.toggle('is-disabled',!active);
    const toggle=control.querySelector('[data-toggle-metric]');
    toggle.checked=active;
    toggle.setAttribute('aria-label',t(active?'disableMetric':'enableMetric',{name:metricName(key)}));
    control.querySelector('.metric-share').textContent=active?Math.round(value/total*100)+'%':'—';
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
  renderRankingContext();
  if (!state.dataset) return;
  const table = $("#lineup-table");
  const viewport = $("#lineup-scroll");
  const circuit = state.shape === "circuit" && state.view !== "table";
  table.classList.toggle("circuit-mode", circuit);
  viewport.classList.toggle("is-circuit", circuit);
  updateShapeButton();
  renderWeights();
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
    header = `<div class="stacked-header"><div class="stacked-title"><span>${escapeHTML(t("rankDriver"))}</span><strong tabindex="0" data-tooltip="${escapeHTML(t("scoreMeaning"))}">${escapeHTML(t("scoreColumn"))}</strong><span>0 — 100</span></div></div>`;
    if (circuit) {
      let host = table.querySelector('.race-main-host');
      if (!host) {
        table.innerHTML = '<div class="race-main-host"></div>';
        host = table.querySelector('.race-main-host');
      } else if (table.querySelector('.stacked-header')) table.querySelector('.stacked-header').remove();
      table.classList.add('stacked-mode'); table.style.minWidth = '';
      table.removeAttribute('role'); table.removeAttribute('aria-label');
      window.APEX_TRACK.render(host, setup.id, raceOptions(setup, state.filteredRanked, state.ranked, false, animate));
      if (table.querySelector('.metric-mini-row')) table.querySelector('.metric-mini-row').scrollLeft = legendScrollLeft;
      updateFilterStatus(state.filteredRanked.length, Math.min(8,state.filteredRanked.length));
      state.previousRanks = rankPositions;
      viewport.scrollTop = 0;
      return;
    }
    rows = visibleDrivers.map((driver) => {
      const info = rowInfo(driver);
      return `<div class="lineup-row stacked-row ${info.rank <= 3 ? "podium-row" : ""} ${info.changeClass}" data-driver="${driverKey(driver)}" style="--team:${info.team}"><div class="rank-cell">${driver.availableWeight > 0 ? rankLabel(info.rank) : "—"}</div>${driverCell(driver)}<div class="stack-cell">${stackedBar(driver, state.weights, state.enabled)}</div><div class="stack-score"><strong>${scoreLabel(driver)}</strong><small>${info.change > 0 ? `▲${info.change}` : info.change < 0 ? `▼${-info.change}` : " /100"}</small></div></div>${driverDetail(driver)}`;
    }).join("");
  } else {
    const columns = metrics.map(() => "minmax(112px, 1fr)");
    const template = `44px 230px 100px ${columns.join(" ")}`;
    header = `<div class="lineup-row header" style="grid-template-columns:${template}"><div>#</div><div>${escapeHTML(t("driverTeamColumn"))}</div><div>${escapeHTML(t("scoreColumn"))}</div>${metrics.map((metric) => `<div data-metric="${metric.key}" class="metric-heading ${state.enabled[metric.key] === false ? "metric-disabled" : ""}" style="--segment:${metricColor(metric.key)};--metric-texture:${window.APEX_METRIC_TEXTURES.css(metric.key)}" tabindex="0" data-tooltip="${escapeHTML(metricDescription(metric.key) + " · " + t("normalizedMeaning"))}">${escapeHTML(metricName(metric.key))} · ${escapeHTML(t("weightPrefix"))}${state.enabled[metric.key] === false ? escapeHTML(t("metricOff")) : formatWeight(state.weights[metric.key] || 0)}</div>`).join("")}</div>`;
    rows = visibleDrivers.map((driver) => {
      const info = rowInfo(driver);
      return `<div class="lineup-row ${info.rank <= 3 ? "podium-row" : ""} ${info.changeClass}" data-driver="${driverKey(driver)}" style="grid-template-columns:${template};--team:${info.team}"><div class="rank-cell">${driver.availableWeight > 0 ? rankLabel(info.rank) : "—"}</div>${driverCell(driver)}<div class="score-cell"><strong>${scoreLabel(driver)}</strong><small>${info.change > 0 ? `▲${info.change}` : info.change < 0 ? `▼${-info.change}` : "/100"}</small><span class="score-track"><i style="--score:${(driver.score * 100).toFixed(2)}%"></i></span></div>${metrics.map((metric) => { const normalized = driver.normalised?.[metric.key]; const missing = normalized == null || !Number.isFinite(Number(normalized)); const bar = missing ? 0 : Number(normalized) * 100; return `<div class="metric-cell ${missing ? "is-missing" : ""} ${state.enabled[metric.key] === false ? "metric-disabled" : ""}" data-metric="${metric.key}" style="--segment:${metricColor(metric.key)};--metric-texture:${window.APEX_METRIC_TEXTURES.css(metric.key)}" title="${escapeHTML(metricName(metric.key) + ": " + displayValue(metric.key, driver[metric.key]) + " · " + (missing ? t("missingValue") : t("normalizedValue", {value:bar.toFixed(1)})))}"><span>${displayValue(metric.key, driver[metric.key])}</span><span class="metric-track"><i style="--bar:${bar.toFixed(2)}%;--opacity:1"></i></span></div>`; }).join("")}</div>${driverDetail(driver)}`;
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
  window.APEX_REFRESH_METRIC?.();
  state.previousRanks = rankPositions;
  viewport.scrollTop = scrollTop;
  if (table.querySelector(".metric-mini-row")) table.querySelector(".metric-mini-row").scrollLeft = legendScrollLeft;
  window.APEX_MOTION.animate(viewport, ".lineup-row[data-driver]", "data-driver", before, animate);

}

function updateShapeButton() {
  const button=$('#shape-toggle'),index=state.view==='table'?2:state.shape==='circuit'?0:1;
  const icon=['circuit-view','lineup-view','table-view'][index];
  // Inline these three glyphs: cached external sprites may predate their symbols.
  const glyphs=[
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2.5" y="5" width="19" height="14" rx="7"/><rect x="6" y="8.5" width="12" height="7" rx="3.5"/><path d="M12 5v3.5" stroke-dasharray="1 1"/></g>',
    '<g fill="currentColor"><path d="M3 5h4v3H3zm0 5.5h8v3H3zM3 16h5v3H3z"/><path d="M8 5h13v3H8zm4 5.5h6v3h-6zM9 16h5v3H9z" opacity=".6"/></g>',
    '<g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14.5h18M9 4v16M15 9v11"/></g>'
  ];
  if(button.dataset.viewIcon!==icon){button.innerHTML=`<svg class="studio-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${glyphs[index]}</svg>`;button.dataset.viewIcon=icon;}
  button.setAttribute('aria-label',t('switchViewMode'));button.title=t('switchViewMode');
  button.removeAttribute('aria-pressed');
}
function cycleRankingView(){
  if(state.shapeMorphing)return;
  if(state.overview){toggleShape();return;}
  if(state.view==='table'){setView('stacked');if(state.shape!=='circuit')toggleShape();}
  else if(state.shape==='circuit')toggleShape();
  else{setView('table');animateFilteredView();}
}
function animateFilteredView(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const target=$(state.overview?'#comparison-chart':'#lineup-table');
  state.filterAnimation?.cancel();
  state.filterAnimation=target.animate([{opacity:.25,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.22,.7,.2,1)'});
}

function raceOptions(setup, filtered, ranking, vertical, animate = true) {
  const changes=window.APEX_MOTION.history(setup,ranking,driverKey,state.dataset.year);
  const ranks=new Map(ranking.map((driver,i)=>[driverKey(driver),i+1]));
  const reference=state.scenarios[0];
  const referenceRanks=vertical?new Map(scenarioRanking(reference).map((driver,i)=>[driverKey(driver),driver.availableWeight>0?i+1:null])):null;
  return {
    drivers:filtered, vertical, animate:animate && !state.shapeMorphing && (!state.overview || vertical),
    controlsSignature:state.language+state.dataset.year+state.dataset.metrics.map(m=>m.key).join(","), renderMetric:metricControl, syncControls:renderWeightValuesOnly,
    onFocus:key=>{if(vertical&&state.overview){state.traceDriver=key;renderRankTrace();}},
    comparisonTitle:vertical?t('rankComparedTo',{name:scenarioName(reference)}):'',
    offset:setup.raceOffset || 0, onWindow:offset=>{setup.raceOffset=offset;},
    metrics:state.dataset.metrics.map(m=>({key:m.key,color:metricColor(m.key),name:metricName(m.key),description:metricDescription(m.key),bins:state.metricHistograms.get(m.key)||[],enabled:setup.enabled[m.key]!==false,weight:Number(setup.weights[m.key]||0)})),
    toggleMetric:key=>{
      if(setup.id===state.activeScenario)toggleMetric(key);
      else {setup.enabled[key]=setup.enabled[key]===false;setup.ranking=null;requestComparisonRender();}
    },
    toggleLabel:(key,active)=>t(active?'disableMetric':'enableMetric',{name:metricName(key)}),
    zoomIn:t('circuitZoomIn'), zoomOut:t('circuitZoomOut'), fit:t('circuitFit'),
    escape:escapeHTML, detail:driverDetailContent, flag:nationalityFlag, carHelp:t('carMeaning'),
    label:t('circuitAria'), scoreTitle:t('scoreColumn'), scaleHelp:t('circuitScale'), histogramHelp:t('histogramMeaning'),
    previous:t('previousGrid'), next:t('nextGrid'), empty:t('inverseNoResults'),
    segmentTitle:(driver,key,value)=>t('contributionTooltip',{name:metricName(key),raw:displayValue(key,driver[key]),weight:formatWeight(setup.weights[key]||0),points:(value*100).toFixed(1)}),
    item:(driver,lane)=>({
      driver, lane, key:driverKey(driver), name:driver.full_name, portrait:driverPortraitSource(driver),
      displayName:vertical?(driver.last_name||driver.full_name.split(' ').at(-1)):driver.full_name,
      code:driver.name_acronym || driver.full_name.split(' ').at(-1).slice(0,3).toUpperCase(),
      team:`#${(driver.team_colour||'777777').replace('#','')}`,
      rank:driver.availableWeight>0?ranks.get(driverKey(driver)):'—',
      score:clamp(driver.score,0,1), scoreLabel:scoreLabel(driver), scored:driver.availableWeight>0,
      change:driver.availableWeight>0?changes.get(driverKey(driver))||0:0,
      comparisonChange:vertical&&driver.availableWeight>0&&referenceRanks.get(driverKey(driver))!=null?referenceRanks.get(driverKey(driver))-ranks.get(driverKey(driver)):null,
      values:Object.fromEntries(state.dataset.metrics.map(m=>[m.key,setup.enabled[m.key]===false?0:attributeContribution(driver,m,setup.weights)]))
    })
  };
}

function renderRaceComparison() {
  renderRankTrace();
  const container=$('#comparison-chart');
  const available=comparisonSpace();
  const layout=window.APEX_TRACK.comparisonLayout(state.scenarios.length,available.width,available.height);
  const {height,width,gap,columns,boardWidth,boardHeight,scale}=layout;
  const layoutKey=[state.scenarios.length,available.width,available.height].join(':');
  const changed=state.raceComparisonLayoutKey!==layoutKey;
  const before=new Map([...container.querySelectorAll('.comparison-column')].map(el=>[el.dataset.scenario,el.getBoundingClientRect()]));
  if(changed){state.raceComparisonLayoutKey=layoutKey;state.zoom.compare=scale;container.scrollLeft=0;container.scrollTop=0;}

  const existing=new Map([...container.querySelectorAll('.race-comparison-host')].map(host=>[host.closest('[data-scenario]').dataset.scenario,host]));
  container.innerHTML=`<div class="comparison-board circuit-board" style="width:${boardWidth}px;height:${boardHeight}px;grid-template-columns:repeat(${columns},${width}px)"></div>`;
  const board=container.firstElementChild;board.style.zoom=String(state.zoom.compare);
  state.scenarios.forEach(setup=>{
    const name=scenarioName(setup), column=document.createElement('section');
    column.className='comparison-column';column.dataset.scenario=setup.id;
    column.style.cssText=`height:${height}px;width:${width}px;--scenario:${setup.color};view-transition-name:${setup.id===state.activeScenario?'ranking-focus':'none'}`;
    column.setAttribute('aria-label',t('comparisonRankAria',{name}));
    column.innerHTML=`<div class="comparison-column-head">${studioIcon('flag','column-flag')}<span class="comparison-reference" title="${escapeHTML(t('rankComparedTo',{name:scenarioName(state.scenarios[0])}))}">${setup.id===state.scenarios[0].id?escapeHTML(t('rankReference')):'Δ P'}</span><strong class="scenario-title" data-rename-scenario="${setup.id}" tabindex="0" role="button" title="${escapeHTML(name)}">${escapeHTML(name)}</strong><div class="column-actions"><button data-expand-scenario="${setup.id}" title="${escapeHTML(t('editRanking'))}" aria-label="${escapeHTML(t('editRanking'))}">${escapeHTML(t('editRanking'))}</button><button data-delete-scenario="${setup.id}" title="${escapeHTML(t('scenarioRemove',{name}))}" aria-label="${escapeHTML(t('scenarioRemove',{name}))}">${studioIcon('close')}</button></div></div>`;
    const host=existing.get(setup.id)||document.createElement('div');host.className='race-comparison-host';column.append(host);board.append(column);
    const ranking=scenarioRanking(setup);
    window.APEX_TRACK.render(host,setup.id,raceOptions(setup,filteredRanking(ranking),ranking,true));
  });
  document.querySelector('[data-zoom-controls="compare"] [data-zoom-value]').textContent=`${Math.round(state.zoom.compare*100)}%`;
  if(changed&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    board.querySelectorAll('.comparison-column').forEach(column=>{
      const old=before.get(column.dataset.scenario),now=column.getBoundingClientRect(),zoom=state.zoom.compare;
      column.animate(old?[{transform:`translate(${(old.left-now.left)/zoom}px,${(old.top-now.top)/zoom}px) scale(${old.width/now.width},${old.height/now.height})`},{transform:'none'}]:[{opacity:0,transform:'scale(.92)'},{opacity:1,transform:'none'}],{duration:520,easing:'cubic-bezier(.22,.7,.2,1)'});
    });
  }
  window.APEX_TRACK.prune(state.scenarios.map(s=>s.id));
}

function renderRankTrace() {
  const strip=$('#comparison-rank-trace');
  if(state.shape!=='circuit'||state.scenarios.length<2){strip.hidden=true;return;}
  strip.hidden=false;
  const reference=scenarioRanking(state.scenarios[0]);
  const driver=reference.find(d=>driverKey(d)===state.traceDriver)||filteredRanking(reference)[0];
  if(!driver){strip.hidden=true;strip.traceSignature=null;strip.replaceChildren();return;}
  state.traceDriver=driverKey(driver);
  const key=state.traceDriver;
  const entries=state.scenarios.map(setup=>{
    const list=scenarioRanking(setup),position=list.findIndex(d=>driverKey(d)===key),item=list[position];
    return {id:setup.id,name:scenarioName(setup),rank:item?.availableWeight>0?position+1:null};
  });
  $('#compare').classList.toggle('trace-collapsed',state.traceCollapsed);
  window.APEX_RANK_TRACE.render(strip,{name:driver.full_name,flag:nationalityFlag(driver),key,entries,escape:escapeHTML,collapsed:state.traceCollapsed,labels:{title:t('rankTraceTitle'),bestFirst:t('rankTraceBestFirst'),setup:t('rankTraceSetup'),rank:t('rankTraceRank'),collapse:t('rankTraceCollapse'),reference:t('rankComparedTo',{name:scenarioName(state.scenarios[0])})}});
}

function comparisonSpace() {
  const viewport=$('#comparison-chart'),style=getComputedStyle(viewport);
  return {width:Math.max(100,viewport.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),height:Math.max(100,viewport.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom))};
}

function captureStraightTracks() {
  const snapshots=new Map();
  const collect=(root,setup,selector,attribute)=>{
    if(!root)return;
    const viewport=root.getBoundingClientRect(), ranking=scenarioRanking(setup), drivers=new Map(ranking.map(d=>[driverKey(d),d]));
    const visibleTop=Math.max(viewport.top,root.querySelector('.stacked-header')?.getBoundingClientRect().bottom||viewport.top);
    const rows=[...root.querySelectorAll(selector)].filter(row=>{
      const rect=row.getBoundingClientRect();return rect.bottom>visibleTop+1&&rect.top<viewport.bottom;
    }).slice(0,8);
    rows.forEach(row=>{
      const driver=drivers.get(row.getAttribute(attribute)), rect=row.querySelector('.stack-track')?.getBoundingClientRect();
      if(!driver||!rect)return;
      const values=Object.fromEntries(state.dataset.metrics.map(m=>[m.key,setup.enabled[m.key]===false?0:attributeContribution(driver,m,setup.weights)]));
      snapshots.set(`${setup.id}:${driverKey(driver)}`,{
        points:Array.from({length:window.APEX_TRACK.SAMPLES+1},(_,i)=>({x:rect.left+rect.width*i/window.APEX_TRACK.SAMPLES,y:rect.top+rect.height/2})),
        values,score:driver.score,team:`#${(driver.team_colour||'777777').replace('#','')}`,
        colors:Object.fromEntries(state.dataset.metrics.map(m=>[m.key,metricColor(m.key)]))
      });
    });
    if(rows.length)setup.raceOffset=Math.max(0,filteredRanking(ranking).findIndex(d=>driverKey(d)===rows[0].getAttribute(attribute)));
  };
  if(state.overview)state.scenarios.forEach(setup=>collect(document.querySelector(`[data-scenario="${setup.id}"] .comparison-rows`),setup,'.compare-row','data-flow-driver'));
  else collect($('#lineup-scroll'),state.scenarios.find(s=>s.id===state.activeScenario),'.lineup-row[data-driver]','data-driver');
  return snapshots;
}

function toggleShape() {
  if(state.shapeMorphing||!state.dataset)return;
  if(studioTool==='filters')closeStudioTools({restoreFocus:true});
  const root=$(state.overview?'#compare':'#single-view');
  window.APEX_TRACK.dismiss();
  const wasCircuit=state.shape==='circuit';
  const before=wasCircuit?window.APEX_TRACK.capture(root):captureStraightTracks();
  state.shape=wasCircuit?'lineup':'circuit';
  state.shapeMorphing=true;
  state.visibleLimit=Math.max(INITIAL_RENDER_LIMIT,...state.scenarios.map(s=>(s.raceOffset||0)+8));
  state.scenarios.forEach(s=>s.visibleLimit=Math.max(INITIAL_RENDER_LIMIT,(s.raceOffset||0)+8));
  setView('stacked');
  if(state.overview)renderComparison();
  if(wasCircuit){
    if(state.overview)state.scenarios.forEach(setup=>{const list=document.querySelector(`[data-scenario="${setup.id}"] .comparison-rows`);if(list)list.scrollTop=(setup.raceOffset||0)*32;});
    else $('#lineup-scroll').scrollTop=(state.scenarios.find(s=>s.id===state.activeScenario)?.raceOffset||0)*38;
  }
  const after=wasCircuit?captureStraightTracks():window.APEX_TRACK.capture(root);
  window.APEX_TRACK.morph(before,after,root);
  setTimeout(()=>{state.shapeMorphing=false;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:820);
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
  const scenario = frozenScenario("My F1 Ranking", state.weights, 0, state.enabled);
  state.scenarios = [scenario];
  window.APEX_TRACK.prune([scenario.id]);
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
  if ((!state.comparisonVisible && !force) || state.comparisonTask) return;
  state.comparisonTask=requestAnimationFrame(()=>{
    state.comparisonTask=0;
    if(state.comparisonDirty && renderComparison()!==false)state.comparisonDirty=false;
  });
}

function renderComparison() {
  const container = $('#comparison-chart');
  if (container.querySelector('.scenario-rename')) return false;
  if (!state.dataset || state.scenarios.length < 2) { container.replaceChildren(); return; }
  $('#comparison-rank-trace').hidden=state.shape!=='circuit';
  $('#compare').classList.toggle('has-rank-trace',state.shape==='circuit');
  if (state.shape === 'circuit') return renderRaceComparison();
  if (container.querySelector('.circuit-board')) container.replaceChildren();
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
    return `<section class="comparison-column" data-scenario="${scenario.id}" style="left:${index*(columnWidth+gap)}px;height:${height}px;--scenario:${scenario.color};view-transition-name:${scenario.id===state.activeScenario?'ranking-focus':'none'}" aria-label="${escapeHTML(t('comparisonRankAria',{name}))}"><div class="comparison-column-head">${studioIcon("flag", "column-flag")}<strong class="scenario-title" data-rename-scenario="${scenario.id}" tabindex="0" role="button" title="${escapeHTML(name)}">${escapeHTML(name)}</strong><div class="column-actions"><button data-expand-scenario="${scenario.id}" title="${escapeHTML(t('editRanking'))}" aria-label="${escapeHTML(t('editRanking'))}">${escapeHTML(t("editRanking"))}</button><button data-delete-scenario="${scenario.id}" title="${escapeHTML(t('scenarioRemove',{name}))}" aria-label="${escapeHTML(t('scenarioRemove',{name}))}">${studioIcon("close")}</button></div></div><div class="comparison-rows" tabindex="0" aria-label="${escapeHTML(t('comparisonRankAria',{name}))}" style="height:${listHeight}px">${rows || `<div class="empty-chart">${escapeHTML(t('resultsShown',{shown:0,total:0}))}</div>`}</div></section>`;
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

function renderRankingContext() {
  if(!state.dataset)return;
  let panel=$('#ranking-context');
  if(!panel){panel=document.createElement('div');panel.id='ranking-context';panel.className='ranking-context';$('#single-view').append(panel);}
  const count=state.dataset.metrics.filter(m=>state.enabled[m.key]!==false&&Number(state.weights[m.key])>0).length;
  const signature=[state.language,state.dataset.year,count,state.scenarios.length,state.shape].join('|');
  if(panel.dataset.signature===signature)return;panel.dataset.signature=signature;
  const period=state.dataset.year==='all'?`${availableYears()[0]}–${availableYears().at(-1)}`:state.dataset.year;
  const idle=t('rankingPeriod',{year:period,count});
  panel.innerHTML=`<button class="ranking-method" title="${escapeHTML(t('rankingRule'))}" data-tooltip="${escapeHTML(t('rankingRule'))}" aria-label="${escapeHTML(t('rankingRule'))}">${escapeHTML(t('weightedScore'))}<span aria-hidden="true">ⓘ</span></button><span class="metric-focus-caption" data-idle="${escapeHTML(idle)}" aria-live="polite">${escapeHTML(idle)}</span>${state.scenarios.length>1?`<button id="compare-ready" title="${escapeHTML(t('editThenCompare'))}">${escapeHTML(t('compareRankings',{count:state.scenarios.length}))} →</button>`:''}`;
  panel.querySelector('.ranking-method').addEventListener('click',()=>$('#help-toggle').click());
  panel.querySelector('#compare-ready')?.addEventListener('click',()=>{syncActiveScenario();setOverview(true);});
}

function renderAll({preserveWeightDOM = false} = {}) {
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
  const hadDataset=Boolean(state.dataset);
  const table = $("#lineup-table");
  table.innerHTML = `<div class="loading">${escapeHTML(t("loadSeason", {year}))}</div>`;
  try {
    if (state.staticSource) {
      state.dataset=state.startupLineup&&String(year)===String(state.startupLineup.year)
        ? structuredClone(state.startupLineup) : await window.APEX_STATIC_DATA.lineup(year);
    } else {
    const response = await fetch(`./api/lineup?year=${encodeURIComponent(year)}`);
    if (!response.ok) throw new Error(t("loadSeasonFailed", {year}));
    state.dataset = await response.json();
    }
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
  if(hadDataset)animateFilteredView();
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
  window.APEX_TRACK.dismiss();
  state.view = view;
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
    if (!state.overview || (event.target.closest(".comparison-rows, .race-venue") && !event.ctrlKey)) return;
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
    if (event.target.closest("button, input, a, .comparison-rows, .scenario-title, .race-venue") || (event.button !== 0 && event.button !== 1)) return;
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
  state.traceDriver=null;
  state.scenarios.forEach(setup=>{setup.raceOffset=0;});
  state.search = normaliseSearchText($("#driver-search").value.trim());
  state.filters.team = $("#team-filter").value;
  state.filters.country = $("#country-filter").value;
  state.filters.era = $("#era-filter").value;
  state.filters.achievement = $("#achievement-filter").value;
  state.filters.minStarts = Math.max(0, Math.trunc(Number($("#min-starts-filter").value) || 0));
  state.page = 0;
  state.visibleLimit = INITIAL_RENDER_LIMIT;
  renderLineUp({animate: true});
  requestComparisonRender();
  animateFilteredView();
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
  $("#shape-toggle").addEventListener("click", cycleRankingView);
  $("#reset-filters").addEventListener("click", () => resetDriverFilters());
  ["#team-filter", "#country-filter", "#era-filter", "#achievement-filter"].forEach((selector) => $(selector).addEventListener("change", applyDriverFiltersFromControls));
  $("#min-starts-filter").addEventListener("input", scheduleFilterUpdate);
  let lineupScrollFrame = 0;
  $('#lineup-scroll').addEventListener('scroll', () => {
    if (state.shape === "circuit" && state.view !== "table") return;
    if (lineupScrollFrame) return;
    lineupScrollFrame = requestAnimationFrame(() => {
      lineupScrollFrame = 0;
      const viewport = $('#lineup-scroll');
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 200) loadMoreDrivers();
    });
  }, {passive:true});
  bindViewport("compare");
  setupComparisonObserver();
  document.addEventListener('click',event=>{
    const reset=event.target.closest('[data-reset-metric]');if(reset)resetMetric(reset.dataset.resetMetric);
    const toggle=event.target.closest('#metric-dock [data-toggle-metric]');if(toggle)toggleMetric(toggle.dataset.toggleMetric);
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
  document.addEventListener("error", (event) => {
    if(typeof event.target?.matches!=='function')return;
    if (event.target.matches(".driver-portrait img")) event.target.closest(".driver-portrait").classList.add("no-photo");
    if(event.target.matches('.team-mark')){const label=document.createElement('span');label.className='team-fallback';label.textContent=event.target.alt;label.title=event.target.alt;event.target.replaceWith(label);}
  }, true);
  document.addEventListener("input", (event) => {
    const slider = event.target.closest("[data-weight]");
    if (slider) updateWeight(slider.dataset.weight, slider.value);
    const number = event.target.closest("[data-weight-input]");
    if (number && number.value !== "") updateWeight(number.dataset.weightInput, number.value);
  });
  document.addEventListener("change", (event) => {
    const number = event.target.closest("[data-weight-input]");
    if (!number) return;
    if (!updateWeight(number.dataset.weightInput, number.value)) number.value = formatWeight(state.weights[number.dataset.weightInput] || 0);
    number.value = formatWeight(state.weights[number.dataset.weightInput] || 0);
  });
  document.addEventListener("focusout", (event) => {
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
    addScenarioFromWeights({compare:false});
    openScenario(state.activeScenario);
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
    window.APEX_TRACK.settle();
    state.overview = next;
    $(".studio").classList.toggle("is-comparing", next);
    $(".tool-rail").hidden = false;
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
    state.viewTransition.ready.catch(() => {});
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
function removeScenario(id) {
  if(state.scenarios.length<=1||!state.scenarios.some(s=>s.id===id))return;
  state.scenarios=state.scenarios.filter(s=>s.id!==id);
  if(state.activeScenario===id){
    const next=state.scenarios[0];
    state.activeScenario=next.id;state.weights={...next.weights};state.enabled={...next.enabled};
    state.activePreset=null;state.page=0;$('#setup-name').value=scenarioName(next);
    window.APEX_INVERSE.invalidate();
    renderLineUp({animate:false});
  }
  window.APEX_TRACK.prune(state.scenarios.map(s=>s.id));
  if(state.scenarios.length===1)setOverview(false);
  else requestComparisonRender();
}
function addScenarioFromWeights({compare=true} = {}) {
  const s = frozenScenario(`My F1 Ranking ${state.scenarios.length + 1}`, state.weights, state.scenarios.length, state.enabled);
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
  if(compare)setOverview(true);
}
function fitCanvas() {
  const board = $("#comparison-chart .comparison-board"), viewport = $("#comparison-chart");
  if (!board) return;
  const available=comparisonSpace();
  setZoom("compare", Math.min(available.width / parseFloat(board.style.width), available.height / parseFloat(board.style.height), 1));
  viewport.scrollLeft = 0; viewport.scrollTop = 0;
}
let studioTool = null;
function closeStudioTools({restoreFocus = false} = {}) {
  const previous = studioTool;
  ["filters", "reverse", "code"].forEach(key => {
    $("#"+key+"-panel").hidden = true;
    $("#"+key+"-toggle").setAttribute("aria-expanded", "false");
  });
  studioTool = null;
  if (restoreFocus && previous) $("#"+previous+"-toggle").focus();
}
function positionCodePanel() {
  const panel = $("#code-panel");
  if (innerWidth <= 720) { panel.style.right = ""; panel.style.top = ""; return; }
  const anchor = $("#code-toggle").getBoundingClientRect();
  panel.style.right = `${Math.max(12, innerWidth - anchor.right)}px`;
  panel.style.top = `${anchor.bottom + 8}px`;
}
function openStudioTool(key) {
  window.APEX_TRACK.dismiss();
  closeStudioTools(); studioTool = key;
  $("#"+key+"-panel").hidden = false;
  $("#"+key+"-toggle").setAttribute("aria-expanded", "true");
  if (key === "reverse") {
    if (state.overview) setOverview(false);
  }
  if (key === "code") { positionCodePanel(); renderCode(); $("#code-message").textContent = ""; $("#weight-import").focus(); }
}
function bindStudio() {
  window.addEventListener("resize", () => { if (studioTool === "code") positionCodePanel(); });
  ["filters", "reverse", "code"].forEach(key => {
    $("#"+key+"-toggle").onclick = () => studioTool === key ? closeStudioTools({restoreFocus:true}) : openStudioTool(key);
    $("#"+key+"-close").onclick = () => closeStudioTools({restoreFocus:true});
  });
  document.addEventListener("keydown",e=>{if(e.key==='Escape')closeStudioTools({restoreFocus:true});});
  document.addEventListener("pointerdown", e => {
    if (studioTool === "code" && !e.target.closest("#code-panel,#code-toggle")) closeStudioTools();
  });
  $("#overview-toggle").onclick = () => setOverview(!state.overview);
  $("#setup-name").addEventListener("change", e => {
    const s = state.scenarios.find(s => s.id === state.activeScenario);
    if (s) { s.name = e.target.value.trim() || "My F1 Ranking"; s.presetKey = null; requestComparisonRender(); }
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
      if(state.overview&&state.shape==='circuit')renderRankTrace();
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
    if (remove) removeScenario(remove.dataset.deleteScenario);
  });
  $('#comparison-rank-trace').addEventListener('click',event=>{
    if(event.target.closest('[data-trace-toggle]')){state.traceCollapsed=!state.traceCollapsed;renderComparison();$('#comparison-rank-trace [data-trace-toggle]').focus();return;}
    const target=event.target.closest('[data-locate-scenario]');if(!target)return;
    const setup=state.scenarios.find(s=>s.id===target.dataset.locateScenario);if(!setup)return;
    const ranking=filteredRanking(scenarioRanking(setup)),index=ranking.findIndex(d=>driverKey(d)===target.dataset.locateDriver);
    if(index<0)return;
    setup.raceOffset=window.APEX_TRACK.windowStart(index-3,ranking.length);
    state.traceDriver=target.dataset.locateDriver;renderComparison();window.APEX_TRACK.focusDriver(state.traceDriver);
  });
  $("#fit-canvas").onclick = fitCanvas;
  $("#comparison-chart").addEventListener("keydown", e => {
    if (e.target.closest("button, input, [data-rename-scenario], .comparison-rows, .race-venue")) return;
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
  window.addEventListener("apex-weights-applied", () => { closeStudioTools(); });
  new ResizeObserver(() => { if(state.shapeMorphing)return; if (state.dataset) renderLineUp({animate:false}); if (state.overview) requestComparisonRender(); }).observe($("#lineup-scroll"));
  new ResizeObserver(()=>{if(state.shapeMorphing)return;if(state.overview&&state.dataset)requestComparisonRender();}).observe($('#comparison-chart'));
  const tooltip = $("#metric-tooltip");
  function showTip(target) {
    const compact=target.hasAttribute('data-metric-hint');
    tooltip.classList.toggle('is-metric-hint',compact);
    tooltip.textContent=compact?target.dataset.metricHint:target.dataset.tooltip;tooltip.hidden=false;
    const rect=target.getBoundingClientRect(),box=tooltip.getBoundingClientRect();
    const left=rect.left<innerWidth/2?rect.right+10:rect.left-box.width-10;
    tooltip.style.left=`${Math.max(8,Math.min(left,innerWidth-box.width-8))}px`;
    tooltip.style.top=`${Math.max(8,Math.min(rect.top+(rect.height-box.height)/2,innerHeight-box.height-8))}px`;
  }
  document.addEventListener('mouseover',e=>{const target=e.target.closest('[data-tooltip],[data-metric-hint]');if(target)showTip(target);else tooltip.hidden=true;});
  document.addEventListener('mouseout',e=>{if(e.target.closest('[data-tooltip],[data-metric-hint]')&&!e.relatedTarget?.closest?.('[data-tooltip],[data-metric-hint]'))tooltip.hidden=true;});
  document.addEventListener('focusin',e=>{const target=e.target.closest('[data-tooltip]')||e.target.closest('.grandstand-metric')?.querySelector('[data-metric-hint]');if(target)showTip(target);else tooltip.hidden=true;});
  document.addEventListener("focusout", () => { tooltip.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape") tooltip.hidden = true; });
  let highlightedMetric, highlightedOrigin;
  const highlightMetric = (e,force=false) => {
    let origin=e.target.closest('[data-segment-metric],[data-control-metric],[data-toggle-metric],[data-metric]');
    const aligned=document.querySelector('.race-venue.is-metric-aligned');
    if(aligned){
      const selected=aligned.dataset.alignedMetric;
      origin=aligned.querySelector(`[data-segment-metric="${selected}"]`)||origin;
    }
    const key=origin&&(origin.dataset.segmentMetric||origin.dataset.controlMetric||origin.dataset.toggleMetric||origin.dataset.metric);
    highlightedOrigin=origin;
    const caption=$('.metric-focus-caption');
    if(caption){caption.style.borderLeft=key?`3px solid ${metricColor(key)}`:'';caption.style.paddingLeft=key?'6px':'';}
    if(caption)caption.textContent=key?`${metricName(key)} · ${metricDescription(key)}`:caption.dataset.idle;
    if(key===highlightedMetric&&!force)return;highlightedMetric=key;
    document.querySelectorAll('.stack-segment,.circuit-segment').forEach(el=>el.classList.toggle('metric-dimmed',Boolean(key)&&el.dataset.segmentMetric!==key));
    document.querySelectorAll('[data-metric]').forEach(el=>el.classList.toggle('is-linked-metric',Boolean(key)&&el.dataset.metric===key));
    document.querySelectorAll('.grandstand-card').forEach(el=>{
      const active=Boolean(key)&&el.dataset.controlMetric===key;el.classList.toggle('is-linked-metric',active);
      if(force||!active||!el.getClientRects().length||origin?.closest('.grandstand-card'))return;
      const scroll=el.closest('#metric-dock,.circuit-grandstand');if(!scroll)return;
      const box=el.getBoundingClientRect(),bounds=scroll.getBoundingClientRect(),smooth=!matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(scroll.id==='metric-dock'&&(box.left<bounds.left||box.right>bounds.right))scroll.scrollTo({left:scroll.scrollLeft+box.left-bounds.left-(bounds.width-box.width)/2,behavior:smooth?'smooth':'instant'});
      else if(scroll.id!=='metric-dock'&&(box.top<bounds.top||box.bottom>bounds.bottom))scroll.scrollTo({top:scroll.scrollTop+box.top-bounds.top-(bounds.height-box.height)/2,behavior:smooth?'smooth':'instant'});
    });
  };
  window.APEX_REFRESH_METRIC=()=>highlightMetric({target:highlightedOrigin||document.body},true);
  let metricRefreshFrame=0;
  const metricObserver=new MutationObserver(records=>{
    if(metricRefreshFrame||!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))return;
    metricRefreshFrame=requestAnimationFrame(()=>{metricRefreshFrame=0;window.APEX_REFRESH_METRIC();});
  });
  ['#lineup-table','#comparison-chart','#metric-dock'].forEach(selector=>metricObserver.observe($(selector),{childList:true,subtree:true}));
  document.addEventListener('mouseover',highlightMetric);
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.grandstand-metric')){e.preventDefault();e.target.click();}});
  document.addEventListener('click',e=>{
    const stand=e.target.closest('.race-venue .grandstand-card');
    if(stand&&!e.target.closest('input,button')){const key=stand.dataset.controlMetric;window.APEX_TRACK.alignMetric(stand.closest('.race-venue').dataset.alignedMetric===key?null:key);highlightMetric(e,true);return;}
    const segment=e.target.closest('.circuit-segment[data-segment-metric]');
    if(segment){window.APEX_TRACK.alignMetric(segment.dataset.segmentMetric);highlightMetric(e,true);return;}
    if(!e.target.closest('button,input,select,textarea,a,[role="button"],.grandstand-card,.circuit-profile')){
      window.APEX_TRACK.alignMetric(null);highlightMetric(e,true);
    }
  });
  document.addEventListener('focusin',e=>{if(!e.target.matches('#lineup-scroll,#comparison-chart'))highlightMetric(e);});
  document.addEventListener('mouseout',e=>{if(!e.relatedTarget)highlightMetric({target:document.body});});

}

async function initialise() {
  applyLanguage(state.language);
  bindEvents();
  window.APEX_METRIC_ORDER.bind({getMetrics:()=>state.dataset?.metrics||[],commit:keys=>{
    const byKey=new Map(state.dataset.metrics.map(m=>[m.key,m]));
    state.dataset.metrics=keys.map(key=>byKey.get(key));
    renderLineUp();requestComparisonRender();
  }});
  try {
    try {
      if(document.documentElement.dataset.source==='static') {
        const startup=await window.APEX_STATIC_DATA.bootstrap();
        state.staticSource=true;state.startupLineup=startup.lineup;state.metadata=startup.metadata;
      } else {
      const response = await fetch("./api/seasons");
      if (!response.ok) throw new Error(t("fetchUnavailable"));
      state.metadata = await response.json();
      }
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
