import { CloudRain } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 lg:px-10 py-10">
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[13px] text-mist">
          <CloudRain size={14} className="text-monsoon-glow" />
          Foresight — Hyperlocal Monsoon Onset &amp; Break Prediction System
        </div>
        <div className="text-[12px] text-mist">
          Smart India Hackathon 2026 · Problem Statement 26086 · Ministry of Earth Sciences (NCMRWF)
        </div>
      </div>
    </footer>
  );
}
