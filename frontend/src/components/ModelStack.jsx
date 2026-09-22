import { motion } from "framer-motion";
import { ArrowRight, Brain, GitBranch, Network, Scale, Sprout } from "lucide-react";
import { SectionHeading } from "./RiskMap";
import TiltCard from "./TiltCard";

const STAGES = [
  {
    icon: Brain,
    tag: "M2 · Deep Learning",
    title: "Teleconnection Encoder",
    desc: "LSTM / Transformer over ENSO, IOD and MJO time series, learning a latent global climate-state embedding.",
  },
  {
    icon: Network,
    tag: "M3 · Deep Learning",
    title: "Spatial Downscaling",
    desc: "Graph Neural Network over the block/district adjacency graph, propagating the global embedding into local rainfall signatures.",
  },
  {
    icon: GitBranch,
    tag: "M3 · Deep Learning",
    title: "Temporal Forecasting Head",
    desc: "Temporal Fusion Transformer producing 7–30 day quantile forecasts — real uncertainty bands, not point estimates.",
  },
  {
    icon: Scale,
    tag: "M4 · Machine Learning",
    title: "Calibration Ensemble",
    desc: "XGBoost blends DL outputs against historical break-monsoon labels — the credibility shield on sparse data.",
  },
  {
    icon: Sprout,
    tag: "M5 · Expert System",
    title: "Advisory Engine",
    desc: "Explainable rule-based layer mapping calibrated probabilities + crop stage to concrete farmer actions.",
  },
];

export default function ModelStack() {
  return (
    <section id="stack" className="px-6 lg:px-10 py-24 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Hybrid architecture"
          title="From planetary signals to a farmer's decision"
          description="Five stages, each with a defensible scientific role — deep learning where it earns its place, calibration where honesty about data scarcity matters, and rules where explainability matters most."
        />

        <div className="mt-12 grid md:grid-cols-5 gap-4">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <TiltCard className="rounded-2xl border border-border bg-surface/60 p-5 flex flex-col h-full transition-colors overflow-hidden hover:border-monsoon/60">

                <motion.div
                  whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
                  transition={{ duration: 0.5 }}
                  className="h-10 w-10 rounded-xl bg-monsoon/10 border border-monsoon/25 flex items-center justify-center mb-5"
                >
                  <s.icon size={17} className="text-monsoon-glow" />
                </motion.div>
                <div className="text-[10.5px] uppercase tracking-wider text-mist mb-2">{s.tag}</div>
                <div className="font-display text-[15px] font-semibold text-paper leading-snug">
                  {s.title}
                </div>
                <p className="mt-2 text-[12.5px] text-fog leading-relaxed flex-1">{s.desc}</p>
              </TiltCard>

              {i < STAGES.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                  className="hidden md:block absolute -right-[22px] top-1/2 -translate-y-1/2 text-mist z-10"
                >
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                  >
                    <ArrowRight size={16} />
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6 }}
          className="mt-8 rounded-2xl border border-border bg-surface/40 p-5 text-[12.5px] text-mist leading-relaxed"
        >
          <span className="text-fog font-medium">Data sources: </span>
          IMD gridded daily rainfall (0.25°) · NOAA ENSO (Niño 3.4) · BoM IOD/DMI · BoM MJO (RMM1/RMM2) ·
          ERA5 reanalysis (humidity, wind shear, soil moisture, SST) · ICAR crop calendars for advisory mapping.
        </motion.div>
      </div>
    </section>
  );
}
