import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight, Sparkles } from "lucide-react";
import { useCountUp } from "../hooks/useCountUp";
import RainBackground from "./RainBackground";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  }),
};

const words1 = ["Monsoon", "behaviour,"];
const words2 = ["block", "by", "block."];

const wordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const wordItem = {
  hidden: { opacity: 0, y: "110%", rotate: 4 },
  show: {
    opacity: 1,
    y: "0%",
    rotate: 0,
    transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
  },
};

const STATES = [
  "Maharashtra", "Karnataka", "Tamil Nadu", "Andhra Pradesh", "Telangana", "Kerala",
  "Gujarat", "Rajasthan", "Madhya Pradesh", "Uttar Pradesh", "Bihar", "West Bengal",
  "Odisha", "Jharkhand", "Chhattisgarh", "Punjab", "Haryana", "Assam",
];

export default function Hero({ summary }) {
  const total = summary?.total_districts ?? 74;
  const breakCount = summary?.counts?.break_risk ?? 0;
  const onsetCount = summary?.counts?.onset_favorable ?? 0;

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const blobY1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const blobY2 = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative overflow-hidden pt-40 pb-28 px-6 lg:px-10">
      <RainBackground />
      <FloatingBlobs y1={blobY1} y2={blobY2} />

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="relative mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          animate="show"
          custom={0}
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-[12px] text-fog mb-8"
        >
          <motion.span
            animate={{ rotate: [0, 15, -10, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
          >
            <Sparkles size={13} className="text-monsoon-glow" />
          </motion.span>
          Hybrid DL forecasting for NCMRWF · Ministry of Earth Sciences
        </motion.div>

        <h1 className="font-display font-semibold tracking-tight text-[clamp(2.6rem,6vw,5.5rem)] leading-[0.98] text-paper max-w-5xl">
          <motion.span
            initial="hidden"
            animate="show"
            variants={wordContainer}
            className="flex flex-wrap gap-x-[0.28em] overflow-hidden pb-1"
          >
            {words1.map((w) => (
              <span key={w} className="overflow-hidden inline-block pb-1">
                <motion.span variants={wordItem} className="inline-block">
                  {w}
                </motion.span>
              </span>
            ))}
          </motion.span>
          <motion.span
            initial="hidden"
            animate="show"
            variants={wordContainer}
            className="text-gradient flex flex-wrap gap-x-[0.28em] overflow-hidden pb-1"
          >
            {words2.map((w) => (
              <span key={w} className="overflow-hidden inline-block pb-1">
                <motion.span variants={wordItem} className="inline-block">
                  {w}
                </motion.span>
              </span>
            ))}
          </motion.span>
        </h1>

        <motion.p
          initial="hidden"
          animate="show"
          custom={4}
          variants={fadeUp}
          className="mt-8 max-w-xl text-[16px] leading-relaxed text-fog"
        >
          A hybrid deep learning pipeline — teleconnection encoders, spatial-temporal
          graph networks, and calibrated ensembles — turning ENSO, IOD, and MJO signals
          into a 7-to-30-day onset, break, and revival outlook for every district.
        </motion.p>

        <motion.div
          initial="hidden"
          animate="show"
          custom={5}
          variants={fadeUp}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <MagneticButton href="#map" primary>
            Explore the risk map
            <ArrowDownRight size={16} />
          </MagneticButton>
          <MagneticButton href="#stack">See the model architecture</MagneticButton>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="show"
          custom={6}
          variants={fadeUp}
          className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border bg-border"
        >
          <Stat value={total} label="Districts tracked" />
          <Stat value={breakCount} label="Break-risk alerts live" accent="text-rose" />
          <Stat value={onsetCount} label="Favorable onset zones" accent="text-monsoon-glow" />
          <Stat value="7–30" label="Day forecast horizon" isText />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="relative mt-16 border-y border-border/60 py-3 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]"
      >
        <motion.div
          className="flex gap-8 whitespace-nowrap text-[12px] text-mist"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 34, repeat: Infinity, ease: "linear" }}
        >
          {[...STATES, ...STATES].map((s, i) => (
            <span key={i} className="flex items-center gap-8">
              {s}
              <span className="h-1 w-1 rounded-full bg-border" />
            </span>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-[10.5px] uppercase tracking-[0.2em] text-mist">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-5 rounded-full border border-border flex items-start justify-center pt-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-monsoon-glow" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function FloatingBlobs({ y1, y2 }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div style={{ y: y1 }} className="absolute -top-40 left-1/2 -translate-x-1/2">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="h-[640px] w-[900px] -translate-x-1/2 rounded-full bg-monsoon/10 blur-[140px]"
        />
      </motion.div>
      <motion.div style={{ y: y2 }} className="absolute top-20 right-0">
        <motion.div
          animate={{ x: [0, -30, 20, 0], y: [0, 20, -20, 0], scale: [1, 1.08, 0.96, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="h-[420px] w-[420px] rounded-full bg-amber/10 blur-[120px]"
        />
      </motion.div>
      <motion.div style={{ y: y1 }} className="absolute bottom-0 left-0">
        <motion.div
          animate={{ x: [0, 25, -15, 0], y: [0, -15, 25, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="h-[360px] w-[360px] rounded-full bg-rose/5 blur-[120px]"
        />
      </motion.div>
    </div>
  );
}

function MagneticButton({ href, children, primary }) {
  const handleMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${relX * 0.18}px, ${relY * 0.35}px)`;
  };
  const handleLeave = (e) => {
    e.currentTarget.style.transform = "translate(0px, 0px)";
  };

  return (
    <a
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={
        primary
          ? "group inline-flex items-center gap-2 rounded-full bg-monsoon px-5 py-3 text-[14px] font-medium text-ink transition-[background-color,transform] duration-300 ease-out hover:bg-monsoon-glow"
          : "group inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-[14px] font-medium text-paper transition-[border-color,transform] duration-300 ease-out hover:border-mist"
      }
      style={{ willChange: "transform" }}
    >
      {children}
    </a>
  );
}

function Stat({ value, label, accent = "text-paper", isText }) {
  const animated = useCountUp(isText ? 0 : value, { duration: 1400 });
  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      className="bg-ink px-6 py-6"
    >
      <div className={`font-display text-3xl font-semibold ${accent} tabular-nums`}>
        {isText ? value : animated}
      </div>
      <div className="mt-1 text-[12.5px] text-mist">{label}</div>
    </motion.div>
  );
}
