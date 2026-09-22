import { motion, useMotionTemplate, useSpring } from "framer-motion";

export default function TiltCard({ children, className = "", strength = 10, ...rest }) {
  const rx = useSpring(0, { stiffness: 300, damping: 25 });
  const ry = useSpring(0, { stiffness: 300, damping: 25 });
  const glowX = useSpring(50, { stiffness: 200, damping: 30 });
  const glowY = useSpring(50, { stiffness: 200, damping: 30 });
  const transform = useMotionTemplate`perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  const glowBg = useMotionTemplate`radial-gradient(220px circle at ${glowX}% ${glowY}%, rgba(95,227,211,0.12), transparent 70%)`;

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * strength * 2);
    rx.set(-(py - 0.5) * strength * 2);
    glowX.set(px * 100);
    glowY.set(py * 100);
  };
  const handleLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transform, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
      {...rest}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: glowBg }}
      />
      {children}
    </motion.div>
  );
}
