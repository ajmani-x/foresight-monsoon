import { useEffect, useRef } from "react";

const COLORS = ["rgba(56,189,248,", "rgba(108,92,231,", "rgba(169,174,200,"];

export default function RainBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let drops = [];
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function makeDrop(randomY = true) {
      const speed = 5 + Math.random() * 7;
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -20,
        len: 14 + speed * 3,
        speed,
        drift: 1.1,
        opacity: 0.08 + Math.random() * 0.16,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    }

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.floor((width * height) / 14000));
      drops = Array.from({ length: count }, () => makeDrop(true));
    }

    function tick() {
      ctx.clearRect(0, 0, width, height);
      for (const d of drops) {
        ctx.strokeStyle = `${d.color}${d.opacity})`;
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.drift * 4, d.y + d.len);
        ctx.stroke();

        d.x -= d.drift;
        d.y += d.speed;
        if (d.y > height + 20) {
          Object.assign(d, makeDrop(false), { x: Math.random() * width });
        }
      }
      raf = requestAnimationFrame(tick);
    }

    resize();
    tick();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
    />
  );
}
