import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { RISK_META, pct } from "../lib/risk";
import indiaTopo from "../assets/india-districts.json";

const DEFAULT_CENTER = [82.8, 22.5];
const DEFAULT_ZOOM = 1;
const CLOSEUP_ZOOM = 4.5;

export default function RiskMap({ districts, selectedId, onSelect }) {
  const [hovered, setHovered] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [isAnimating, setIsAnimating] = useState(false);
  const active = hovered ?? districts.find((d) => d.district_id === selectedId) ?? null;
  const isZoomedIn = mapZoom > DEFAULT_ZOOM;

  const animateTo = (center, zoom) => {
    setIsAnimating(true);
    setMapCenter(center);
    setMapZoom(zoom);
    window.clearTimeout(animateTo._t);
    animateTo._t = window.setTimeout(() => setIsAnimating(false), 900);
  };

  const focusDistrict = (d) => {
    animateTo([d.lon, d.lat], CLOSEUP_ZOOM);
    onSelect(d.district_id);
  };

  const resetView = () => animateTo(DEFAULT_CENTER, DEFAULT_ZOOM);

  return (
    <section id="map" className="px-6 lg:px-10 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Calibration ensemble · live climate feed"
          title="National district risk map"
          description="Live probability of break, heavy-rain, and onset conditions per district. Click any point to open its full forecast."
        />

        <div className="mt-10 grid lg:grid-cols-[1fr_320px] gap-6">
          <div
            className={`relative rounded-3xl border border-border bg-surface/50 overflow-hidden ${isAnimating ? "map-zoom-animating" : ""}`}
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{ center: DEFAULT_CENTER, scale: 1050 }}
              width={800}
              height={780}
              style={{ width: "100%", height: "auto" }}
            >
              <ZoomableGroup
                center={mapCenter}
                zoom={mapZoom}
                minZoom={1}
                maxZoom={8}
                onMoveStart={() => setIsAnimating(false)}
                onMoveEnd={({ coordinates, zoom }) => {
                  setMapCenter(coordinates);
                  setMapZoom(zoom);
                }}
              >
                <Geographies geography={indiaTopo}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill="#10131f"
                          stroke="#232842"
                          strokeWidth={0.6 / mapZoom}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", fill: "#161a29" },
                            pressed: { outline: "none" },
                          }}
                        />
                      ))
                  }
                </Geographies>

                {districts.map((d) => {
                  const meta = RISK_META[d.risk_level] ?? RISK_META.normal;
                  const isSelected = d.district_id === selectedId;
                  return (
                    <Marker
                      key={d.district_id}
                      coordinates={[d.lon, d.lat]}
                      onClick={() => focusDistrict(d)}
                      onMouseEnter={() => setHovered(d)}
                      onMouseLeave={() => setHovered(null)}
                      style={{ default: { cursor: "pointer" } }}
                    >
                      {d.risk_level === "break_risk" && (
                        <motion.circle
                          fill="none"
                          stroke={meta.color}
                          strokeWidth={1.5 / mapZoom}
                          initial={{ r: 4.5 / mapZoom, opacity: 0.6 }}
                          animate={{ r: [4.5 / mapZoom, 13 / mapZoom, 4.5 / mapZoom], opacity: [0.6, 0, 0.6] }}
                          transition={{
                            duration: 2.6,
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: (d.lat + d.lon) % 2,
                          }}
                        />
                      )}
                      <motion.circle
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4 + Math.random() * 0.6, duration: 0.5, type: "spring", stiffness: 220 }}
                        whileHover={{ scale: 1.5 }}
                        r={(isSelected ? 7 : 4.5) / mapZoom}
                        fill={meta.color}
                        fillOpacity={isSelected ? 1 : 0.85}
                        stroke="#06070c"
                        strokeWidth={(isSelected ? 2 : 1) / mapZoom}
                        style={{ cursor: "pointer", transformOrigin: "center" }}
                      />
                      {isSelected && (
                        <motion.circle
                          r={12 / mapZoom}
                          fill="none"
                          stroke={meta.color}
                          strokeWidth={1.2 / mapZoom}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 0.5, scale: 1 }}
                          transition={{ duration: 0.4 }}
                        />
                      )}
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            <div className="absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-xl border border-border bg-ink/80 backdrop-blur px-4 py-2.5">
              {Object.entries(RISK_META).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-1.5 text-[11px] text-fog">
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                </div>
              ))}
            </div>

            <AnimatePresence>
              {isZoomedIn && (
                <motion.button
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onClick={resetView}
                  className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-ink/80 backdrop-blur px-3.5 py-1.5 text-[11.5px] text-fog hover:text-paper hover:border-mist transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-monsoon-glow" />
                  Reset view
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="rounded-3xl border border-border bg-surface/60 p-5 lg:sticky lg:top-24 h-fit overflow-hidden">
            <AnimatePresence mode="wait">
            {active ? (
              <motion.div
                key={active.district_id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="text-[11px] uppercase tracking-wider text-mist">{active.state}</div>
                <div className="font-display text-xl font-semibold text-paper mt-0.5">
                  {active.district_name}
                </div>
                <div className="text-[12.5px] text-fog mt-1">Primary crop: {active.primary_crop}</div>

                <div
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium"
                  style={{
                    color: RISK_META[active.risk_level]?.color,
                    background: `${RISK_META[active.risk_level]?.color}1a`,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: RISK_META[active.risk_level]?.color }}
                  />
                  {RISK_META[active.risk_level]?.label}
                </div>

                <div className="mt-5 space-y-3">
                  <ProbRow label="Onset probability" value={active.onset_probability} color="#38bdf8" />
                  <ProbRow label="Break probability" value={active.break_probability} color="#fb5b7c" />
                  <ProbRow label="Heavy rain probability" value={active.heavy_rain_probability} color="#fbbf24" />
                </div>

                <button
                  onClick={() => onSelect(active.district_id)}
                  className="mt-6 w-full rounded-full bg-paper text-ink text-[13px] font-medium py-2.5 hover:bg-monsoon-glow transition-colors"
                >
                  View full 30-day forecast
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[13px] text-mist py-10 text-center"
              >
                Hover or click a district on the map to inspect its forecast.
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProbRow({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1.5">
        <span className="text-fog">{label}</span>
        <span className="text-paper font-medium">{pct(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-[11px] uppercase tracking-wider text-monsoon-glow mb-3"
      >
        {eyebrow}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-3xl sm:text-4xl font-semibold text-paper tracking-tight"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-[14.5px] text-fog leading-relaxed"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}
