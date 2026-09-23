import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, Crosshair, MapPin, Menu, Satellite, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import indiaTopo from "./assets/india-districts.json";
import { getClimateContext, getDistrictAdvisory, getDistrictForecast, getDistrictsMap, getNationalSummary } from "./lib/api";
import { pct, RISK_META } from "./lib/risk";
import "./experience.css";
import "./cinematic.css";

const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

function tilesAt(lat, lon, zoom) {
  const n = 2 ** zoom;
  const x = (lon + 180) / 360 * n;
  const sine = Math.sin(Math.max(-85, Math.min(85, lat)) * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * n;
  const tiles = [];
  for (let row = -2; row <= 2; row++) for (let col = -2; col <= 2; col++) {
    const tx = Math.floor(x) + col;
    const ty = Math.floor(y) + row;
    if (ty >= 0 && ty < n) tiles.push({
      key: zoom + "-" + tx + "-" + ty,
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + zoom + "/" + ty + "/" + ((tx % n + n) % n),
      left: "calc(50% + " + ((tx - x) * 256) + "px)",
      top: "calc(50% + " + ((ty - y) * 256) + "px)",
    });
  }
  return tiles;
}

function FieldToOrbit({ district }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const fieldOpacity = useTransform(scrollYProgress, [0.18, 0.67], [1, 0]);
  const fieldScale = useTransform(scrollYProgress, [0.12, 0.8], [1, 1.3]);
  const aerialScale = useTransform(scrollYProgress, [0.18, 0.78], [1.3, 1]);
  const tiles = useMemo(() => district ? tilesAt(district.lat, district.lon, 10) : [], [district]);
  return <section ref={ref} className="orbit-bridge" aria-label="From the field to an aerial district view"><div className="orbit-sticky">
    <motion.div className="orbit-aerial" style={reducedMotion ? undefined : { scale: aerialScale }}>{tiles.map((tile) => <img key={tile.key} src={tile.url} style={{ left: tile.left, top: tile.top }} alt="" />)}</motion.div>
    <motion.div className="orbit-field" style={reducedMotion ? undefined : { opacity: fieldOpacity, scale: fieldScale }} />
    <div className="orbit-vignette" /><div className="orbit-copy"><span className="eyebrow">FROM THE SOIL TO THE SKY</span><p>Every field has a place<br />in a bigger monsoon story.</p><span className="orbit-track">FIELD <i /> DISTRICT <i /> INDIA</span></div><span className="orbit-caption">ILLUSTRATIVE SCENE → REFERENCE IMAGERY © ESRI & CONTRIBUTORS</span>
  </div></section>;
}

function HeroParallax({ summary, useLocation }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.24]);
  const shift = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const fade = useTransform(scrollYProgress, [0, .8], [1, 0]);
  return <section id="top" ref={ref} className="hero cinematic-hero">
    <motion.div className="cinematic-hero-image" style={reducedMotion ? undefined : { scale }} />
    <div className="hero-scrim" />
    <motion.div className="hero-content" style={reducedMotion ? undefined : { y: shift, opacity: fade }}><div className="hero-kicker"><span className="pulse-dot" /> MADE FOR INDIA'S MONSOON</div><h1>Know the rain.<br /><em>Keep the season.</em></h1><p>Local outlooks for the decisions made in every field.</p><div className="hero-actions"><a href="#local-view" className="primary-button">Find my district <ArrowRight size={18} /></a><button className="text-button" onClick={useLocation}><Crosshair size={18} /> Use my location</button></div></motion.div>
    <div className="hero-side-note">GENERATED INDIAN FARM SCENE · {summary?.total_districts ?? 74} DISTRICTS IN PROTOTYPE</div><a href="#story" className="scroll-cue">SCROLL TO EXPLORE <ArrowDown size={17} /></a>
  </section>;
}

const chapters = [
  { number: "01", tag: "THE FIRST RAIN", title: "Sow.", prompt: "When will the rain begin?", image: "sowing" },
  { number: "02", tag: "THE DRY SPELL", title: "Hold.", prompt: "Will the rain pause?", image: "break" },
  { number: "03", tag: "THE DOWNPOUR", title: "Protect.", prompt: "Is heavy rain on its way?", image: "downpour" },
];

function StoryChapter({ chapter }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, .5, 1], [1.23, 1, 1.1]);
  const imageX = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const copyY = useTransform(scrollYProgress, [.1, .5], [85, 0]);
  const copyOpacity = useTransform(scrollYProgress, [.1, .5], [0, 1]);
  return <article ref={ref} className={`cinematic-chapter ${chapter.image}`}>
    <motion.div className="cinematic-chapter-image" style={reducedMotion ? undefined : { scale, x: imageX }} />
    <div className="cinematic-chapter-shade" />
    <motion.div className="cinematic-chapter-copy" style={reducedMotion ? undefined : { y: copyY, opacity: copyOpacity }}><span>{chapter.number} / {chapter.tag}</span><h3>{chapter.title}</h3><p>{chapter.prompt}</p></motion.div><span className="cinematic-chapter-count">{chapter.number} / 03</span>
  </article>;
}

function IndiaReveal({ districts, selectedId, onSelect }) {
  const ref = useRef(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.35, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [.4, 1]);
  return <div ref={ref} className="cinematic-india-map"><motion.div style={reducedMotion ? undefined : { scale, opacity }}><IndiaMap districts={districts} selectedId={selectedId} onSelect={onSelect} /></motion.div></div>;
}

function SatelliteView({ district, located }) {
  const [zoom, setZoom] = useState(11);
  const [tileFailures, setTileFailures] = useState(0);
  const tiles = useMemo(() => district ? tilesAt(district.lat, district.lon, zoom) : [], [district, zoom]);
  return <div className="satellite-view" aria-label={district ? "Satellite imagery near " + district.district_name : "Satellite imagery loading"}>
    <div className="satellite-tiles" key={(district?.district_id ?? "") + zoom}>
      {tiles.map((tile) => <img key={tile.key} src={tile.url} style={{ left: tile.left, top: tile.top }} alt="" onError={() => setTileFailures((count) => count + 1)} />)}
    </div>
    <div className="satellite-shade" /><div className="satellite-crosshair"><span /></div>
    <div className="satellite-topline"><Satellite size={16} /> VIEW FROM ABOVE <span>REFERENCE IMAGERY</span></div>
    <div className="satellite-place"><small>{located ? "NEAREST COVERED DISTRICT TO YOUR GPS" : "SELECTED DISTRICT CENTRE"}</small><strong>{district?.district_name ?? "Loading"}</strong><span>{district?.state} · {district ? district.lat.toFixed(3) + "° N, " + district.lon.toFixed(3) + "° E" : ""}</span></div>
    <div className="satellite-controls"><button onClick={() => { setTileFailures(0); setZoom((v) => Math.min(14, v + 1)); }} disabled={zoom === 14} aria-label="Zoom in">+</button><button onClick={() => { setTileFailures(0); setZoom((v) => Math.max(7, v - 1)); }} disabled={zoom === 7} aria-label="Zoom out">−</button></div>
    {tileFailures > 8 && <p className="tile-error" role="status">Imagery is unavailable. Your district outlook is still below.</p>}
    <div className="imagery-credit">Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community · District centre</div>
  </div>;
}

function IndiaMap({ districts, selectedId, onSelect }) {
  return <div className="india-map"><ComposableMap projection="geoMercator" projectionConfig={{ center: [82.8, 22.5], scale: 930 }} width={780} height={610} style={{ width: "100%", height: "100%" }}>
    <Geographies geography={indiaTopo}>{({ geographies }) => geographies.map((geo) => <Geography key={geo.rsmKey} geography={geo} fill="#203138" stroke="#58716e" strokeWidth={0.55} style={{ default: { outline: "none" }, hover: { outline: "none", fill: "#29413f" }, pressed: { outline: "none" } }} />)}</Geographies>
    {districts.map((district) => <Marker key={district.district_id} coordinates={[district.lon, district.lat]}><g role="button" tabIndex={0} aria-label={`Show ${district.district_name}, ${district.state}`} onClick={() => onSelect(district.district_id, true)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(district.district_id, true); } }} style={{ cursor: "pointer" }}><circle r="13" fill="transparent" /><circle r={district.district_id === selectedId ? 7 : 4.5} fill={RISK_META[district.risk_level]?.color} stroke="#0c191d" strokeWidth="1.5" /></g></Marker>)}
  </ComposableMap><div className="map-legend">{Object.entries(RISK_META).map(([key, meta]) => <span key={key}><i style={{ background: meta.color }} />{meta.label}</span>)}</div></div>;
}

export default function App() {
  const [districts, setDistricts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [climate, setClimate] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [lang, setLang] = useState("en");
  const [query, setQuery] = useState("");
  const [located, setLocated] = useState(false);
  const [geoMessage, setGeoMessage] = useState("");
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    Promise.all([getDistrictsMap(), getNationalSummary(), getClimateContext()]).then(([list, national, signals]) => {
      setDistricts(list); setSummary(national); setClimate(signals); setSelectedId(list[0]?.district_id ?? null);
    }).catch(() => setError("Forecast data is unavailable. Please refresh the page."));
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    Promise.all([getDistrictForecast(selectedId), getDistrictAdvisory(selectedId)]).then(([outlook, advice]) => {
      if (active) { setForecast(outlook); setAdvisory(advice.advisory); setError(""); }
    }).catch(() => { if (active) setError("This district outlook could not be loaded. Try another district."); });
    return () => { active = false; };
  }, [selectedId]);

  const selected = districts.find((district) => district.district_id === selectedId);
  const matches = districts.filter((district) => (district.district_name + " " + district.state).toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const ranked = [...districts].sort((a, b) => Math.max(b.break_probability, b.heavy_rain_probability) - Math.max(a.break_probability, a.heavy_rain_probability)).slice(0, 6);
  const chart = forecast?.timeline.map((point) => ({ date: date(point.date), Onset: Math.round(point.onset_probability * 100), Break: Math.round(point.break_probability * 100), "Heavy rain": Math.round(point.heavy_rain_probability * 100) })) ?? [];
  const chooseDistrict = (id, scroll = false) => {
    setSelectedId(id); setForecast(null); setAdvisory(null); setError(""); setLocated(false); setQuery("");
    if (scroll) document.getElementById("local-view")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  const useLocation = () => {
    if (!navigator.geolocation) { setGeoMessage("GPS is unavailable. Choose a covered district below."); document.getElementById("local-view")?.scrollIntoView(); return; }
    if (!districts.length) { setGeoMessage("Districts are still loading. Please try again in a moment."); return; }
    setGeoMessage("Finding your nearest covered district…");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const nearest = districts.reduce((best, district) => {
        const distance = (district.lat - coords.latitude) ** 2 + ((district.lon - coords.longitude) * Math.cos(coords.latitude * Math.PI / 180)) ** 2;
        return !best || distance < best.distance ? { id: district.district_id, distance } : best;
      }, null);
      if (nearest) { setSelectedId(nearest.id); setForecast(null); setAdvisory(null); setError(""); setLocated(true); setGeoMessage("Showing the nearest district in our prototype coverage. This may not be your district or field."); document.getElementById("local-view")?.scrollIntoView(); }
    }, () => { setGeoMessage("Location access was unavailable. Choose a covered district below."); document.getElementById("local-view")?.scrollIntoView(); }, { timeout: 10000 });
  };

  return <div className="experience">
    <header className="site-nav"><a href="#top" className="brand"><span className="brand-mark">F</span><span>FORESIGHT<small>MONSOON INTELLIGENCE</small></span></a><nav className={menuOpen ? "open" : ""}><a href="#story" onClick={() => setMenuOpen(false)}>The challenge</a><a href="#local-view" onClick={() => setMenuOpen(false)}>Your district</a><a href="#india-view" onClick={() => setMenuOpen(false)}>India view</a></nav><div className="nav-right"><span className="india-flag" role="img" aria-label="India"><i /></span><span className="prototype-pill">SIH 2026 PROTOTYPE</span><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div></header>
    <main>
      <HeroParallax summary={summary} useLocation={useLocation} />
      <section id="story" className="cinematic-story"><div className="cinematic-story-intro"><span>THE FARMER'S SEASON</span><h2>Three moments.<br /><em>One season to protect.</em></h2></div>{chapters.map((chapter) => <StoryChapter key={chapter.number} chapter={chapter} />)}<a className="cinematic-story-next" href="#local-view">Now look closer <ArrowDown size={18} /></a></section>

      <FieldToOrbit district={selected} />

      <section id="local-view" className="cinematic-local">
        <div className="cinematic-local-stage"><SatelliteView key={selectedId ?? "none"} district={selected} located={located} /><div className="cinematic-local-title"><span>01 / YOUR PLACE FROM ABOVE</span><h2>{selected?.district_name ?? "Find your district"}</h2><p>{located ? "Nearest covered district to your GPS" : `${selected?.state ?? "Choose a district"} · district-centre view`}</p></div></div>
        <div className="cinematic-location-bar"><label><MapPin size={18} /><span>CHOOSE A DISTRICT</span><select aria-label="Choose district" value={selectedId ?? ""} onChange={(event) => chooseDistrict(event.target.value)}><option value="" disabled>Choose a district</option>{districts.map((district) => <option key={district.district_id} value={district.district_id}>{district.district_name}, {district.state}</option>)}</select></label><button type="button" onClick={useLocation}><Crosshair size={17} /> Use GPS</button><div className="cinematic-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search covered districts" aria-label="Search covered districts" />{query && <div>{matches.length ? matches.map((district) => <button type="button" key={district.district_id} onClick={() => chooseDistrict(district.district_id)}>{district.district_name}<small>{district.state}</small></button>) : <p>No covered district found</p>}</div>}</div></div>
        {geoMessage && <p className="cinematic-message" role="status">{geoMessage}</p>}{error && <p className="cinematic-error" role="alert">{error}</p>}
        <div className="cinematic-local-insight"><div className="cinematic-risk"><span>30-DAY SIGNAL · {date(forecast?.generated_at)}</span><strong>{RISK_META[selected?.risk_level]?.label ?? "Loading local outlook"}</strong><small>PROTOTYPE FORECAST · {selected?.primary_crop ?? "LOCAL"}</small></div><div className="cinematic-advice"><div><span>THIS WEEK'S CROP ACTION</span><div className="language-toggle" role="group" aria-label="Advice language"><button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")} aria-pressed={lang === "en"}>EN</button><button type="button" className={lang === "hi" ? "active" : ""} onClick={() => setLang("hi")} aria-pressed={lang === "hi"}>हिंदी</button></div></div><h3>{advisory?.[`title_${lang}`] ?? "Loading crop advice…"}</h3><p>{advisory?.[`action_${lang}`] ?? "Crop guidance will appear with the outlook."}</p></div></div>
        <details className="cinematic-forecast"><summary>See the full 30-day outlook <ArrowDown size={17} /></summary><div className="cinematic-forecast-body"><p>District-level probabilities help with planning. Farther dates are less certain.</p><div className="cinematic-probabilities"><div><span>Monsoon onset</span><strong>{selected ? pct(selected.onset_probability) : "—"}</strong></div><div><span>Rain break</span><strong>{selected ? pct(selected.break_probability) : "—"}</strong></div><div><span>Heavy rain</span><strong>{selected ? pct(selected.heavy_rain_probability) : "—"}</strong></div></div>{chart.length > 0 && <div className="cinematic-chart"><ResponsiveContainer width="100%" height={260}><AreaChart data={chart}><CartesianGrid stroke="#456754" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="date" stroke="#b7cfba" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="#b7cfba" fontSize={11} tickLine={false} axisLine={false} unit="%" width={40} /><Tooltip contentStyle={{ background: "#143025", border: "1px solid #7d9a7e", color: "#f3f0e6" }} /><Area type="monotone" dataKey="Onset" stroke="#c4dda8" fill="none" strokeWidth={2} /><Area type="monotone" dataKey="Break" stroke="#e89677" fill="none" strokeWidth={2} /><Area type="monotone" dataKey="Heavy rain" stroke="#e7c77c" fill="none" strokeWidth={2} /></AreaChart></ResponsiveContainer><div className="chart-legend"><span><i className="teal" />Onset</span><span><i className="coral" />Break</span><span><i className="gold" />Heavy rain</span></div></div>}</div></details>
        <a className="cinematic-zoom-out" href="#india-view">Zoom out to India <ArrowDown size={20} /></a>
      </section>

      <section id="india-view" className="cinematic-india"><IndiaReveal districts={districts} selectedId={selectedId} onSelect={chooseDistrict} /><div className="cinematic-india-title"><span>02 / INDIA VIEW</span><h2>One monsoon.<br /><em>Many realities.</em></h2><p>{summary?.total_districts ?? 74} covered districts</p></div><div className="cinematic-india-watch"><span>DISTRICTS TO WATCH</span><div>{ranked.map((district) => <button type="button" key={district.district_id} onClick={() => chooseDistrict(district.district_id, true)}>{district.district_name}<small>{district.state}</small><ArrowRight size={15} /></button>)}</div></div><a href="#local-view" className="cinematic-back"><ArrowLeft size={17} /> Back to your district</a></section>

      <section className="signals-section"><div className="signals-copy"><span className="eyebrow">BEHIND THE OUTLOOK</span><h2>Climate signals,<br /><em>translated locally.</em></h2><p>ENSO, IOD and MJO describe the wider monsoon setting. This prototype connects those signals to district risk and rule-based crop advice.</p></div><div className="signal-cards"><div><span>ENSO</span><strong>{climate?.enso?.phase ?? "—"}</strong><small>Niño 3.4 · {climate?.enso?.value ?? "—"}</small></div><div><span>IOD</span><strong>{climate?.iod?.phase ?? "—"}</strong><small>DMI · {climate?.iod?.value ?? "—"}</small></div><div><span>MJO</span><strong>{climate?.mjo?.phase_label ?? "—"}</strong><small>Amplitude · {climate?.mjo?.amplitude ?? "—"}</small></div></div></section>
    </main><footer className="site-footer"><div className="brand"><span className="brand-mark">F</span><span>FORESIGHT<small>MONSOON INTELLIGENCE</small></span></div><p>SIH26086 · Prototype forecast data. Generated farm scenes are illustrations. Satellite imagery is geographic context, not a crop-health measurement.</p><a href="#top">Back to top ↑</a></footer>
  </div>;
}
