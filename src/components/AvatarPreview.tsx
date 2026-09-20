import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Rotate3D, UserRound } from "lucide-react";
import {
  createAvatar,
  DEFAULT_AVATAR,
  disposeObject,
  houseColor,
} from "./three/avatar";
import type { AvatarConfig } from "./three/avatar";
import "./world.css";

export { DEFAULT_AVATAR };
export type { AvatarConfig };

export default function AvatarPreview({
  config,
  house,
  className = "",
}: {
  config: AvatarConfig;
  house?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ config, house });
  propsRef.current = { config, house };
  const refresh = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Live 3D preview of your custom agent. Drag to rotate.",
    );
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camera.position.set(0, 2.05, 5.1);
    camera.lookAt(0, 1.05, 0);
    scene.add(new THREE.AmbientLight("#241239", 1.55));
    scene.add(new THREE.HemisphereLight("#ffe3a0", "#12081f", 2));
    const light = new THREE.DirectionalLight("#f2c766", 3);
    light.position.set(-3, 6, 4);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -3;
    light.shadow.camera.right = 3;
    light.shadow.camera.top = 4;
    light.shadow.camera.bottom = -2;
    light.shadow.normalBias = 0.03;
    scene.add(light);
    const rim = new THREE.DirectionalLight("#9c6cff", 1.5);
    rim.position.set(3, 3, -3);
    scene.add(rim);
    let agent = createAvatar(propsRef.current.config, propsRef.current.house);
    agent.rotation.y = -0.3;
    scene.add(agent);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.93, 1.04, 0.13, 64),
      new THREE.MeshStandardMaterial({ color: "#171126", roughness: 0.8 }),
    );
    plinth.position.y = -0.075;
    plinth.receiveShadow = true;
    scene.add(plinth);
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.956, 0.018, 5, 64),
      new THREE.MeshStandardMaterial({
        color: houseColor(propsRef.current.house),
      }),
    );
    stripe.rotation.x = Math.PI / 2;
    stripe.position.y = -0.02;
    scene.add(stripe);
    refresh.current = () => {
      const next = createAvatar(
        propsRef.current.config,
        propsRef.current.house,
      );
      next.rotation.copy(agent.rotation);
      scene.remove(agent);
      disposeObject(agent);
      agent = next;
      scene.add(agent);
      stripe.material.color.set(houseColor(propsRef.current.house));
      renderer.render(scene, camera);
    };
    let drag: { x: number; angle: number } | null = null;
    const down = (event: PointerEvent) => {
      drag = { x: event.clientX, angle: agent.rotation.y };
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (drag)
        agent.rotation.y = drag.angle + (event.clientX - drag.x) * 0.014;
    };
    const up = () => {
      drag = null;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const resize = () => {
      const width = host.clientWidth || 320,
        height = host.clientHeight || 390;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
      renderer.domElement.dataset.ready = "true";
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden) return;
      const body = agent.userData.body as THREE.Group;
      body.position.y = reduced.matches ? 0 : Math.sin(time / 850) * 0.008;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      refresh.current = null;
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      disposeObject(scene);
      light.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    refresh.current?.();
  }, [config, house]);
  return (
    <div
      className={`agent-preview ${className}`}
      style={
        { "--agent-house-color": houseColor(house) } as React.CSSProperties
      }
    >
      <div className="agent-preview__halo" />
      <div className="agent-preview__house">{house || "Your"} agent</div>
      <div
        ref={hostRef}
        className={`agent-preview__canvas ${failed ? "agent-preview__canvas--failed" : ""}`}
      />
      {failed ? (
        <div className="agent-preview__fallback">
          <UserRound size={72} style={{ color: config.outfit }} />
          <p>
            Your choices are saved.
            <br />
            The 3D preview is unavailable on this device.
          </p>
        </div>
      ) : (
        <span className="agent-preview__rotate">
          <Rotate3D size={15} />
          Drag to see every angle
        </span>
      )}
    </div>
  );
}
