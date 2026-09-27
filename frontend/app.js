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

// ---------- nav ----------
function show(n) {
  $$('.page').forEach((x) => x.classList.toggle('active', x.id === n));
  $$('.nav').forEach((x) => x.classList.toggle('active', x.dataset.page === n));
  currentPage = n;
  $('#title').textContent = t('page_' + n);
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
let currentLang = 'en';
let currentPage = 'overview';
let lastAlertFeed = null;

const FEATURE_LABELS = {
  en: { lat: 'Latitude', lon: 'Longitude', coastal: 'Coastal proximity', dry_belt: 'Dry-belt region', oni: 'ENSO (ONI)', dmi: 'IOD (DMI)', mjo_amplitude: 'MJO amplitude', mjo_phase: 'MJO phase', month: 'Month / season' },
  hi: { lat: 'अक्षांश', lon: 'देशांतर', coastal: 'तटीय निकटता', dry_belt: 'सूखा-क्षेत्र', oni: 'ENSO (ONI)', dmi: 'IOD (DMI)', mjo_amplitude: 'MJO तीव्रता', mjo_phase: 'MJO चरण', month: 'महीना / मौसम' },
};
const CROP_EMOJI = { Rice: '🌾', Paddy: '🌾', Wheat: '🌾', 'Wheat/Paddy': '🌾', Maize: '🌽', Cotton: '♡', Sugarcane: '🎋', Groundnut: '◌', Grapes: '🍇', Soybean: '🌱', Tea: '🍃', Coffee: '☕', Jute: '🌿', Bajra: '🌾', Jowar: '🌾', 'Tur Dal': '🌱', Tapioca: '🥔' };
const SEV_LABEL = {
  en: { info: 'Routine', caution: 'Caution', warning: 'Moderate Risk', critical: 'High Risk' },
  hi: { info: 'सामान्य', caution: 'सावधानी', warning: 'मध्यम जोखिम', critical: 'उच्च जोखिम' },
};
const SEV_ICON = { critical: '▲', warning: '▲', caution: '●', info: '↟' };
// Real, fixed test-set numbers from ml/README.md (genuine time-based holdout,
// 2015-2023) -- not fetched live since these don't change per-request; kept
// here as documented constants, honestly labeled, not invented.
const R2_SCORES = { onset: { r2: 0.41, mae: 0.180 }, break: { r2: 0.41, mae: 0.178 }, heavy: { r2: 0.09, mae: 0.016 } };

// ---------- i18n ----------
const I18N = {
  en: {
    nav_overview: 'Overview', nav_risk: 'Risk Map', nav_forecast: 'Forecast', nav_advisory: 'Advisory', nav_analytics: 'Analytics', nav_alerts: 'Alert Center', nav_farmer: 'Farmer Mode',
    page_overview: 'Overview', page_risk: 'Risk Map', page_forecast: 'Forecast', page_advisory: 'Advisory', page_analytics: 'Analytics', page_alerts: 'Alert Center', page_farmer: 'Farmer Mode',
    system_label: 'MONSOON INTELLIGENCE SYSTEM',
    tagline_b: 'Real model. Real climate data.', tagline_p: '7–30 day district-level forecasts',
    filter_state: 'State', filter_district: 'District', filter_horizon: 'Forecast Horizon', today_label: 'Today:',
    days_7: '7 Days', days_14: '14 Days', days_30: '30 Days',
    metric_onset: 'Monsoon Onset', metric_break: 'Dry Spell / Break', metric_heavy: 'Heavy Rain',
    map_title: '◈ District-wise Risk Map', map_sub: 'Live probability, 423 districts nationally',
    tab_onset: 'Onset', tab_break: 'Dry Spell', tab_heavy: 'Heavy Rain', th_break: 'Break', th_heavy: 'Heavy', th_week: 'Week',
    legend_low: '● Low Risk (0–40%)', legend_mod: '● Moderate (41–70%)', legend_high: '● High (71–100%)',
    outlook_title: '◔ 30-Day Monsoon Outlook', outlook_sub: 'Real model output for the selected district',
    drivers_title: 'Key Climate Drivers', live_tag: '(live)',
    weather_sub: 'Live conditions (Open-Meteo)', humidity: 'Humidity', wind: 'Wind', precip: 'Precip',
    next_hours: 'Next Hours', quick_actions: 'Quick Actions', download_report: 'Download Report', share_dashboard: 'Share Dashboard', send_advisory: 'Send Advisory',
    timeline_title: '◌ Monsoon Timeline', timeline_sub: '(Next 30 Days, weekly)',
    crop_advisory_title: '♧ Crop Advisory', view_all: 'View all →',
    prob_trend_title: '⇅ 30-Day Probability Trend',
    confidence_title: '◒ Model Confidence', todays_forecast: "Today's forecast", fi_title: 'Real global feature importance',
    recent_alerts: '♧ Recent Alerts',
    page_risk_title: 'Risk Intelligence Map', risk_sub: 'Explore district-level monsoon risks nationally.',
    page_forecast_title: 'Probabilistic Forecast', forecast_sub: 'Real model output + a documented uncertainty-widening timeline.',
    pred_confidence: 'Prediction confidence', confidence_caps: 'CONFIDENCE',
    onset_probability_label: 'Onset probability', break_probability_label: 'Break probability', heavy_probability_label: 'Heavy-rain probability',
    weekly_trend_title: '30-Day Weekly Probability Trend',
    page_advisory_title: 'Crop Advisory', advisory_sub: 'Turn model probabilities into concrete farm actions.',
    registered_crop: "District's registered crop", crop_stage: 'Estimated crop stage',
    page_analytics_title: 'Model Analytics & Explainable AI', analytics_sub: 'Real, honestly-reported evaluation metrics -- not inflated.',
    r2_title: 'Test-set R² (2015–2023 holdout, real IMD rainfall labels)',
    fi_page_title: 'Why does the model predict this?', fi_page_sub: 'Global feature importance -- not per-prediction',
    page_alerts_title: 'Alert Center', alerts_sub: 'Highest-severity advisories across all 423 districts, live.',
    page_farmer_title: 'Farmer Mode', farmer_sub: 'What a farmer sees over WhatsApp, in their own language.',
    why_farmer_mode: 'Why Farmer Mode?', why_farmer_mode_p: 'The same real forecast + advisory a farmer gets over our WhatsApp bot, shown here in the farmer’s own language (Hindi) for review — not a separate demo dataset.',
    weather_h3: '🌦️ Weather', weather_h3_sub: 'Real district-level forecast', crop_h3: '🌾 Crop', crop_h3_sub: "The district's actual registered crop", delivery_h3: '🔔 Delivery', delivery_h3_sub: 'Sent automatically when a farmer messages our WhatsApp number',
    conf_high: 'High Confidence', conf_mod: 'Moderate Confidence', conf_low: 'Low Confidence',
    week_high_risk: 'High Risk', week_heavy_risk: 'Heavy Rain Risk', week_favourable: 'Favourable', week_monitoring: 'Monitoring',
    inf_high: 'High Influence', inf_mod: 'Moderate Influence', inf_low: 'Low Influence',
    real_ensemble: 'Real ensemble output', next_days: 'Next {n} days',
    farmer_none: 'No farmers registered in this area yet',
    weather_at: 'Weather at', cond_rain: 'Rain', cond_clear: 'Clear', week_n: 'Week {n}',
    sowing_calendar_note: 'Based on the typical sowing calendar for {crop} — this district\'s real registered crop, not a hypothetical selection.',
    recommended_action: 'Recommended action',
    probability_word: 'probability', open_crop_advisory: 'Open Crop Advisory →',
    nearby_farmers_title: 'Registered farmers nearby (WhatsApp)', no_farmers_nearby: 'No farmers registered near this district yet.',
    selected_district: 'SELECTED DISTRICT', what_it_means: 'What it means',
    monsoon_onset_caps: 'MONSOON ONSET', real_model_output_for: 'Real model output for', climate_data_as_of: 'climate data as of',
    confidence_decay_note: 'Confidence decays with forecast horizon in a documented way — not false precision on a 30-day-out prediction. See the project README.',
    why_advice: 'Why this advice?', why_advice_body: 'Rule-based: current onset/break/heavy-rain probabilities + a crop-stage heuristic, matched against a documented threshold table — not a black box.',
    elevated_break_warn: 'elevated break-monsoon (dry spell) probability detected.',
  },
  hi: {
    nav_overview: 'अवलोकन', nav_risk: 'जोखिम मानचित्र', nav_forecast: 'पूर्वानुमान', nav_advisory: 'सलाह', nav_analytics: 'विश्लेषण', nav_alerts: 'अलर्ट सेंटर', nav_farmer: 'किसान मोड',
    page_overview: 'अवलोकन', page_risk: 'जोखिम मानचित्र', page_forecast: 'पूर्वानुमान', page_advisory: 'सलाह', page_analytics: 'विश्लेषण', page_alerts: 'अलर्ट सेंटर', page_farmer: 'किसान मोड',
    system_label: 'मानसून इंटेलिजेंस सिस्टम',
    tagline_b: 'असली मॉडल। असली जलवायु डेटा।', tagline_p: '7–30 दिन का जिला-स्तरीय पूर्वानुमान',
    filter_state: 'राज्य', filter_district: 'जिला', filter_horizon: 'पूर्वानुमान अवधि', today_label: 'आज:',
    days_7: '7 दिन', days_14: '14 दिन', days_30: '30 दिन',
    metric_onset: 'मानसून आगमन', metric_break: 'सूखा दौर / ब्रेक', metric_heavy: 'भारी बारिश',
    map_title: '◈ जिला-वार जोखिम मानचित्र', map_sub: 'लाइव संभावना, 423 जिले राष्ट्रव्यापी',
    tab_onset: 'आगमन', tab_break: 'सूखा दौर', tab_heavy: 'भारी बारिश', th_break: 'ब्रेक', th_heavy: 'भारी', th_week: 'सप्ताह',
    legend_low: '● कम जोखिम (0–40%)', legend_mod: '● मध्यम (41–70%)', legend_high: '● उच्च (71–100%)',
    outlook_title: '◔ 30-दिन मानसून पूर्वानुमान', outlook_sub: 'चयनित जिले के लिए वास्तविक मॉडल परिणाम',
    drivers_title: 'मुख्य जलवायु चालक', live_tag: '(लाइव)',
    weather_sub: 'लाइव स्थिति (Open-Meteo)', humidity: 'नमी', wind: 'हवा', precip: 'वर्षा',
    next_hours: 'अगले घंटे', quick_actions: 'त्वरित कार्य', download_report: 'रिपोर्ट डाउनलोड करें', share_dashboard: 'डैशबोर्ड साझा करें', send_advisory: 'सलाह भेजें',
    timeline_title: '◌ मानसून समयरेखा', timeline_sub: '(अगले 30 दिन, साप्ताहिक)',
    crop_advisory_title: '♧ फसल सलाह', view_all: 'सभी देखें →',
    prob_trend_title: '⇅ 30-दिन संभावना रुझान',
    confidence_title: '◒ मॉडल विश्वास', todays_forecast: 'आज का पूर्वानुमान', fi_title: 'वास्तविक वैश्विक फीचर महत्व',
    recent_alerts: '♧ हाल के अलर्ट',
    page_risk_title: 'जोखिम इंटेलिजेंस मानचित्र', risk_sub: 'राष्ट्रव्यापी जिला-स्तरीय मानसून जोखिम देखें।',
    page_forecast_title: 'संभाव्य पूर्वानुमान', forecast_sub: 'वास्तविक मॉडल परिणाम + एक प्रलेखित अनिश्चितता-विस्तार समयरेखा।',
    pred_confidence: 'पूर्वानुमान विश्वास', confidence_caps: 'विश्वास',
    onset_probability_label: 'आगमन संभावना', break_probability_label: 'ब्रेक संभावना', heavy_probability_label: 'भारी वर्षा संभावना',
    weekly_trend_title: '30-दिन साप्ताहिक संभावना रुझान',
    page_advisory_title: 'फसल सलाह', advisory_sub: 'मॉडल संभावनाओं को ठोस खेत कार्यों में बदलें।',
    registered_crop: 'जिले की पंजीकृत फसल', crop_stage: 'अनुमानित फसल चरण',
    page_analytics_title: 'मॉडल विश्लेषण और व्याख्यात्मक AI', analytics_sub: 'वास्तविक, ईमानदारी से रिपोर्ट किए गए मूल्यांकन मीट्रिक — बढ़ा-चढ़ाकर नहीं।',
    r2_title: 'टेस्ट-सेट R² (2015–2023 होल्डआउट, वास्तविक IMD वर्षा लेबल)',
    fi_page_title: 'मॉडल यह पूर्वानुमान क्यों करता है?', fi_page_sub: 'वैश्विक फीचर महत्व — प्रति-पूर्वानुमान नहीं',
    page_alerts_title: 'अलर्ट सेंटर', alerts_sub: 'सभी 423 जिलों में उच्चतम-गंभीरता की सलाह, लाइव।',
    page_farmer_title: 'किसान मोड', farmer_sub: 'एक किसान को WhatsApp पर अपनी भाषा में क्या दिखता है।',
    why_farmer_mode: 'किसान मोड क्यों?', why_farmer_mode_p: 'वही वास्तविक पूर्वानुमान + सलाह जो एक किसान को हमारे WhatsApp बॉट पर मिलती है, यहाँ समीक्षा के लिए किसान की अपनी भाषा (हिन्दी) में दिखाई गई है — कोई अलग डेमो डेटा नहीं।',
    weather_h3: '🌦️ मौसम', weather_h3_sub: 'वास्तविक जिला-स्तरीय पूर्वानुमान', crop_h3: '🌾 फसल', crop_h3_sub: 'जिले की वास्तविक पंजीकृत फसल', delivery_h3: '🔔 डिलीवरी', delivery_h3_sub: 'जब कोई किसान हमारे WhatsApp नंबर पर संदेश भेजता है तो स्वचालित रूप से भेजा जाता है',
    conf_high: 'उच्च विश्वास', conf_mod: 'मध्यम विश्वास', conf_low: 'कम विश्वास',
    week_high_risk: 'उच्च जोखिम', week_heavy_risk: 'भारी वर्षा जोखिम', week_favourable: 'अनुकूल', week_monitoring: 'निगरानी',
    inf_high: 'उच्च प्रभाव', inf_mod: 'मध्यम प्रभाव', inf_low: 'कम प्रभाव',
    real_ensemble: 'वास्तविक एन्सेंबल परिणाम', next_days: 'अगले {n} दिन',
    farmer_none: 'इस क्षेत्र में अभी तक कोई किसान पंजीकृत नहीं',
    weather_at: 'मौसम -', cond_rain: 'बारिश', cond_clear: 'साफ', week_n: 'सप्ताह {n}',
    sowing_calendar_note: '{crop} के लिए विशिष्ट बुवाई कैलेंडर पर आधारित — यह जिले की वास्तविक पंजीकृत फसल है, कोई काल्पनिक चयन नहीं।',
    recommended_action: 'अनुशंसित कार्रवाई',
    probability_word: 'संभावना', open_crop_advisory: 'फसल सलाह खोलें →',
    nearby_farmers_title: 'आस-पास पंजीकृत किसान (WhatsApp)', no_farmers_nearby: 'इस जिले के पास अभी तक कोई किसान पंजीकृत नहीं।',
    selected_district: 'चयनित जिला', what_it_means: 'इसका मतलब',
    monsoon_onset_caps: 'मानसून आगमन', real_model_output_for: 'के लिए वास्तविक मॉडल परिणाम', climate_data_as_of: 'जलवायु डेटा दिनांक',
    confidence_decay_note: 'विश्वास पूर्वानुमान अवधि के साथ एक प्रलेखित तरीके से घटता है — 30-दिन दूर के पूर्वानुमान पर झूठी सटीकता नहीं। प्रोजेक्ट README देखें।',
    why_advice: 'यह सलाह क्यों?', why_advice_body: 'नियम-आधारित: वर्तमान आगमन/ब्रेक/भारी-वर्षा संभावनाएं + फसल-चरण अनुमान, एक प्रलेखित सीमा तालिका के विरुद्ध मिलान — कोई ब्लैक बॉक्स नहीं।',
    elevated_break_warn: 'ऊंची ब्रेक-मानसून (सूखा दौर) संभावना पाई गई।',
  },
};
function t(key) { return I18N[currentLang][key] ?? I18N.en[key] ?? key; }
function applyStaticI18n() {
  document.documentElement.lang = currentLang;
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $('#title').textContent = t('page_' + currentPage);
}

function pct(x) { return Math.round(x * 100) + '%'; }

// Animates a percentage into place instead of snapping straight to the
// final number -- small polish, no functional effect on the real value.
// A per-element run token discards stale frames if called again mid-flight
// (e.g. switching districts quickly), so two animations never fight over
// the same element's text.
const _animTokens = new WeakMap();
function animatePct(el, targetFraction, duration = 650) {
  if (!el) return;
  const target = Math.round(targetFraction * 100);
  const start = parseInt(el.textContent) || 0;
  const token = Symbol();
  _animTokens.set(el, token);
  const t0 = performance.now();
  function tick(now) {
    if (_animTokens.get(el) !== token) return;
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased) + '%';
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
function cropEmoji(crop) { return CROP_EMOJI[crop] || '🌱'; }
function metricLabel(m) { return m === 'onset_probability' ? t('tab_onset') : m === 'break_probability' ? t('tab_break') : t('tab_heavy'); }
function riskColor(p) { return p >= 71 ? '#ef5262' : p >= 41 ? '#f0bd42' : '#35d69a'; }
function district(id) { return DISTRICTS.find((d) => d.district_id === id); }
function snapshotFor(id) { return SNAPSHOT.find((d) => d.district_id === id); }
function confLabel(c) { return c >= 0.75 ? t('conf_high') : c >= 0.5 ? t('conf_mod') : t('conf_low'); }
function av(a, field) { return a[field + '_' + currentLang] || a[field + '_en']; } // advisory field in current language

$('#langSelect').onchange = (e) => {
  currentLang = e.target.value;
  applyStaticI18n();
  if (currentForecast) {
    renderMetrics(); renderOutlookChart(); renderDrivers(); renderOverviewFI();
    renderWeeks(); renderCropAdvisoryMini(); renderProbTable(); renderConfidence();
    renderRiskSelectedPanel(); renderForecastPage(); renderAdvisoryPage(); renderFarmerMode();
    renderWeather(district(selectedDistrictId));
  }
  renderAnalyticsR2();
  renderFeatureImportancePage();
  if (lastAlertFeed) renderAlerts(lastAlertFeed);
};

// ---------- boot ----------
async function boot() {
  $('#todayDate').textContent = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    [DISTRICTS, SNAPSHOT] = await Promise.all([api('/districts'), api('/districts/map')]);
    FI = (await api('/model/feature-importance')).targets;
    $('#statusLine').textContent = '● AI services online';
  } catch (e) {
    $('#statusLine').textContent = '● backend unreachable';
    $('#bootOverlay small').textContent = 'Backend unreachable — retrying shortly…';
    console.error(e);
    setTimeout(boot, 5000);
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
  $('#bootOverlay').classList.add('hidden');
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
      marker.on('mouseover', () => marker.setRadius(10));
      marker.on('mouseout', () => marker.setRadius(6));
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
  animatePct($('#m-onset'), c.onset_probability);
  animatePct($('#m-break'), c.break_probability);
  animatePct($('#m-heavy'), c.heavy_rain_probability);
  const label = confLabel(c.confidence);
  $('#m-onset-conf').textContent = label;
  $('#m-break-conf').textContent = label;
  $('#m-heavy-conf').textContent = label;
  $('#m-onset-note').textContent = `${currentForecast.district_name}, ${currentForecast.state}`;
  $('#m-break-note').textContent = t('next_days').replace('{n}', horizonDays);
  $('#m-heavy-note').textContent = t('real_ensemble');
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
  if (kind === 'enso') return Math.abs(idx.value) >= 1.5 ? t('inf_high') : Math.abs(idx.value) >= 0.5 ? t('inf_mod') : t('inf_low');
  if (kind === 'iod') return Math.abs(idx.value) >= 0.6 ? t('inf_high') : Math.abs(idx.value) >= 0.4 ? t('inf_mod') : t('inf_low');
  return idx.amplitude >= 1.5 ? t('inf_high') : idx.amplitude >= 0.8 ? t('inf_mod') : t('inf_low');
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
  return `${FEATURE_LABELS[currentLang][f.feature] || f.feature}　${'█'.repeat(filled)}${'░'.repeat(7 - filled)}　${p}%`;
}
function renderOverviewFI() {
  if (!FI) return;
  FI.onset.slice(0, 3).forEach((f, i) => { $('#fi-' + (i + 1)).textContent = barText(f); });
}
function renderFeatureImportancePage() {
  if (!FI) return;
  $('#fiFeatures').innerHTML = FI[activeFiTarget].map((f) => {
    const p = Math.round(f.importance * 100);
    return `<p class="feature">${FEATURE_LABELS[currentLang][f.feature] || f.feature} <i><u style="width:${p * 2}%"></u></i><b>${p}%</b></p>`;
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
  $('#weatherTitle').textContent = `⌂ ${t('weather_at')} ${d.name}`;
  $('#fLocation').textContent = `📍 ${d.name}, ${d.state}`;
  try {
    const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&hourly=temperature_2m,precipitation&timezone=auto`).then((r) => r.json());
    const cur = w.current;
    const cond = cur.precipitation > 0.2 ? t('cond_rain') : t('cond_clear');
    $('#weatherTemp').textContent = Math.round(cur.temperature_2m) + '°C';
    $('#weatherCond').textContent = cond;
    $('#weatherHumidity').textContent = cur.relative_humidity_2m + '%';
    $('#weatherWind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
    $('#weatherPrecip').textContent = cur.precipitation + ' mm';
    $('#todayTemp').textContent = Math.round(cur.temperature_2m) + '°C';
    $('#todayCond').textContent = cond;
    $('#fTemp').innerHTML = `${Math.round(cur.temperature_2m)}°C<small>${cur.precipitation > 0.2 ? 'आज बारिश' : 'आज साफ मौसम'}</small>`;

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
    weeks.push({ label: t('week_n').replace('{n}', w + 1), range: `${chunk[0].date.slice(5)}–${chunk[chunk.length - 1].date.slice(5)}`, onset: avg('onset_probability'), brk: avg('break_probability'), heavy: avg('heavy_rain_probability') });
  }
  return weeks;
}
function weekStatus(wk) {
  if (wk.brk >= 0.55) return t('week_high_risk');
  if (wk.heavy >= 0.55) return t('week_heavy_risk');
  if (wk.onset >= 0.6) return t('week_favourable');
  return t('week_monitoring');
}
function renderWeeks() {
  $('#weeksRow').innerHTML = weeklyBuckets().map((wk) => `<div>${wk.label}<small>${wk.range}</small><em>${weekStatus(wk)}</em><b>${Math.round(wk.onset * 100)}%</b></div>`).join('');
}
function renderProbTable() {
  const weeks = weeklyBuckets();
  const rows = weeks.map((wk) => `<tr><td>${wk.label}</td><td>${Math.round(wk.onset * 100)}%</td><td>${Math.round(wk.brk * 100)}%</td><td>${Math.round(wk.heavy * 100)}%</td></tr>`).join('');
  $('#probTable').innerHTML = `<tr><th>${t('th_week')}</th><th>${t('tab_onset')}</th><th>${t('th_break')}</th><th>${t('th_heavy')}</th></tr>` + rows;
  const worst = weeks.reduce((a, b) => (b.brk > a.brk ? b : a), weeks[0]);
  if (worst && worst.brk >= 0.55) {
    $('#probWarn').style.display = 'block';
    $('#probWarn').textContent = `⚠ ${worst.label}: ${t('elevated_break_warn')}`;
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
  const farmers = currentFarmers?.farmers || [];
  const farmersHtml = farmers.length
    ? `<div style="display:flex;flex-direction:column;gap:6px">${farmers.slice(0, 6).map((f) => `<div style="font-size:8px;color:#8ca5b1;display:flex;justify-content:space-between"><span>${f.name} · ${f.crops.join(', ') || '—'}</span><span>${f.distance_km} km</span></div>`).join('')}</div>`
    : `<div class="farmer-empty"><span>👤</span><small>${t('no_farmers_nearby')}</small></div>`;
  $('#selectedPanel').innerHTML = `
    <small>${t('selected_district')}</small>
    <h2>${d.name}</h2>
    <strong>${p}%</strong><em>${metricLabel(activeMapMetric)} ${t('probability_word')}</em>
    <hr>
    <p>${t('tab_onset')} <b>${Math.round(snap.onset_probability * 100)}%</b></p>
    <p>${t('tab_break')} <b>${Math.round(snap.break_probability * 100)}%</b></p>
    <p>${t('tab_heavy')} <b>${Math.round(snap.heavy_rain_probability * 100)}%</b></p>
    <hr>
    <h3>${t('what_it_means')}</h3>
    <p>${av(currentAdvisory.advisory, 'message')}</p>
    <button class="primary" onclick="show('advisory')">${t('open_crop_advisory')}</button>
    <hr>
    <h3>${t('nearby_farmers_title')} <small style="font-weight:400;color:#547d91">(${farmers.length})</small></h3>
    ${farmersHtml}`;
}

function renderForecastPage() {
  const c = currentForecast.current;
  $('#forecastHero').innerHTML = `<div>${t('monsoon_onset_caps')}<strong id="forecastHeroOnset">0%</strong><em>${confLabel(c.confidence)}</em><p>${t('real_model_output_for')} ${currentForecast.district_name}</p></div><span>🌧️</span>`;
  animatePct($('#forecastHeroOnset'), c.onset_probability);
  $('#forecastAsOf').textContent = `● ${t('climate_data_as_of')} ${currentForecast.climate_context.as_of}`;

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

  $('#confRing').innerHTML = `<span id="confRingVal">0%</span><small>${t('confidence_caps')}</small>`;
  animatePct($('#confRingVal'), c.confidence);
  $('#confDesc').textContent = t('confidence_decay_note');
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
  $('#overviewAdvice').innerHTML = `<div>${cropEmoji(d.primary_crop)}</div><section><b>${d.primary_crop} <i>${SEV_LABEL[currentLang][a.severity] || a.severity}</i></b><p>${av(a, 'message')}</p><ul><li>${av(a, 'action')}</li></ul></section>`;
}

function renderAdvisoryPage() {
  const d = district(selectedDistrictId);
  const a = currentAdvisory.advisory;
  $('#advisoryCropChip').innerHTML = `<span style="display:inline-block;background:#0a3036;border:1px solid #29b89b;color:#fff;padding:6px 10px;border-radius:7px;font-size:9px">${cropEmoji(d.primary_crop)} ${d.primary_crop}</span>`;
  $('#advisoryStage').textContent = t('sowing_calendar_note').replace('{crop}', d.primary_crop);
  $('#adviceMain').innerHTML = `
    <div class="advice-banner">${cropEmoji(d.primary_crop)}<div><small>${d.primary_crop.toUpperCase()} • ${currentAdvisory.district_name}</small><h2>${av(a, 'title')}</h2><p>${av(a, 'message')}</p></div></div>
    <h3>${t('recommended_action')}</h3>
    <div class="actions"><div><b>01</b><span><strong>${av(a, 'action')}</strong></span></div></div>
    <div class="why"><b>${t('why_advice')}</b><p>${t('why_advice_body')} See <code>advisory_engine.py</code>.</p></div>`;
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
function renderAlerts(feed) {
  const strip = feed.slice(0, 3).map((item) => `<span>${SEV_ICON[item.advisory.severity] || '●'} <strong>${SEV_LABEL[currentLang][item.advisory.severity] || item.advisory.severity}</strong> ${item.district_name}: ${av(item.advisory, 'title')}</span>`).join('');
  $('#alertsStrip').innerHTML = `<b>${t('recent_alerts')} <i>${feed.length}</i></b>${strip}`;
  $('#alertList').innerHTML = feed.map((item) => {
    const cls = item.advisory.severity === 'critical' || item.advisory.severity === 'warning' ? 'high' : item.advisory.severity === 'caution' ? 'watch' : 'info';
    return `<article class="alert ${cls}"><b>${SEV_ICON[item.advisory.severity] || '●'} ${(SEV_LABEL[currentLang][item.advisory.severity] || item.advisory.severity).toUpperCase()}</b><h3>${av(item.advisory, 'title')}</h3><p>${item.district_name}, ${item.state} • ${av(item.advisory, 'message')}</p></article>`;
  }).join('');
}
async function refreshAlerts() {
  try {
    lastAlertFeed = await api('/advisory?limit=20');
    renderAlerts(lastAlertFeed);
  } catch (e) {
    console.error(e);
  }
}

applyStaticI18n();
boot();
