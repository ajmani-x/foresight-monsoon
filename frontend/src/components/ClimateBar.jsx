import { motion } from "framer-motion";
import { Activity, Waves, Wind } from "lucide-react";
import TiltCard from "./TiltCard";

export default function ClimateBar({ climate }) {
  if (!climate) return null;

  const items = [
    {
      icon: Waves,
      label: "ENSO",
      value: climate.enso.phase,
      sub: `${climate.enso.index}: ${climate.enso.value > 0 ? "+" : ""}${climate.enso.value}`,
      trend: climate.enso.trend,
    },
    {
      icon: Activity,
      label: "IOD",
      value: climate.iod.phase,
      sub: `${climate.iod.index}: ${climate.iod.value > 0 ? "+" : ""}${climate.iod.value}`,
      trend: climate.iod.trend,
    },
    {
      icon: Wind,
      label: "MJO",
      value: climate.mjo.phase_label,
      sub: `Amplitude: ${climate.mjo.amplitude}`,
      trend: climate.mjo.trend,
    },
  ];

  return (
    <section className="px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <TiltCard className="rounded-2xl border border-border bg-surface/60 p-5 transition-colors hover:border-monsoon/60 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-mist">
                    <motion.span
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3 }}
                    >
                      <item.icon size={13} className="text-monsoon-glow" />
                    </motion.span>
                    {item.label} · teleconnection encoder
                  </div>
                  <span className="text-[10px] text-mist border border-border rounded-full px-2 py-0.5 capitalize">
                    {item.trend}
                  </span>
                </div>
                <div className="font-display text-lg font-medium text-paper">{item.value}</div>
                <div className="mt-1 text-[12.5px] text-fog">{item.sub}</div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
        <div className="mt-3 text-center text-[11.5px] text-mist">
          Latent global climate state decoded from LSTM/Transformer teleconnection
          encoder · model confidence {Math.round((climate.model_confidence ?? 0.78) * 100)}%
        </div>
      </div>
    </section>
  );
}
