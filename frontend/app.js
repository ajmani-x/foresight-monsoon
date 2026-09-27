// Foresight dashboard — real backend data throughout. Where the original
// design mockup showed a number with no real source behind it (live local
// weather, historical-vs-predicted rainfall, per-click explainability
// percentages), this either wires a real free data source (Open-Meteo for
// weather) or repurposes the panel to show something we actually compute
// (weekly probability trend instead of fake rainfall bars, real global
// feature importance instead of invented "why" percentages).

const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:8000/api'
  : 'https://foresight-monsoon.onrender.com/api';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

async function api(path) {
  const r = await fetch(API_BASE + path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

// ---------- rain background + nav (unchanged mechanics) ----------
for (let i = 0; i < 100; i++) {
  const d = document.createElement('i');
  d.className = 'drop';
  d.style.left = Math.random() * 100 + '%';
  d.style.animationDuration = (0.7 + Math.random() * 1.5) + 's';
  d.style.animationDelay = (-Math.random() * 2) + 's';
  $('#rain').appendChild(d);
}
const PAGE_NAMES = { overview: 'Overview', risk: 'Risk Map', forecast: 'Forecast', advisory: 'Advisory', analytics: 'Analytics', alerts: 'Alert Center', farmer: 'Farmer Mode' };
function show(n) {
  $$('.page').forEach((x) => x.classList.toggle('active', x.id === n));
  $$('.nav').forEach((x) => x.classList.toggle('active', x.dataset.page === n));
  $('#title').textContent = PAGE_NAMES[n];
  window.scrollTo(0, 0);
  // Chart.js computes canvas size at creation/update time -- a chart
  // updated while its page is display:none (any page but the one
  // currently active) gets stuck with wrong dimensions. Since the
  // district/horizon filters are global and can refresh charts on any
  // tab, re-measure every chart whenever a tab becomes visible again.
  [outlookChartInstance, forecastChartInstance, rainChartInstance].forEach((c) => c?.resize());
  if (n === 'risk' && riskMapInstance) setTimeout(() => riskMapInstance.invalidateSize(), 100);
}
$$('.nav').forEach((b) => (b.onclick = () => show(b.dataset.page)));

// ---------- global state ----------
let DISTRICTS = [];
let SNAPSHOT = [];
let FI = null; // real feature importance, loaded once
let selectedDistrictId = null;
let horizonDays = 30;
let activeMapMetric = 'onset_probability';
let activeOutlookMetric = 'Onset';
let activeFiTarget = 'onset';
let currentForecast = null, currentAdvisory = null, currentFarmers = null;
let overviewMap, riskMapInstance;
let overviewMarkers = {}, riskMarkers = {};
let outlookChartInstance, forecastChartInstance, rainChartInstance;

const FEATURE_LABELS = { lat: 'Latitude', lon: 'Longitude', coastal: 'Coastal proximity', dry_belt: 'Dry-belt region', oni: 'ENSO (ONI)', dmi: 'IOD (DMI)', mjo_amplitude: 'MJO amplitude', mjo_phase: 'MJO phase', month: 'Month / season' };
const CROP_EMOJI = { Rice: '🌾', Paddy: '🌾', Wheat: '🌾', 'Wheat/Paddy': '🌾', Maize: '🌽', Cotton: '♡', Sugarcane: '🎋', Groundnut: '◌', Grapes: '🍇', Soybean: '🌱', Tea: '🍃', Coffee: '☕', Jute: '🌿', Bajra: '🌾', Jowar: '🌾', 'Tur Dal': '🌱', Tapioca: '🥔' };
const SEV_LABEL = { info: 'Routine', caution: 'Caution', warning: 'Moderate Risk', critical: 'High Risk' };
const SEV_ICON = { critical: '▲', warning: '▲', caution: '●', info: '↟' };
// Real, fixed test-set numbers from ml/README.md (genuine time-based holdout,
// 2015-2023) -- not fetched live since these don't change per-request; kept
// here as documented constants, honestly labeled, not invented.
const R2_SCORES = { onset: { r2: 0.41, mae: 0.180 }, break: { r2: 0.41, mae: 0.178 }, heavy: { r2: 0.09, mae: 0.016 } };

function pct(x) { return Math.round(x * 100) + '%'; }
function cropEmoji(crop) { return CROP_EMOJI[crop] || '🌱'; }
function metricLabel(m) { return m === 'onset_probability' ? 'Onset' : m === 'break_probability' ? 'Dry Spell' : 'Heavy Rain'; }
function riskColor(p) { return p >= 71 ? '#ef5262' : p >= 41 ? '#f0bd42' : '#35d69a'; }
function district(id) { return DISTRICTS.find((d) => d.district_id === id); }
function snapshotFor(id) { return SNAPSHOT.find((d) => d.district_id === id); }
function confLabel(c) { return c >= 0.75 ? 'High Confidence' : c >= 0.5 ? 'Moderate Confidence' : 'Low Confidence'; }

// ---------- boot ----------
async function boot() {
  $('#todayDate').textContent = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    [DISTRICTS, SNAPSHOT] = await Promise.all([api('/districts'), api('/districts/map')]);
    FI = (await api('/model/feature-importance')).targets;
    $('#statusLine').textContent = '● AI services online';
  } catch (e) {
    $('#statusLine').textContent = '● backend unreachable';
    console.error(e);
    return;
  }

  populateFilters();
  selectedDistrictId = DISTRICTS[0].district_id;
  initMaps();
  plotMarkers();
  await refreshAll();
  renderAnalyticsR2();
  renderFeatureImportancePage();
  await refreshAlerts();
}

function populateFilters() {
  const states = [...new Set(DISTRICTS.map((d) => d.state))].sort();
  $('#stateSelect').innerHTML = states.map((s) => `<option value="${s}">${s}</option>`).join('');
  $('#stateSelect').value = DISTRICTS[0].state;
  populateDistrictOptions(DISTRICTS[0].state);
  $('#stateSelect').onchange = () => {
    populateDistrictOptions($('#stateSelect').value);
    onDistrictChange($('#districtSelect').value);
  };
  $('#districtSelect').onchange = () => onDistrictChange($('#districtSelect').value);
}
function populateDistrictOptions(state) {
  const list = DISTRICTS.filter((d) => d.state === state);
  $('#districtSelect').innerHTML = list.map((d) => `<option value="${d.district_id}">${d.name}</option>`).join('');
}
async function onDistrictChange(id) {
  selectedDistrictId = id;
  await refreshAll();
}

$$('.range').forEach((b) => (b.onclick = () => {
  $$('.range').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  horizonDays = +b.dataset.days;
  refreshAll();
}));

// ---------- maps ----------
function initMaps() {
  overviewMap = L.map('map', { attributionControl: false }).setView([22.9, 79.5], 4.3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(overviewMap);
  riskMapInstance = L.map('riskMap', { attributionControl: false }).setView([22.9, 79.5], 4.6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(riskMapInstance);
}

function plotMarkers() {
  [[overviewMap, overviewMarkers], [riskMapInstance, riskMarkers]].forEach(([map, store]) => {
    Object.values(store).forEach((m) => map.removeLayer(m));
    SNAPSHOT.forEach((d) => {
      const p = Math.round(d[activeMapMetric] * 100);
      const marker = L.circleMarker([d.lat, d.lon], { radius: 6, color: '#d9f7ff', weight: 1, fillColor: riskColor(p), fillOpacity: 0.75 })
        .addTo(map)
        .bindPopup(`<b>${d.district_name}</b><br>Onset ${Math.round(d.onset_probability * 100)}% · Dry Spell ${Math.round(d.break_probability * 100)}% · Heavy ${Math.round(d.heavy_rain_probability * 100)}%`);
      marker.on('click', () => selectDistrict(d.district_id));
      store[d.district_id] = marker;
    });
  });
}

function selectDistrict(id) {
  const d = district(id);
  $('#stateSelect').value = d.state;
  populateDistrictOptions(d.state);
  $('#districtSelect').value = id;
  selectedDistrictId = id;
  refreshAll();
}

$$('#mapTabs button, #riskMapTabs button').forEach((b) => (b.onclick = () => {
  activeMapMetric = b.dataset.metric;
  $$('#mapTabs button, #riskMapTabs button').forEach((x) => x.classList.toggle('sel', x.dataset.metric === activeMapMetric));
  plotMarkers();
  renderRiskSelectedPanel();
}));

$$('#outlookSwitch button').forEach((b) => (b.onclick = () => {
  $$('#outlookSwitch button').forEach((x) => x.classList.remove('sel'));
  b.classList.add('sel');
  activeOutlookMetric = b.dataset.metric;
  renderOutlookChart();
}));

$$('#fiSwitch button').forEach((b) => (b.onclick = () => {
  $$('#fiSwitch button').forEach((x) => x.classList.remove('sel'));
  b.classList.add('sel');
  activeFiTarget = b.dataset.target;
  renderFeatureImportancePage();
}));

$('#shareBtn').onclick = () => {
  navigator.clipboard?.writeText(location.href).then(() => alert('Dashboard link copied to clipboard.'));
};
$('#sendAdvisoryBtn').onclick = () => {
  alert("Advisories are delivered automatically via our WhatsApp bot when a farmer registers — this admin dashboard doesn't send messages to arbitrary numbers directly.");
};

// ---------- data refresh ----------
async function refreshAll() {
  try {
    const [forecast, advisory, farmers] = await Promise.all([
      api(`/forecast/${selectedDistrictId}?horizon_days=${horizonDays}`),
      api(`/advisory/${selectedDistrictId}`),
      api(`/districts/${selectedDistrictId}/farmers`).catch(() => ({ farmers: [], radius_km: 60 })),
    ]);
    currentForecast = forecast;
    currentAdvisory = advisory;
    currentFarmers = farmers;
  } catch (e) {
    console.error(e);
    return;
  }

  renderMetrics();
  renderOutlookChart();
  renderDrivers();
  renderOverviewFI();
  renderWeather(district(selectedDistrictId));
  renderWeeks();
  renderCropAdvisoryMini();
  renderProbTable();
  renderConfidence();
  renderRiskSelectedPanel();
  renderForecastPage();
  renderAdvisoryPage();
  renderFarmerMode();
}

// ---------- Overview: metrics ----------
function renderMetrics() {
  const c = currentForecast.current;
  $('#m-onset').textContent = pct(c.onset_probability);
  $('#m-break').textContent = pct(c.break_probability);
  $('#m-heavy').textContent = pct(c.heavy_rain_probability);
  const label = confLabel(c.confidence);
  $('#m-onset-conf').textContent = label;
  $('#m-break-conf').textContent = label;
  $('#m-heavy-conf').textContent = label;
  $('#m-onset-note').textContent = `${currentForecast.district_name}, ${currentForecast.state}`;
  $('#m-break-note').textContent = `Next ${horizonDays} days`;
  $('#m-heavy-note').textContent = 'Real ensemble output';
}

// ---------- Overview: outlook chart ----------
function renderOutlookChart() {
  const key = activeOutlookMetric === 'Onset' ? 'onset_probability' : activeOutlookMetric === 'Break' ? 'break_probability' : 'heavy_rain_probability';
  const color = activeOutlookMetric === 'Onset' ? '#38bdf8' : activeOutlookMetric === 'Break' ? '#fb5b7c' : '#fbbf24';
  const labels = currentForecast.timeline.map((t) => t.date.slice(5));
  const data = currentForecast.timeline.map((t) => Math.round(t[key] * 100));
  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#12354a' }, ticks: { color: '#7895a5', font: { size: 8 } } }, y: { min: 0, max: 100, grid: { color: '#12354a' }, ticks: { color: '#7895a5', font: { size: 8 }, callback: (v) => v + '%' } } } };
  outlookChartInstance?.destroy();
  outlookChartInstance = new Chart($('#outlook'), { type: 'line', data: { labels, datasets: [{ data, borderColor: color, backgroundColor: color + '33', fill: true, tension: 0.35, pointRadius: 0 }] }, options: opts });
}

// ---------- Overview: climate drivers (real values, simple honest heuristic for the influence label) ----------
function influence(kind, idx) {
  if (kind === 'enso') return Math.abs(idx.value) >= 1.5 ? 'High Influence' : Math.abs(idx.value) >= 0.5 ? 'Moderate Influence' : 'Low Influence';
  if (kind === 'iod') return Math.abs(idx.value) >= 0.6 ? 'High Influence' : Math.abs(idx.value) >= 0.4 ? 'Moderate Influence' : 'Low Influence';
  return idx.amplitude >= 1.5 ? 'High Influence' : idx.amplitude >= 0.8 ? 'Moderate Influence' : 'Low Influence';
}
function renderDrivers() {
  const c = currentForecast.climate_context;
  $('#driversRow').innerHTML = `
    <b>⊕</b><span>ENSO<small>${c.enso.phase}</small></span><em>${influence('enso', c.enso)}</em>
    <b>◉</b><span>IOD<small>${c.iod.phase}</small></span><em>${influence('iod', c.iod)}</em>
    <b>◈</b><span>MJO<small>Phase ${c.mjo.phase}</small></span><em>${influence('mjo', c.mjo)}</em>`;
}

// ---------- real feature importance (loaded once, reused across pages) ----------
function barText(f) {
  const p = Math.round(f.importance * 100);
  const filled = Math.round((p / 100) * 7);
  return `${FEATURE_LABELS[f.feature] || f.feature}　${'█'.repeat(filled)}${'░'.repeat(7 - filled)}　${p}%`;
}
function renderOverviewFI() {
  if (!FI) return;
  FI.onset.slice(0, 3).forEach((f, i) => { $('#fi-' + (i + 1)).textContent = barText(f); });
}
function renderFeatureImportancePage() {
  if (!FI) return;
  $('#fiFeatures').innerHTML = FI[activeFiTarget].map((f) => {
    const p = Math.round(f.importance * 100);
    return `<p class="feature">${FEATURE_LABELS[f.feature] || f.feature} <i><u style="width:${p * 2}%"></u></i><b>${p}%</b></p>`;
  }).join('');
}
function renderAnalyticsR2() {
  $('#r2Scores').innerHTML = Object.entries(R2_SCORES).map(([k, v]) => {
    const p = Math.round(v.r2 * 100);
    const label = k === 'onset' ? 'Onset' : k === 'break' ? 'Dry Spell' : 'Heavy Rain';
    return `<p class="score">${label} <b>${v.r2.toFixed(2)}</b><i><u style="width:${p}%"></u></i></p>`;
  }).join('');
}

// ---------- live weather (Open-Meteo, free, real) ----------
async function renderWeather(d) {
  $('#weatherTitle').textContent = '⌂ Weather at ' + d.name;
  $('#fLocation').textContent = `📍 ${d.name}, ${d.state}`;
  try {
    const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&hourly=temperature_2m,precipitation&timezone=auto`).then((r) => r.json());
    const cur = w.current;
    const cond = cur.precipitation > 0.2 ? 'Rain' : 'Clear';
    $('#weatherTemp').textContent = Math.round(cur.temperature_2m) + '°C';
    $('#weatherCond').textContent = cond;
    $('#weatherHumidity').textContent = cur.relative_humidity_2m + '%';
    $('#weatherWind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
    $('#weatherPrecip').textContent = cur.precipitation + ' mm';
    $('#todayTemp').textContent = Math.round(cur.temperature_2m) + '°C';
    $('#todayCond').textContent = cond;
    $('#fTemp').innerHTML = `${Math.round(cur.temperature_2m)}°C<small>${cond === 'Rain' ? 'आज बारिश' : 'आज साफ मौसम'}</small>`;

    const nowIdx = Math.max(0, w.hourly.time.findIndex((t) => new Date(t) >= new Date()));
    const hrs = [];
    for (let i = 0; i < 4; i++) {
      const idx = nowIdx + i;
      if (!w.hourly.time[idx]) break;
      const label = i === 0 ? 'Now' : new Date(w.hourly.time[idx]).toLocaleTimeString('en-IN', { hour: 'numeric' });
      hrs.push(`<span>${label}<big>${w.hourly.precipitation[idx] > 0.2 ? '🌧' : '☁'}</big><b>${Math.round(w.hourly.temperature_2m[idx])}°</b></span>`);
    }
    $('#hoursRow').innerHTML = hrs.join('');
  } catch (e) {
    $('#weatherCond').textContent = 'Unavailable';
    $('#todayCond').textContent = 'Weather unavailable';
    console.error(e);
  }
}

// ---------- weekly aggregation (real, from the real 30-day timeline) ----------
function weeklyBuckets() {
  const tl = currentForecast.timeline;
  const weeks = [];
  for (let w = 0; w < 4; w++) {
    const chunk = tl.filter((t) => t.day_offset >= w * 7 && t.day_offset < (w + 1) * 7);
    if (!chunk.length) continue;
    const avg = (k) => chunk.reduce((s, t) => s + t[k], 0) / chunk.length;
    weeks.push({ label: `Week ${w + 1}`, range: `${chunk[0].date.slice(5)}–${chunk[chunk.length - 1].date.slice(5)}`, onset: avg('onset_probability'), brk: avg('break_probability'), heavy: avg('heavy_rain_probability') });
  }
  return weeks;
}
function weekStatus(wk) {
  if (wk.brk >= 0.55) return 'High Risk';
  if (wk.heavy >= 0.55) return 'Heavy Rain Risk';
  if (wk.onset >= 0.6) return 'Favourable';
  return 'Monitoring';
}
function renderWeeks() {
  $('#weeksRow').innerHTML = weeklyBuckets().map((wk) => `<div>${wk.label}<small>${wk.range}</small><em>${weekStatus(wk)}</em><b>${Math.round(wk.onset * 100)}%</b></div>`).join('');
}
function renderProbTable() {
  const weeks = weeklyBuckets();
  const rows = weeks.map((wk) => `<tr><td>${wk.label}</td><td>${Math.round(wk.onset * 100)}%</td><td>${Math.round(wk.brk * 100)}%</td><td>${Math.round(wk.heavy * 100)}%</td></tr>`).join('');
  $('#probTable').innerHTML = '<tr><th>Week</th><th>Onset</th><th>Break</th><th>Heavy</th></tr>' + rows;
  const worst = weeks.reduce((a, b) => (b.brk > a.brk ? b : a), weeks[0]);
  if (worst && worst.brk >= 0.55) {
    $('#probWarn').style.display = 'block';
    $('#probWarn').textContent = `⚠ ${worst.label}: elevated break-monsoon (dry spell) probability detected.`;
  } else {
    $('#probWarn').style.display = 'none';
  }
}

function renderConfidence() {
  const conf = currentForecast.current.confidence;
  $('#confVal').textContent = pct(conf);
  $('#confBar').style.width = Math.round(conf * 100) + '%';
}

function renderRiskSelectedPanel() {
  const snap = snapshotFor(selectedDistrictId);
  const d = district(selectedDistrictId);
  if (!snap || !currentAdvisory) return;
  const p = Math.round(snap[activeMapMetric] * 100);
  $('#selectedPanel').innerHTML = `
    <small>SELECTED DISTRICT</small>
    <h2>${d.name}</h2>
    <strong>${p}%</strong><em>${metricLabel(activeMapMetric)} probability</em>
    <hr>
    <p>Onset <b>${Math.round(snap.onset_probability * 100)}%</b></p>
    <p>Dry Spell <b>${Math.round(snap.break_probability * 100)}%</b></p>
    <p>Heavy Rain <b>${Math.round(snap.heavy_rain_probability * 100)}%</b></p>
    <hr>
    <h3>What it means</h3>
    <p>${currentAdvisory.advisory.message_en}</p>
    <button class="primary" onclick="show('advisory')">Open Crop Advisory →</button>`;
}

function renderForecastPage() {
  const c = currentForecast.current;
  $('#forecastHero').innerHTML = `<div>MONSOON ONSET<strong>${pct(c.onset_probability)}</strong><em>${confLabel(c.confidence)}</em><p>Real model output for ${currentForecast.district_name}</p></div><span>🌧️</span>`;
  $('#forecastAsOf').textContent = '● climate data as of ' + currentForecast.climate_context.as_of;

  const labels = currentForecast.timeline.map((t) => t.date.slice(5));
  const opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#9bb1bd', font: { size: 8 } } } }, scales: { x: { grid: { color: '#12354a' }, ticks: { color: '#7895a5', font: { size: 8 } } }, y: { min: 0, max: 100, grid: { color: '#12354a' }, ticks: { color: '#7895a5', font: { size: 8 }, callback: (v) => v + '%' } } } };
  forecastChartInstance?.destroy();
  forecastChartInstance = new Chart($('#forecastChart'), {
    type: 'line',
    data: { labels, datasets: [
      { label: 'Onset', data: currentForecast.timeline.map((t) => Math.round(t.onset_probability * 100)), borderColor: '#38bdf8', backgroundColor: '#38bdf822', fill: false, tension: 0.35, pointRadius: 0 },
      { label: 'Break', data: currentForecast.timeline.map((t) => Math.round(t.break_probability * 100)), borderColor: '#fb5b7c', backgroundColor: '#fb5b7c22', fill: false, tension: 0.35, pointRadius: 0 },
      { label: 'Heavy', data: currentForecast.timeline.map((t) => Math.round(t.heavy_rain_probability * 100)), borderColor: '#fbbf24', backgroundColor: '#fbbf2422', fill: false, tension: 0.35, pointRadius: 0 },
    ] },
    options: opts,
  });

  $('#confRing').innerHTML = `${pct(c.confidence)}<small>CONFIDENCE</small>`;
  $('#confDesc').textContent = 'Confidence decays with forecast horizon in a documented way — not false precision on a 30-day-out prediction. See the project README.';
  $('#confOnset').textContent = pct(c.onset_probability);
  $('#confBreak').textContent = pct(c.break_probability);
  $('#confHeavy').textContent = pct(c.heavy_rain_probability);

  const weeks = weeklyBuckets();
  rainChartInstance?.destroy();
  rainChartInstance = new Chart($('#rainChart'), {
    type: 'bar',
    data: { labels: weeks.map((w) => w.label), datasets: [
      { label: 'Onset %', data: weeks.map((w) => Math.round(w.onset * 100)), backgroundColor: '#38bdf8' },
      { label: 'Break %', data: weeks.map((w) => Math.round(w.brk * 100)), backgroundColor: '#fb5b7c' },
    ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#9bb1bd', font: { size: 8 } } } }, scales: { x: { ticks: { color: '#7895a4' } }, y: { ticks: { color: '#7895a4' }, grid: { color: '#12354a' } } } },
  });
}

function renderCropAdvisoryMini() {
  const d = district(selectedDistrictId);
  const a = currentAdvisory.advisory;
  $('#cropChip').innerHTML = `<span style="display:inline-block;background:#092338;border:1px solid #27a9a3;color:#fff;padding:5px 10px;border-radius:5px;font-size:8px">${cropEmoji(d.primary_crop)} ${d.primary_crop}</span>`;
  $('#overviewAdvice').innerHTML = `<div>${cropEmoji(d.primary_crop)}</div><section><b>${d.primary_crop} <i>${SEV_LABEL[a.severity] || a.severity}</i></b><p>${a.message_en}</p><ul><li>${a.action_en}</li></ul></section>`;
}

function renderAdvisoryPage() {
  const d = district(selectedDistrictId);
  const a = currentAdvisory.advisory;
  $('#advisoryCropChip').innerHTML = `<span style="display:inline-block;background:#0a3036;border:1px solid #29b89b;color:#fff;padding:6px 10px;border-radius:7px;font-size:9px">${cropEmoji(d.primary_crop)} ${d.primary_crop}</span>`;
  $('#advisoryStage').textContent = `Based on the typical sowing calendar for ${d.primary_crop} — this district's real registered crop, not a hypothetical selection.`;
  $('#adviceMain').innerHTML = `
    <div class="advice-banner">${cropEmoji(d.primary_crop)}<div><small>${d.primary_crop.toUpperCase()} • ${currentAdvisory.district_name}</small><h2>${a.title_en}</h2><p>${a.message_en}</p></div></div>
    <h3>Recommended action</h3>
    <div class="actions"><div><b>01</b><span><strong>${a.action_en}</strong></span></div></div>
    <div class="why"><b>Why this advice?</b><p>Rule-based: current onset/break/heavy-rain probabilities + a crop-stage heuristic, matched against a documented threshold table — not a black box. See <code>advisory_engine.py</code>.</p></div>`;
}

function renderFarmerMode() {
  const c = currentForecast.current;
  const a = currentAdvisory.advisory;
  $('#fOnset').textContent = pct(c.onset_probability);
  $('#fBreak').textContent = pct(c.break_probability);
  $('#fAdvice').textContent = `${a.message_hi} ${a.action_hi}`;
  const n = currentFarmers?.farmers?.length || 0;
  $('#fFarmerCount').textContent = n > 0
    ? `${n} किसान इस क्षेत्र में हमारे WhatsApp बॉट से पंजीकृत हैं`
    : 'अभी तक इस क्षेत्र में कोई किसान पंजीकृत नहीं';
}

// ---------- Alert Center ----------
async function refreshAlerts() {
  try {
    const feed = await api('/advisory?limit=20');
    const strip = feed.slice(0, 3).map((item) => `<span>${SEV_ICON[item.advisory.severity] || '●'} <strong>${SEV_LABEL[item.advisory.severity] || item.advisory.severity}</strong> ${item.district_name}: ${item.advisory.title_en}</span>`).join('');
    $('#alertsStrip').innerHTML = `<b>♧ Recent Alerts <i>${feed.length}</i></b>${strip}`;
    $('#alertList').innerHTML = feed.map((item) => {
      const cls = item.advisory.severity === 'critical' || item.advisory.severity === 'warning' ? 'high' : item.advisory.severity === 'caution' ? 'watch' : 'info';
      return `<article class="alert ${cls}"><b>${SEV_ICON[item.advisory.severity] || '●'} ${(SEV_LABEL[item.advisory.severity] || item.advisory.severity).toUpperCase()}</b><h3>${item.advisory.title_en}</h3><p>${item.district_name}, ${item.state} • ${item.advisory.message_en}</p></article>`;
    }).join('');
  } catch (e) {
    console.error(e);
  }
}

boot();
