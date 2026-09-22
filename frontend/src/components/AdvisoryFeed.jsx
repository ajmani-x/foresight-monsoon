import { motion } from "framer-motion";
import { MessageCircleWarning } from "lucide-react";
import { SEVERITY_META } from "../lib/risk";
import { SectionHeading } from "./RiskMap";

export default function AdvisoryFeed({ items, onSelect }) {
  return (
    <section id="advisory" className="px-6 lg:px-10 py-24 border-t border-border">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <SectionHeading
            eyebrow="Last-mile delivery · WhatsApp / SMS gateway"
            title="Live advisory feed"
            description="The same text pushed to farmers and extension officers in regional languages, ranked by urgency."
          />
        </div>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, i) => {
            const meta = SEVERITY_META[item.advisory.severity];
            return (
              <motion.button
                key={item.district_id}
                onClick={() => onSelect(item.district_id)}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: (i % 6) * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -5, borderColor: meta.color }}
                style={{ "--glow": meta.color }}
                className="group relative text-left rounded-2xl border border-border bg-surface/60 p-5 transition-colors overflow-hidden"
              >
                <div
                  className="pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl"
                  style={{ background: meta.color }}
                />
                <div className="relative flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium"
                    style={{ color: meta.color, background: `${meta.color}1a` }}
                  >
                    <motion.span
                      animate={
                        item.advisory.severity === "critical" ? { scale: [1, 1.3, 1] } : {}
                      }
                      transition={{ duration: 1.4, repeat: Infinity }}
                    >
                      <MessageCircleWarning size={11} />
                    </motion.span>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-mist">{item.state}</span>
                </div>
                <div className="relative font-display text-[15px] font-semibold text-paper">
                  {item.district_name}
                </div>
                <div className="relative text-[12px] text-mist mb-2">{item.primary_crop}</div>
                <p className="relative text-[13px] text-fog leading-relaxed line-clamp-3">
                  {item.advisory.message_en}
                </p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
