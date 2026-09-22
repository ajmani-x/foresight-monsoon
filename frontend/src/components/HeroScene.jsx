import { useEffect, useRef } from "react";
import * as THREE from "three";

// Storm-cluster centers scattered across the scene — each a distinct
// "weather system" of drifting particles, echoing scattered nebulae
// against a deep-space starfield rather than a single uniform cloud.
const CLUSTERS = [
  { pos: [-6.5, 3.2, -3], radius: 2.4, count: 340, color: [0.43, 0.37, 0.96] }, // indigo
  { pos: [6, 4, -6], radius: 2.1, count: 300, color: [0.96, 0.37, 0.76] }, // pink
  { pos: [-7.5, -3.5, -8], radius: 2.6, count: 320, color: [0.48, 0.79, 1.0] }, // sky
  { pos: [7.5, -3, -4], radius: 2.0, count: 260, color: [0.68, 0.5, 0.98] }, // violet
  { pos: [0, -4.5, -10], radius: 2.8, count: 300, color: [0.43, 0.37, 0.96] },
];

export default function HeroScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // --- Deep starfield: sparse, tiny, full-bleed points for atmosphere ---
    const STAR_COUNT = 900;
    const starPos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 40;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 26;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 8;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.028,
      color: 0xb8bce0,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- Storm clusters: gaussian-ish particle clouds around scattered centers ---
    const clusterGroup = new THREE.Group();
    const clusterMeshes = [];

    CLUSTERS.forEach((c) => {
      const positions = new Float32Array(c.count * 3);
      const colors = new Float32Array(c.count * 3);
      for (let i = 0; i < c.count; i++) {
        // gaussian-ish spread via sum of uniforms (central limit trick)
        const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        positions[i * 3] = c.pos[0] + g() * c.radius;
        positions[i * 3 + 1] = c.pos[1] + g() * c.radius;
        positions[i * 3 + 2] = c.pos[2] + g() * c.radius;

        const warmth = Math.random() < 0.12 ? 1 : 0; // occasional warm highlight
        colors[i * 3] = warmth ? 0.98 : c.color[0] + (Math.random() - 0.5) * 0.08;
        colors[i * 3 + 1] = warmth ? 0.78 : c.color[1] + (Math.random() - 0.5) * 0.08;
        colors[i * 3 + 2] = warmth ? 0.45 : c.color[2] + (Math.random() - 0.5) * 0.08;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const mesh = new THREE.Points(geo, mat);
      clusterGroup.add(mesh);
      clusterMeshes.push({ mesh, seed: Math.random() * Math.PI * 2, basePos: [...c.pos] });
    });
    scene.add(clusterGroup);

    // A thin dense band suggesting the ITCZ / monsoon trough line
    const BAND_COUNT = 500;
    const bandPos = new Float32Array(BAND_COUNT * 3);
    const bandCol = new Float32Array(BAND_COUNT * 3);
    for (let i = 0; i < BAND_COUNT; i++) {
      const t = (i / BAND_COUNT) * 2 - 1;
      bandPos[i * 3] = t * 13 + (Math.random() - 0.5) * 0.6;
      bandPos[i * 3 + 1] = (Math.random() - 0.5) * 0.25 - 0.3;
      bandPos[i * 3 + 2] = -5 + (Math.random() - 0.5) * 1.2;
      const mix = Math.random();
      bandCol[i * 3] = 0.45 + mix * 0.4;
      bandCol[i * 3 + 1] = 0.4 + mix * 0.3;
      bandCol[i * 3 + 2] = 0.9 + mix * 0.1;
    }
    const bandGeo = new THREE.BufferGeometry();
    bandGeo.setAttribute("position", new THREE.BufferAttribute(bandPos, 3));
    bandGeo.setAttribute("color", new THREE.BufferAttribute(bandCol, 3));
    const bandMat = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const band = new THREE.Points(bandGeo, bandMat);
    scene.add(band);

    let raf;
    let t = 0;
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove);

    function animate() {
      t += 0.0035;
      stars.rotation.y = t * 0.02;
      clusterGroup.rotation.y = t * 0.05;

      clusterMeshes.forEach(({ mesh, seed }, i) => {
        mesh.position.y = Math.sin(t * 0.6 + seed) * 0.15;
        mesh.rotation.z = Math.sin(t * 0.3 + seed) * 0.05;
      });

      band.rotation.z = Math.sin(t * 0.15) * 0.02;

      camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.02;
      camera.position.y += (-pointer.y * 1.0 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, -3);

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
      starGeo.dispose();
      starMat.dispose();
      bandGeo.dispose();
      bandMat.dispose();
      clusterMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full [mask-image:radial-gradient(ellipse_95%_85%_at_50%_35%,black,transparent)]"
    />
  );
}
