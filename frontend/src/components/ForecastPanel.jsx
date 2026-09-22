import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDistrictAdvisory, getDistrictForecast } from "../lib/api";
import { SEVERITY_META } from "../lib/risk";
import { SectionHeading } from "./RiskMap";
import { useCountUp } from "../hooks/useCountUp";

export default function ForecastPanel({ districtId }) {
  const [forecast, setForecast] = useState(null);
  const [advisory, setAdvisory] = useState(null);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (!districtId) return;
    getDistrictForecast(districtId, 30).then(setForecast);
    getDistrictAdvisory(districtId).then((r) => setAdvisory(r.advisory));
  }, [districtId]);

  if (!districtId) return null;

  const chartData = forecast?.timeline.map((t) => ({
    date: t.date.slice(5),
    Onset: Math.round(t.onset_probability * 100),
    Break: Math.round(t.break_probability * 100),
    "Heavy rain": Math.round(t.heavy_rain_probability * 100),
    confidence: Math.round(t.confidence * 100),
  }));

  return (
    <section id="forecast" className="px-6 lg:px-10 py-24 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <SectionHeading
            eyebrow="Temporal forecasting head · TFT quantile outlook"
            title={forecast ? `${forecast.district_name}, ${forecast.state}` : "Loading forecast…"}
            description="30-day probabilistic outlook with widening uncertainty bands further out the horizon — an honest signal, not false precision."
          />
          {forecast && (
            <div className="text-[12.5px] text-mist">
              Primary crop: <span className="text-paper">{forecast.primary_crop}</span>
            </div>
          )}
        </div>

        <div className="mt-10 grid lg:grid-cols-[1fr_340px] gap-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-border bg-surface/60 p-6"
          >
            {chartData && (
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="onset" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="brk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb5b7c" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#fb5b7c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="heavy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232842" vertical={false} />
                  <XAxis dataKey="date" stroke="#7d84a3" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#7d84a3" fontSize={11} tickLine={false} axisLine={false} unit="%" width={40} />
                  <Tooltip
                    contentStyle={{
                      background: "#0b0d16",
                      border: "1px solid #232842",
                      borderRadius: 12,
                      fontSize: 12.5,
                    }}
                    labelStyle={{ color: "#f1f2f9" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#a9aec8" }} />
                  <Area type="monotone" dataKey="Onset" stroke="#38bdf8" fill="url(#onset)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Break" stroke="#fb5b7c" fill="url(#brk)" strokeWidth={2} />
                  <Area
                    type="monotone"
                    dataKey="Heavy rain"
                    stroke="#fbbf24"
                    fill="url(#heavy)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="rounded-3xl border border-border bg-surface/60 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-wider text-mist">
                Expert system advisory
              </div>
              <div className="relative flex rounded-full border border-border p-0.5 text-[11px]">
                <motion.div
                  className="absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-paper"
                  animate={{ x: lang === "en" ? 2 : "calc(100% + 2px)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
                <button
                  onClick={() => setLang("en")}
                  className={`relative z-10 px-2.5 py-1 transition-colors ${lang === "en" ? "text-ink" : "text-mist"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLang("hi")}
                  className={`relative z-10 px-2.5 py-1 transition-colors ${lang === "hi" ? "text-ink" : "text-mist"}`}
                >
                  HI
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {advisory && (
                <motion.div
                  key={lang}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium mb-3"
                    style={{
                      color: SEVERITY_META[advisory.severity]?.color,
                      background: `${SEVERITY_META[advisory.severity]?.color}1a`,
                    }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: SEVERITY_META[advisory.severity]?.color }}
                    />
                    {SEVERITY_META[advisory.severity]?.label}
                  </motion.div>
                  <div className="font-display text-lg font-semibold text-paper leading-snug">
                    {lang === "en" ? advisory.title_en : advisory.title_hi}
                  </div>
                  <p className="mt-3 text-[13.5px] text-fog leading-relaxed">
                    {lang === "en" ? advisory.message_en : advisory.message_hi}
                  </p>
                  <div className="mt-4 rounded-xl bg-surface-2 border border-border p-4">
                    <div className="text-[11px] uppercase tracking-wider text-monsoon-glow mb-1.5">
                      Recommended action
                    </div>
                    <p className="text-[13.5px] text-paper leading-relaxed">
                      {lang === "en" ? advisory.action_en : advisory.action_hi}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {forecast && (
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Onset" value={forecast.current.onset_probability} color="#38bdf8" />
                <MiniStat label="Break" value={forecast.current.break_probability} color="#fb5b7c" />
                <MiniStat label="Heavy" value={forecast.current.heavy_rain_probability} color="#fbbf24" />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value, color }) {
  const animated = useCountUp(value * 100, { duration: 900 });
  return (
    <motion.div
      whileHover={{ y: -3, borderColor: color }}
      className="rounded-xl border border-border py-3 transition-colors"
    >
      <div className="font-display text-lg font-semibold tabular-nums" style={{ color }}>
        {animated}%
      </div>
      <div className="text-[10.5px] text-mist mt-0.5">{label}</div>
    </motion.div>
  );
}
