import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function DeskScene({
  stage,
  mac,
  desktop = false,
  cloud = false,
  office,
  onSelect,
}: {
  stage: number;
  mac: boolean;
  desktop?: boolean;
  cloud?: boolean;
  office: boolean;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ stage, mac, desktop, cloud, office, onSelect });
  state.current = { stage, mac, desktop, cloud, office, onSelect };
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(7, 6.5, 9);
    camera.lookAt(0, 0.8, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enablePan = false;
    controls.minDistance = 7;
    controls.maxDistance = 16;
    controls.minPolarAngle = 0.4;
    controls.maxPolarAngle = 1.45;
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xc7ecff, 0x514739, 3));
    const sun = new THREE.DirectionalLight(0xffe8c8, 4);
    sun.position.set(-3, 7, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const fill = new THREE.PointLight(0x92edc8, 20, 12);
    fill.position.set(4, 2, -2);
    scene.add(fill);
    const mats: THREE.Material[] = [];
    const mat = (color: number, metalness = 0, roughness = 0.65) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      mats.push(m);
      return m;
    };
    const wood = mat(0xc89462),
      dark = mat(0x223237, 0.4),
      black = mat(0x152024),
      silver = mat(0xb8c3c4, 0.7, 0.25),
      mint = mat(0x83e1be),
      white = mat(0xf6f0e6),
      screen = mat(0x163b43, 0.1, 0.3);
    function box(
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material,
    ) {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    }
    box(scene, 6.6, 0.22, 3.2, 0, 0, 0, wood);
    for (const x of [-2.8, 2.8])
      for (const z of [-1.1, 1.1])
        box(scene, 0.12, 1.7, 0.12, x, -0.95, z, dark);
    box(scene, 3.3, 0.02, 1.5, -0.5, 0.125, 0.65, dark);
    const floor = box(scene, 200, 0.1, 200, 0, -1.85, 0, mat(0xe5e6de));
    floor.receiveShadow = true;
    const groups: {
      group: THREE.Group;
      stage: number;
      id: string;
      mac?: boolean;
    }[] = [];
    function group(
      id: string,
      at: number,
      x: number,
      z: number,
      onlyMac?: boolean,
    ) {
      const g = new THREE.Group();
      g.position.set(x, 0.13, z);
      g.userData.id = id;
      scene.add(g);
      groups.push({ group: g, stage: at, id, mac: onlyMac });
      return g;
    }
    const monitor = group("software", 1, -0.8, -0.65);
    box(monitor, 0.65, 0.05, 0.45, 0, 0, 0, silver);
    box(monitor, 0.1, 0.65, 0.1, 0, 0.32, 0, silver);
    box(monitor, 2.45, 1.45, 0.13, 0, 1.12, 0, dark);
    box(monitor, 2.3, 1.3, 0.03, 0, 1.12, 0.083, screen);
    // A tiny, legible abstract editor, formed entirely from geometry.
    for (let i = 0; i < 7; i++)
      box(
        monitor,
        1.05 - (i % 3) * 0.16,
        0.035,
        0.025,
        -0.28 + (i % 2) * 0.12,
        1.55 - i * 0.14,
        0.11,
        i % 3 === 0 ? mint : white,
      );
    const tower = group("computer", 2, 2, -0.35, false);
    box(tower, 1, 1.9, 1.3, 0, 0.96, 0, dark);
    box(tower, 0.92, 1.8, 0.03, 0, 0.97, 0.67, black);
    for (const y of [0.5, 1.05, 1.6]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.035, 8, 24),
        mint,
      );
      ring.position.set(0, y, 0.7);
      tower.add(ring);
    }
    box(tower, 0.75, 0.025, 0.03, 0, 1.87, 0.7, silver);
    const studio = group("studio", 2, 1.65, -0.3, true);
    box(studio, 1.1, 0.45, 1.1, 0, 0.23, 0, silver);
    box(studio, 0.035, 0.02, 0.02, 0.35, 0.2, 0.56, mint);
    const laptop = group("laptop", 2, 0.25, 0.5, true);
    box(laptop, 1.85, 0.08, 1.15, 0, 0.05, 0, silver);
    const lid = box(laptop, 1.85, 1.1, 0.05, 0, 0.61, -0.53, silver);
    lid.rotation.x = -0.18;
    const panel = box(laptop, 1.7, 0.95, 0.025, 0, 0.61, -0.48, screen);
    panel.rotation.x = -0.18;
    box(laptop, 0.55, 0.01, 0.32, 0, 0.098, 0.27, dark);
    const gpu = group("gpu", 3, 2, -0.35, false);
    box(gpu, 0.82, 0.18, 0.9, 0, 1, 0, mint);
    box(gpu, 0.7, 0.03, 0.65, 0, 1.11, 0, black);
    for (const x of [-0.2, 0.2]) {
      const fan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.04, 20),
        silver,
      );
      fan.position.set(x, 1.15, 0);
      gpu.add(fan);
    }
    const keyboard = group("accessories", 4, -0.8, 0.7);
    box(keyboard, 1.6, 0.07, 0.55, 0, 0, 0, silver);
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 12; col++)
        box(
          keyboard,
          0.1,
          0.025,
          0.09,
          -0.7 + col * 0.126,
          0.05,
          -0.18 + row * 0.12,
          white,
        );
    const mouse = group("accessories", 4, 0.45, 0.8);
    const mouseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      white,
    );
    mouseMesh.scale.set(0.7, 0.4, 1.1);
    mouse.add(mouseMesh);
    const plant = group("accessories", 0, -2.55, -0.8);
    box(plant, 0.4, 0.4, 0.4, 0, 0.2, 0, white);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mint);
      leaf.scale.set(0.45, 1.8, 0.6);
      leaf.rotation.z = (i - 2) * 0.35;
      leaf.position.set((i - 2) * 0.055, 0.65, 0);
      plant.add(leaf);
    }
    const bots: THREE.Group[] = [];
    for (let i = 0; i < 3; i++) {
      const b = group("agents", 5, -2 + i * 0.75, -0.05);
      box(b, 0.26, 0.35, 0.24, 0, 0.18, 0, i === 1 ? mint : silver);
      box(b, 0.3, 0.25, 0.28, 0, 0.5, 0, white);
      box(b, 0.2, 0.06, 0.02, 0, 0.52, 0.15, dark);
      bots.push(b);
    }
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
      const r = el.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(
        groups.filter((x) => x.group.visible).map((x) => x.group),
        true,
      )[0];
      if (hit) {
        let o: THREE.Object3D | null = hit.object;
        while (o && !o.userData.id) o = o.parent;
        if (o) state.current.onSelect(o.userData.id);
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onClick);
    const resize = () => {
      const w = el.clientWidth,
        h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0;
    const visible = new Map<THREE.Group, number>();
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden || time - last < 33) return;
      last = time;
      for (const item of groups) {
        const show =
          state.current.stage >= item.stage &&
          (item.mac === undefined || item.mac === state.current.mac) &&
          (item.id !== "studio" || state.current.desktop) &&
          (item.id !== "laptop" || !state.current.desktop) &&
          (!state.current.cloud ||
            !["computer", "gpu", "studio", "laptop"].includes(item.id)) &&
          (item.id !== "agents" || state.current.office);
        if (show && !item.group.visible) visible.set(item.group, time);
        item.group.visible = show;
        const elapsed = (time - (visible.get(item.group) ?? 0)) / 900;
        item.group.position.y =
          0.13 +
          (motion.matches
            ? 0
            : Math.pow(Math.max(0, 1 - elapsed), 3) *
              (item.id === "gpu" ? 5 : 3));
        if (item.id === "gpu" && elapsed > 1) item.group.position.y = 0.13;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    for (const x of groups) x.group.visible = false;
    frame = requestAnimationFrame(draw);
    const lost = (e: Event) => {
      e.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onClick);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      mats.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      className="desk-scene"
      ref={host}
      role="img"
      aria-label={`Interactive workstation desk, assembly step ${stage} of 5. Components are also listed below.`}
    >
      {fallback && (
        <div className="desk-fallback">
          <span>YOUR WORKSPACE</span>
          <div>
            🖥️ {stage > 1 ? (mac ? "💻" : "▣") : ""} {stage > 3 ? "⌨️" : ""}{" "}
            {stage > 4 && office ? "🤖 🤖 🤖" : ""}
          </div>
          <small>
            3D is unavailable on this device. Your complete build is below.
          </small>
        </div>
      )}
    </div>
  );
}
