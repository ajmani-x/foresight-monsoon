import { useEffect, useRef } from "react";
import * as THREE from "three";

const PALETTE = [
  [0.22, 0.74, 0.97], // sky #38bdf8
  [0.42, 0.36, 0.91], // violet #6c5ce7
  [0.75, 0.52, 0.99], // light purple #c084fc
];

export default function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // --- Particle field: layered "atmosphere" of drifting points ---
    const COUNT = 1800;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const radius = 5 + Math.random() * 7;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 10;
      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * radius - 4;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];

      sizes[i] = Math.random() * 2.2 + 0.4;
      seeds[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // subtle connective "signal" lines — a handful of long streaks suggesting
    // teleconnection data flowing from the global field toward the viewer
    const streakGeo = new THREE.BufferGeometry();
    const STREAKS = 26;
    const streakPos = new Float32Array(STREAKS * 2 * 3);
    for (let i = 0; i < STREAKS; i++) {
      const radius = 6 + Math.random() * 5;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 8;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius - 4;
      streakPos.set([x, y, z, x * 0.3, y * 0.3, z * 0.3 + 2], i * 6);
    }
    streakGeo.setAttribute("position", new THREE.BufferAttribute(streakPos, 3));
    const streakMat = new THREE.LineBasicMaterial({
      color: 0x6c8ff0,
      transparent: true,
      opacity: 0.12,
    });
    const streaks = new THREE.LineSegments(streakGeo, streakMat);
    scene.add(streaks);

    let raf;
    let t = 0;
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    const posAttr = geometry.getAttribute("position");

    function animate() {
      t += 0.0042;
      points.rotation.y = t * 0.35;
      points.rotation.x = Math.sin(t * 0.25) * 0.08;

      for (let i = 0; i < COUNT; i++) {
        const seed = seeds[i];
        const baseY = positions[i * 3 + 1];
        posAttr.array[i * 3 + 1] = baseY + Math.sin(t * 1.6 + seed) * 0.18;
      }
      posAttr.needsUpdate = true;

      streaks.rotation.y = -t * 0.22;

      camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.02;
      camera.position.y += (-pointer.y * 0.8 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, -2);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    function handleResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
    />
  );
}
