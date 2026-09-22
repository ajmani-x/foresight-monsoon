import { motion } from "framer-motion";
import { CloudRain } from "lucide-react";

const links = [
  { href: "#map", label: "Risk Map" },
  { href: "#forecast", label: "Forecast" },
  { href: "#advisory", label: "Advisories" },
  { href: "#stack", label: "Model Stack" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 inset-x-0 z-30 border-b border-white/5 bg-ink/70 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 180 }}
            className="h-8 w-8 rounded-lg bg-monsoon/15 border border-monsoon/30 flex items-center justify-center"
          >
            <CloudRain size={16} className="text-monsoon-glow" strokeWidth={2.2} />
          </motion.div>
          <span className="font-display font-semibold tracking-tight text-paper text-[15px]">
            Foresight
          </span>
          <span className="hidden sm:inline text-[11px] text-mist border border-border rounded-full px-2 py-0.5 ml-1">
            SIH26086
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-[13px] text-fog">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="group relative py-1">
              {link.label}
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-monsoon-glow transition-all duration-300 ease-out group-hover:w-full" />
            </a>
          ))}
        </nav>

        <motion.a
          href="#map"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="text-[13px] font-medium bg-paper text-ink rounded-full px-4 py-2 hover:bg-monsoon-glow transition-colors"
        >
          View Live Map
        </motion.a>
      </div>
    </motion.header>
  );
}
