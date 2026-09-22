import { motion } from "framer-motion";
import TiltCard from "./TiltCard";

export default function ClimateBar({ climate }) {
  if (!climate) return null;

  const items = [
    {
      label: "ENSO",
      value: climate.enso.phase,
      sub: `${climate.enso.index} ${climate.enso.value > 0 ? "+" : ""}${climate.enso.value}`,
      trend: climate.enso.trend,
    },
    {
      label: "IOD",
      value: climate.iod.phase,
      sub: `${climate.iod.index} ${climate.iod.value > 0 ? "+" : ""}${climate.iod.value}`,
      trend: climate.iod.trend,
    },
    {
      label: "MJO",
      value: climate.mjo.phase_label,
      sub: `Amplitude ${climate.mjo.amplitude}`,
      trend: climate.mjo.trend,
    },
  ];

  return (
    <section className="px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-7xl"
      >
        <TiltCard className="rounded-2xl border border-border bg-surface/40 overflow-hidden" strength={4}>
          <div className="flex items-center justify-between px-6 pt-5 font-mono text-[10px] tracking-[0.2em] uppercase text-mist">
            <span>Teleconnection readout</span>
            <span>
              confidence <span className="text-paper">{Math.round((climate.model_confidence ?? 0.78) * 100)}%</span>
            </span>
          </div>
          <div className="mt-4 grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {items.map((item, i) => (
              <div key={item.label} className="px-6 py-5">
                <div className="flex items-center justify-between font-mono text-[10.5px] tracking-[0.18em] uppercase text-mist mb-3">
                  <span className="text-monsoon-glow">{item.label}</span>
                  <span className="capitalize">{item.trend}</span>
                </div>
                <div className="font-display text-lg font-medium text-paper leading-snug">{item.value}</div>
                <div className="mt-1.5 font-mono text-[12px] text-fog">{item.sub}</div>
              </div>
            ))}
          </div>
        </TiltCard>
      </motion.div>
    </section>
  );
}
