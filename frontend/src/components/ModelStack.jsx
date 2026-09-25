import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const STAGES = [
  {
    tag: "Live · NOAA CPC, NOAA PSL, BoM",
    title: "Live Teleconnection Feed",
    desc: "ONI (ENSO), DMI (IOD) and RMM (MJO) fetched live from their official sources on a 6-hour cache, not a frozen snapshot.",
  },
  {
    tag: "Live · OpenStreetMap Nominatim",
    title: "Farmer Geocoding",
    desc: "Any village, town, or district name a farmer types is resolved to real coordinates — not limited to a fixed list.",
  },
  {
    tag: "Machine Learning · XGBoost, RF, GB, Ridge",
    title: "Calibration Ensemble",
    desc: "A 4-model ensemble per target (onset / break / heavy-rain), trained on 25 years of real India IMD gridded rainfall and real climate indices — the actual predictive core, not a stand-in.",
  },
  {
    tag: "Expert System",
    title: "Advisory Engine",
    desc: "Explainable rule-based layer mapping calibrated probabilities + crop stage to concrete, bilingual (EN/HI) farmer actions.",
  },
  {
    tag: "LLM · Groq, Anthropic fallback",
    title: "Personalization & Delivery",
    desc: "An LLM rephrases the rule-based advisory for tone, language, and the farmer's specific crop/land situation — never inventing numbers — delivered over WhatsApp or this dashboard.",
  },
];

export default function ModelStack() {
  const trackRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 0.75", "end 0.55"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="stack" className="px-6 lg:px-10 py-28 border-t border-border">
      <div className="mx-auto max-w-7xl grid lg:grid-cols-[360px_1fr] gap-x-16 gap-y-12">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-monsoon-glow mb-4">
            01 — 05 / Hybrid architecture
          </div>
          <h2 className="font-display text-3xl font-medium text-paper tracking-tight leading-[1.1]">
            From planetary signals to a farmer&apos;s decision
          </h2>
          <p className="mt-4 text-[14.5px] text-fog leading-relaxed max-w-sm">
            Live data feeding a real trained ensemble, honest calibration on
            genuinely scarce Indian rainfall data, and rules where explainability
            matters most — a spatial (GNN) and temporal (TFT) deep-learning layer
            are the natural next upgrade, not yet built.
          </p>
          <div className="mt-8 pt-6 border-t border-border text-[12px] text-mist leading-relaxed max-w-sm">
            <span className="text-fog font-medium">Data sources — </span>
            IMD gridded rainfall (0.25°), NOAA ENSO, BoM IOD/MJO, ERA5 reanalysis,
            ICAR crop calendars.
          </div>
        </div>

        <div ref={trackRef} className="relative pl-[52px]">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
          <motion.div
            style={{ scaleY: lineScale }}
            className="absolute left-[15px] top-2 bottom-2 w-px origin-top bg-gradient-to-b from-monsoon-glow via-monsoon to-transparent"
          />

          {STAGES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, x: -16, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="relative pb-14 last:pb-0"
            >
              <div className="absolute -left-[52px] top-0 h-8 w-8 rounded-full border border-border bg-ink flex items-center justify-center">
                <span className="font-mono text-[11px] text-fog">{String(i + 1).padStart(2, "0")}</span>
              </div>

              <div className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-mist mb-2">
                {s.tag}
              </div>
              <div className="font-display text-xl font-medium text-paper leading-snug">
                {s.title}
              </div>
              <p className="mt-2 text-[13.5px] text-fog leading-relaxed max-w-xl">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
