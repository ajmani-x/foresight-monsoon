import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const glowX = useSpring(x, { damping: 30, stiffness: 200, mass: 0.5 });
  const glowY = useSpring(y, { damping: 30, stiffness: 200, mass: 0.5 });
  const ringX = useSpring(x, { damping: 22, stiffness: 320, mass: 0.4 });
  const ringY = useSpring(y, { damping: 22, stiffness: 320, mass: 0.4 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!visible) setVisible(true);
      const el = e.target.closest?.("a, button, [role='button'], input, .cursor-hover");
      setHovering(Boolean(el));
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y, visible]);

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed z-10 h-[420px] w-[420px] rounded-full mix-blend-screen hidden md:block"
        animate={{ opacity: visible ? 1 : 0 }}
        style={{
          left: glowX,
          top: glowY,
          translateX: "-50%",
          translateY: "-50%",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.10) 0%, rgba(108,92,231,0.05) 45%, transparent 70%)",
        }}
      />
      <motion.div
        aria-hidden
        animate={{
          opacity: visible ? 1 : 0,
          scale: hovering ? 2.4 : 1,
          backgroundColor: hovering ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0)",
          borderColor: hovering ? "rgba(56,189,248,0.8)" : "rgba(169,174,200,0.6)",
        }}
        transition={{ scale: { type: "spring", stiffness: 300, damping: 20 } }}
        className="pointer-events-none fixed z-50 h-6 w-6 rounded-full border hidden md:block"
        style={{ left: ringX, top: ringY, translateX: "-50%", translateY: "-50%" }}
      />
      <motion.div
        aria-hidden
        animate={{ opacity: visible ? (hovering ? 0 : 1) : 0 }}
        className="pointer-events-none fixed z-50 h-1.5 w-1.5 rounded-full bg-monsoon-glow hidden md:block"
        style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
      />
    </>
  );
}
