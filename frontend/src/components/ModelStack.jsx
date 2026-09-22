import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const STAGES = [
  {
    tag: "M2 · Deep Learning",
    title: "Teleconnection Encoder",
    desc: "LSTM / Transformer over ENSO, IOD and MJO time series, learning a latent global climate-state embedding.",
  },
  {
    tag: "M3 · Deep Learning",
    title: "Spatial Downscaling",
    desc: "Graph Neural Network over the block/district adjacency graph, propagating the global embedding into local rainfall signatures.",
  },
  {
    tag: "M3 · Deep Learning",
    title: "Temporal Forecasting Head",
    desc: "Temporal Fusion Transformer producing 7–30 day quantile forecasts — real uncertainty bands, not point estimates.",
  },
  {
    tag: "M4 · Machine Learning",
    title: "Calibration Ensemble",
    desc: "XGBoost blends DL outputs against historical break-monsoon labels — the credibility shield on sparse data.",
  },
  {
    tag: "M5 · Expert System",
    title: "Advisory Engine",
    desc: "Explainable rule-based layer mapping calibrated probabilities + crop stage to concrete farmer actions.",
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
          <div className="font-serif italic text-[17px] text-monsoon-glow mb-4">
            (Hybrid architecture)
          </div>
          <h2 className="font-display text-3xl font-medium text-paper tracking-tight leading-[1.1]">
            From planetary signals to a farmer&apos;s decision
          </h2>
          <p className="mt-4 text-[14.5px] text-fog leading-relaxed max-w-sm">
            Deep learning where it earns its place, calibration where honesty about
            data scarcity matters, and rules where explainability matters most.
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
              <div className="absolute -left-[52px] top-0 h-9 w-9 rounded-full border border-border bg-ink flex items-center justify-center">
                <span className="font-serif italic text-[16px] text-fog">{i + 1}</span>
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
