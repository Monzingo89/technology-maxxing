import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArrowUpRight, Compass, Maximize2, MousePointer2 } from "lucide-react";
import {
  createAvatar,
  DEFAULT_AVATAR,
  disposeObject,
  houseColor,
} from "./three/avatar";
import type { AvatarConfig } from "./three/avatar";
import { createIsland, labelSprite, PLACES } from "./three/island";
import "./world.css";

export interface WorldPerson {
  id: string;
  name: string;
  house?: string;
  avatar?: AvatarConfig;
  position?: { x: number; z: number };
}

export interface WorldProps {
  avatar?: AvatarConfig;
  house?: string;
  people?: WorldPerson[];
  onPlace: (id: string) => void;
  onPerson?: (person: WorldPerson) => void;
  onMove?: (position: { x: number; z: number }) => void;
  interactive?: boolean;
  className?: string;
}

const EMPTY_PEOPLE: WorldPerson[] = [];

function blocked(x: number, z: number) {
  return (
    Math.abs(x) > 8.3 ||
    Math.abs(z) > 6.9 ||
    Math.hypot(x, z) < 1.03 ||
    PLACES.some((p) => Math.abs(x - p.x) < 1.8 && Math.abs(z - p.z) < 1.5)
  );
}

// A small grid keeps tap-to-walk paths away from buildings and the central portal.
function route(from: THREE.Vector3, target: THREE.Vector3) {
  const step = 0.5;
  const snap = (n: number) => Math.round(n / step);
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = snap(from.x),
    sz = snap(from.z),
    tx = snap(target.x),
    tz = snap(target.z);
  if (blocked(tx * step, tz * step)) return [];
  const frontier = [{ x: sx, z: sz, cost: 0, rank: 0 }];
  const previous = new Map<string, string>();
  const costs = new Map([[key(sx, sz), 0]]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ];
  for (let tries = 0; frontier.length && tries < 1400; tries++) {
    frontier.sort((a, b) => a.rank - b.rank);
    const current = frontier.shift()!;
    if (current.x === tx && current.z === tz) {
      const points: THREE.Vector3[] = [];
      let cursor = key(tx, tz);
      while (cursor !== key(sx, sz)) {
        const [x, z] = cursor.split(",").map(Number);
        points.unshift(new THREE.Vector3(x * step, 0.15, z * step));
        cursor = previous.get(cursor)!;
        if (!cursor) break;
      }
      if (!blocked(target.x, target.z)) points.push(target.clone());
      return points;
    }
    for (const [dx, dz] of dirs) {
      const nx = current.x + dx,
        nz = current.z + dz;
      if (blocked(nx * step, nz * step)) continue;
      if (
        dx &&
        dz &&
        (blocked((current.x + dx) * step, current.z * step) ||
          blocked(current.x * step, (current.z + dz) * step))
      )
        continue;
      const cost = current.cost + Math.hypot(dx, dz);
      const id = key(nx, nz);
      if (cost >= (costs.get(id) ?? Infinity)) continue;
      costs.set(id, cost);
      previous.set(id, key(current.x, current.z));
      frontier.push({
        x: nx,
        z: nz,
        cost,
        rank: cost + Math.hypot(nx - tx, nz - tz),
      });
    }
  }
  return [];
}

export default function World({
  avatar = DEFAULT_AVATAR,
  house,
  people = EMPTY_PEOPLE,
  onPlace,
  onPerson,
  onMove,
  interactive = true,
  className = "",
}: WorldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onPlace, onPerson, onMove });
  callbacks.current = { onPlace, onPerson, onMove };
  const propsRef = useRef({ avatar, house, people });
  propsRef.current = { avatar, house, people };
  const sceneApi = useRef<{
    refreshPlayer: () => void;
    refreshPeople: () => void;
    reset: () => void;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);

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
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 150);
    camera.position.set(18, 22, 26);
    camera.lookAt(0, 0.4, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.23;
    renderer.setClearColor("#080611", 0);
    renderer.domElement.setAttribute(
      "aria-label",
      "AI Space island. Use the place buttons to visit the Daily Arena, Library, Agent Academy, Prompt Gallery, or Commons.",
    );
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.tabIndex = interactive ? 0 : -1;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight("#241239", 1.2));
    scene.add(new THREE.HemisphereLight("#ffe3a0", "#12081f", 2));
    const sun = new THREE.DirectionalLight("#f2c766", 3.1);
    sun.position.set(-8, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -14,
      right: 14,
      top: 14,
      bottom: -14,
      near: 0.1,
      far: 70,
    });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    const island = createIsland();
    scene.add(island.root);
    // The transparent ground receives a soft anchoring shadow beneath the floating island.
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.7;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    let player = createAvatar(propsRef.current.avatar, propsRef.current.house);
    player.position.set(0, 0.15, 4.1);
    player.scale.setScalar(0.8);
    player.rotation.y = -0.45;
    scene.add(player);
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.38, 32),
      new THREE.MeshBasicMaterial({
        color: houseColor(propsRef.current.house),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.copy(player.position);
    marker.position.y = 0.174;
    scene.add(marker);
    const destination = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.25, 24),
      new THREE.MeshBasicMaterial({
        color: "#f2c766",
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    destination.rotation.x = -Math.PI / 2;
    destination.visible = false;
    scene.add(destination);
    let otherAgents = new THREE.Group();
    scene.add(otherAgents);
    const refreshPeople = () => {
      scene.remove(otherAgents);
      disposeObject(otherAgents);
      otherAgents = new THREE.Group();
      propsRef.current.people.slice(0, 35).forEach((person, index) => {
        const npc = createAvatar(person.avatar || DEFAULT_AVATAR, person.house);
        const requested = person.position;
        const valid =
          requested &&
          Number.isFinite(requested.x) &&
          Number.isFinite(requested.z) &&
          !blocked(requested.x, requested.z);
        const angle = index * 2.4;
        npc.position.set(
          valid ? requested.x : Math.sin(angle) * 2.4,
          0.15,
          valid ? requested.z : Math.cos(angle) * 2.4,
        );
        npc.scale.setScalar(0.76);
        npc.rotation.y = ((index % 3) - 1) * 0.6;
        npc.userData.personId = person.id;
        const name = labelSprite(person.name.slice(0, 24), {
          scale: 0.7,
          bg: "#171126",
        });
        name.position.y = 2.8;
        npc.add(name);
        otherAgents.add(npc);
      });
      scene.add(otherAgents);
    };
    refreshPeople();
    let path: THREE.Vector3[] = [];
    sceneApi.current = {
      refreshPlayer: () => {
        const next = createAvatar(
          propsRef.current.avatar,
          propsRef.current.house,
        );
        next.position.copy(player.position);
        next.rotation.copy(player.rotation);
        next.scale.copy(player.scale);
        scene.remove(player);
        disposeObject(player);
        player = next;
        scene.add(player);
        (marker.material as THREE.MeshBasicMaterial).color.set(
          houseColor(propsRef.current.house),
        );
      },
      refreshPeople,
      reset: () => {
        player.position.set(0, 0.15, 4.1);
        path = [];
        destination.visible = false;
        callbacks.current.onMove?.({ x: 0, z: 4.1 });
      },
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15);
    const setRay = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
    };
    const getHit = () => {
      const intersects = raycaster.intersectObjects(
        [...island.placeGroups, otherAgents],
        true,
      );
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.placeId)
            return { kind: "place", id: String(obj.userData.placeId) };
          if (obj.userData.personId)
            return { kind: "person", id: String(obj.userData.personId) };
          obj = obj.parent;
        }
      }
      return null;
    };
    const down = (event: PointerEvent) => {
      if (!interactive || (event.button !== 0 && event.button !== 2)) return;
      setRay(event);
      const hit = getHit();
      if (event.button === 0 && hit?.kind === "place") {
        callbacks.current.onPlace(hit.id);
        return;
      }
      if (event.button === 0 && hit?.kind === "person") {
        const person = propsRef.current.people.find((p) => p.id === hit.id);
        if (person) callbacks.current.onPerson?.(person);
        return;
      }
      const point = raycaster.ray.intersectPlane(
        groundPlane,
        new THREE.Vector3(),
      );
      if (!point || blocked(point.x, point.z)) return;
      path = route(player.position, point);
      destination.position.set(point.x, 0.18, point.z);
      destination.visible = path.length > 0;
      renderer.domElement.focus({ preventScroll: true });
    };
    const move = (event: PointerEvent) => {
      if (!interactive || event.pointerType === "touch") return;
      setRay(event);
      const hit = getHit();
      renderer.domElement.style.cursor = hit ? "pointer" : "default";
      setHover(
        hit?.kind === "place"
          ? PLACES.find((p) => p.id === hit.id)?.name || null
          : hit?.kind === "person"
            ? propsRef.current.people.find((p) => p.id === hit.id)?.name || null
            : null,
      );
    };
    const leave = () => setHover(null);
    const context = (event: Event) => {
      if (interactive) event.preventDefault();
    };
    const keys = new Set<string>();
    const keydown = (event: KeyboardEvent) => {
      if (
        !interactive ||
        ![
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "w",
          "a",
          "s",
          "d",
          "W",
          "A",
          "S",
          "D",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      keys.add(event.key.toLowerCase());
      path = [];
      destination.visible = false;
    };
    const keyup = (event: KeyboardEvent) =>
      keys.delete(event.key.toLowerCase());
    const clearKeys = () => keys.clear();
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("contextmenu", context);
    renderer.domElement.addEventListener("keydown", keydown);
    renderer.domElement.addEventListener("keyup", keyup);
    renderer.domElement.addEventListener("blur", clearKeys);
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);

    const resize = () => {
      const width = host.clientWidth || 900,
        height = host.clientHeight || 540;
      const ratio = width / height;
      const halfHeight = ratio < 1.35 ? 14.8 / Math.max(ratio, 0.55) : 10.5;
      camera.left = -halfHeight * ratio;
      camera.right = halfHeight * ratio;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const visibility = { current: true };
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visibility.current = entry.isIntersecting;
      },
      { threshold: 0.01 },
    );
    intersection.observe(host);
    let frame = 0,
      last = performance.now(),
      time = 0,
      lastNotify = 0;
    let wasMoving = false;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.06);
      last = now;
      if (!visibility.current || document.hidden) return;
      time += dt;
      let direction: THREE.Vector3 | null = null;
      if (keys.size) {
        // Move relative to the camera, so an up arrow travels up the screen.
        const horizontal =
          Number(keys.has("d") || keys.has("arrowright")) -
          Number(keys.has("a") || keys.has("arrowleft"));
        const vertical =
          Number(keys.has("s") || keys.has("arrowdown")) -
          Number(keys.has("w") || keys.has("arrowup"));
        if (horizontal || vertical)
          direction = new THREE.Vector3(
            horizontal * 0.83 + vertical * 0.56,
            0,
            -horizontal * 0.56 + vertical * 0.83,
          ).normalize();
      } else if (path.length) {
        const target = path[0];
        direction = target.clone().sub(player.position);
        direction.y = 0;
        if (direction.length() < 0.075) {
          path.shift();
          if (!path.length) destination.visible = false;
        }
        if (direction.length() > 0.01) direction.normalize();
        else direction = null;
      }
      let moving = false;
      if (direction) {
        const speed = 2.6 * dt;
        const nx = player.position.x + direction.x * speed,
          nz = player.position.z + direction.z * speed;
        if (!blocked(nx, nz)) {
          player.position.x = nx;
          player.position.z = nz;
          moving = true;
          const angle = Math.atan2(direction.x, direction.z);
          let delta = angle - player.rotation.y;
          delta = Math.atan2(Math.sin(delta), Math.cos(delta));
          player.rotation.y += delta * Math.min(1, dt * 14);
        }
      }
      const body = player.userData.body as THREE.Group;
      body.position.y =
        moving && !motion.matches ? Math.abs(Math.sin(time * 10)) * 0.055 : 0;
      for (const name of ["left-arm", "right-arm"]) {
        const arm = body.getObjectByName(name);
        if (arm)
          arm.rotation.x =
            moving && !motion.matches
              ? Math.sin(time * 10) * 0.35 * (name === "left-arm" ? 1 : -1)
              : 0;
      }
      marker.position.x = player.position.x;
      marker.position.z = player.position.z;
      if ((moving && now - lastNotify > 700) || (wasMoving && !moving)) {
        lastNotify = now;
        callbacks.current.onMove?.({
          x: player.position.x,
          z: player.position.z,
        });
      }
      wasMoving = moving;
      if (!motion.matches) {
        island.glows[1].rotation.y = time * 0.6;
        island.glows[1].position.y = 1.47 + Math.sin(time * 1.5) * 0.07;
        destination.scale.setScalar(1 + Math.sin(time * 5) * 0.12);
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    setReady(true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      sceneApi.current = null;
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("contextmenu", context);
      renderer.domElement.removeEventListener("keydown", keydown);
      renderer.domElement.removeEventListener("keyup", keyup);
      renderer.domElement.removeEventListener("blur", clearKeys);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        handleContextLost,
      );
      disposeObject(scene);
      sun.shadow.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [interactive]);

  useEffect(() => {
    sceneApi.current?.refreshPlayer();
  }, [avatar, house]);
  useEffect(() => {
    sceneApi.current?.refreshPeople();
  }, [people]);

  return (
    <div
      className={`space-world ${interactive ? "space-world--interactive" : "space-world--preview"} ${className}`}
    >
      <div className="space-world__ambient space-world__ambient--one" />
      <div className="space-world__ambient space-world__ambient--two" />
      <div
        ref={hostRef}
        className={`space-world__canvas ${failed ? "space-world__canvas--failed" : ""}`}
      />
      {!ready && !failed && (
        <div className="space-world__loading">
          <span />
          Growing your little corner of the internet…
        </div>
      )}
      {failed && (
        <div className="space-world__fallback">
          <Compass size={40} strokeWidth={1.25} />
          <h3>Your next discovery is a tap away.</h3>
          <p>
            The island works in map mode on this device. Choose a place below to
            explore.
          </p>
          <div>
            {PLACES.map((place) => (
              <button key={place.id} onClick={() => onPlace(place.id)}>
                {place.name}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </div>
      )}
      {!failed && interactive && (
        <>
          <div className="space-world__location">
            <span className="space-world__live-dot" />
            <span>Discovery Island</span>
            <span className="space-world__location-divider" />
            {people.length
              ? `${people.length + 1} exploring`
              : "Your space to explore"}
          </div>
          <button
            className="space-world__reset"
            aria-label="Return your agent to the arrival point"
            title="Return to arrival point"
            onClick={() => sceneApi.current?.reset()}
          >
            <Maximize2 size={17} />
          </button>
          <div className="space-world__hint">
            <MousePointer2 size={13} />
            <span>Right-click or tap to walk · Select a place to enter</span>
          </div>
          {hover && (
            <div className="space-world__hover">
              Visit {hover}
              <ArrowUpRight size={13} />
            </div>
          )}
        </>
      )}
      {!failed && (
        <nav
          className="space-world__accessible"
          aria-label="Explore island places"
        >
          {PLACES.map((place) => (
            <button key={place.id} onClick={() => onPlace(place.id)}>
              {place.name}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export { PLACES };
