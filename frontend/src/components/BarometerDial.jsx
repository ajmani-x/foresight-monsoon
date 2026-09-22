import { useMemo } from "react";
import { motion } from "framer-motion";

// A real instrument reading, not decoration: maps the ENSO index onto a
// barometric-style dial (960-1040 hPa is the realistic surface pressure
// range) so the needle position means something even before real model
// data is wired in.
const MIN_HPA = 960;
const MAX_HPA = 1040;
const START_ANGLE = -130;
const END_ANGLE = 130;

function valueToAngle(value) {
  const t = (value - MIN_HPA) / (MAX_HPA - MIN_HPA);
  return START_ANGLE + t * (END_ANGLE - START_ANGLE);
}

export default function BarometerDial({ climate }) {
  const pressure = useMemo(() => {
    const enso = climate?.enso?.value ?? 0;
    // weaker La Nina / El Nino swings the reading around a 1006hPa baseline
    return 1006 + enso * -14;
  }, [climate]);

  const angle = valueToAngle(pressure);
  const ticks = Array.from({ length: 17 }, (_, i) => i);

  return (
    <div className="relative w-[220px] h-[220px] shrink-0">
      <svg viewBox="0 0 220 220" className="w-full h-full">
        <circle cx="110" cy="110" r="98" fill="none" stroke="var(--color-border)" strokeWidth="1" />
        <circle cx="110" cy="110" r="86" fill="none" stroke="var(--color-border)" strokeWidth="0.5" />

        {ticks.map((i) => {
          const t = i / (ticks.length - 1);
          const tickAngle = START_ANGLE + t * (END_ANGLE - START_ANGLE);
          const rad = (tickAngle * Math.PI) / 180;
          const major = i % 4 === 0;
          const r1 = major ? 78 : 84;
          const r2 = 92;
          const x1 = 110 + r1 * Math.sin(rad);
          const y1 = 110 - r1 * Math.cos(rad);
          const x2 = 110 + r2 * Math.sin(rad);
          const y2 = 110 - r2 * Math.cos(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-mist)"
              strokeWidth={major ? 1.2 : 0.6}
            />
          );
        })}

        <motion.g
          initial={{ rotate: START_ANGLE }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 40, damping: 12, delay: 1.8 }}
          style={{ transformOrigin: "110px 110px" }}
        >
          <line x1="110" y1="110" x2="110" y2="40" stroke="var(--color-monsoon-glow)" strokeWidth="1.5" />
          <circle cx="110" cy="110" r="4" fill="var(--color-monsoon-glow)" />
        </motion.g>
        <circle cx="110" cy="110" r="2" fill="var(--color-ink)" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
        <div className="font-mono text-[10px] tracking-[0.15em] uppercase text-mist">hPa</div>
        <div className="font-display text-2xl font-medium text-paper tabular-nums">
          {pressure.toFixed(0)}
        </div>
        <div className="mt-1 font-mono text-[9.5px] tracking-[0.1em] uppercase text-mist">
          Surface pressure
        </div>
      </div>
    </div>
  );
}
