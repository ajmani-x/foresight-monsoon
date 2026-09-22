import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const links = [
  { href: "#map", label: "Risk Map" },
  { href: "#forecast", label: "Forecast" },
  { href: "#advisory", label: "Advisories" },
  { href: "#stack", label: "Model Stack" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-30 transition-[background-color,backdrop-filter,border-color] duration-500 ${
        scrolled ? "bg-ink/75 backdrop-blur-xl border-b border-white/5" : "border-b border-transparent"
      }`}
    >
      <div
        className={`mx-auto max-w-7xl px-6 lg:px-10 flex items-center justify-between transition-[height] duration-500 ${
          scrolled ? "h-16" : "h-20"
        } ${scrolled ? "" : "[text-shadow:0_1px_12px_rgba(6,7,12,0.9)]"}`}
      >
        <span className="font-display font-medium tracking-tight text-paper text-[15px]">
          Foresight
          <span className="ml-2 font-mono text-[10px] text-mist align-middle">SIH26086</span>
        </span>

        <nav className="flex items-center gap-6 md:gap-9 text-[13px] text-fog">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="group relative hidden md:inline py-1">
              {link.label}
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-monsoon-glow transition-all duration-300 ease-out group-hover:w-full" />
            </a>
          ))}
          <a href="#map" className="relative py-1 text-monsoon-glow">
            View live map
            <span className="absolute left-0 -bottom-0.5 h-px w-full bg-monsoon-glow/50" />
          </a>
        </nav>
      </div>
    </motion.header>
  );
}
