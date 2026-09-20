import * as THREE from "three";
import { material, mesh } from "./avatar";

export const PLACES = [
  {
    id: "arena",
    name: "Daily Arena",
    x: -13.5,
    z: -10,
    color: "#f2c766",
    labelY: 3.25,
  },
  {
    id: "library",
    name: "The Library",
    x: 0,
    z: -14,
    color: "#f2c766",
    labelY: 3.65,
  },
  {
    id: "school",
    name: "Agent Academy",
    x: 13.5,
    z: -10,
    color: "#9c6cff",
    labelY: 3.65,
  },
  {
    id: "gallery",
    name: "Prompt Gallery",
    x: -14,
    z: 5.5,
    color: "#f2c766",
    labelY: 3.15,
  },
  {
    id: "lounge",
    name: "The Commons",
    x: 12.5,
    z: 7.5,
    color: "#7d4dff",
    labelY: 3.05,
  },
] as const;

export const WORLD_BOUNDS = { x: 22.8, z: 18.8, corner: 4 } as const;
export const WORLD_OBSTACLES = [
  { x: 6.6, z: -1.5, halfX: 2.45, halfZ: 1.65 },
  { x: -7.5, z: 10.8, halfX: 1.05, halfZ: 1.05 },
  { x: 16.9, z: -10.1, halfX: .65, halfZ: .65 },
  { x: -17.5, z: 5.2, halfX: .7, halfZ: 1.25 },
  { x: -10.5, z: 4.5, halfX: .7, halfZ: 1.25 },
] as const;

export function isWorldBlocked(x: number, z: number) {
  const dx = Math.max(0, Math.abs(x) - (WORLD_BOUNDS.x - WORLD_BOUNDS.corner));
  const dz = Math.max(0, Math.abs(z) - (WORLD_BOUNDS.z - WORLD_BOUNDS.corner));
  return !Number.isFinite(x) || !Number.isFinite(z) ||
    Math.abs(x) > WORLD_BOUNDS.x || Math.abs(z) > WORLD_BOUNDS.z ||
    Math.hypot(dx, dz) > WORLD_BOUNDS.corner || Math.hypot(x, z) < 1.35 ||
    PLACES.some(place => Math.abs(x - place.x) < 2.05 && Math.abs(z - place.z) < 1.7) ||
    WORLD_OBSTACLES.some(p => Math.abs(x - p.x) < p.halfX && Math.abs(z - p.z) < p.halfZ);
}

export interface IslandScene {
  root: THREE.Group;
  portal: THREE.Group;
  placeGroups: THREE.Group[];
  ground: THREE.Mesh;
  glows: THREE.Mesh[];
}

export function labelSprite(
  text: string,
  opts: { color?: string; bg?: string; scale?: number } = {},
) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();
  ctx.font = "600 39px system-ui, -apple-system, sans-serif";
  const width = Math.min(612, ctx.measureText(text).width + 75);
  const x = (640 - width) / 2;
  ctx.fillStyle = opts.bg || "#120d1f";
  ctx.beginPath();
  ctx.roundRect(x, 22, width, 77, 30);
  ctx.fill();
  ctx.fillStyle = opts.color || "#f2c766";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 320, 62);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.scale.set(4.25 * (opts.scale || 1), 0.85 * (opts.scale || 1), 1);
  sprite.renderOrder = 10;
  return sprite;
}

function roundedRect(width: number, depth: number, radius: number) {
  const s = new THREE.Shape();
  const x = -width / 2,
    y = -depth / 2;
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + depth - radius);
  s.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  s.lineTo(x + radius, y + depth);
  s.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

function platform(
  parent: THREE.Object3D,
  width: number,
  depth: number,
  height: number,
  color: string,
  y = 0,
  radius = 0.25,
) {
  const geo = new THREE.ExtrudeGeometry(roundedRect(width, depth, radius), {
    depth: height,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 8,
  });
  geo.rotateX(-Math.PI / 2);
  return mesh(geo, material(color), parent, 0, y, 0);
}

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  at: [number, number, number],
  color: string,
) {
  return mesh(new THREE.BoxGeometry(...size), material(color), parent, ...at);
}

function windowPane(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  width = 0.5,
  height = 0.7,
) {
  box(parent, [width + 0.13, height + 0.13, 0.1], [x, y, z], "#21143c");
  box(parent, [width, height, 0.12], [x, y, z + 0.04], "#7d4dff");
  box(parent, [0.045, height, 0.14], [x, y, z + 0.06], "#f2c766");
  box(parent, [width, 0.04, 0.14], [x, y, z + 0.06], "#f2c766");
}

function tree(
  parent: THREE.Object3D,
  x: number,
  z: number,
  scale = 1,
  variant = 0,
) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  mesh(
    new THREE.CylinderGeometry(0.085, 0.14, 1.15, 7),
    material("#8a5a16"),
    group,
    0,
    0.575,
    0,
  );
  const leafy = material(["#4d2384", "#7d4dff", "#f2c766"][variant % 3]);
  const crown = mesh(
    new THREE.IcosahedronGeometry(0.82, 1),
    leafy,
    group,
    0,
    1.38,
    0,
  );
  crown.scale.set(0.83, 1.05, 0.83);
  crown.rotation.y = x;
  if (variant === 1)
    mesh(new THREE.IcosahedronGeometry(0.47, 1), leafy, group, 0.3, 1.08, 0.18);
  mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.07, 16),
    material("#21143c"),
    group,
    0,
    0.035,
    0,
  );
}

function planter(
  parent: THREE.Object3D,
  x: number,
  z: number,
  flower = "#f2c766",
) {
  mesh(
    new THREE.CylinderGeometry(0.23, 0.17, 0.28, 8),
    material("#21143c"),
    parent,
    x,
    0.14,
    z,
  );
  mesh(
    new THREE.IcosahedronGeometry(0.26, 1),
    material("#7d4dff"),
    parent,
    x,
    0.4,
    z,
  );
  for (let i = 0; i < 3; i++) {
    mesh(
      new THREE.IcosahedronGeometry(0.085, 0),
      material(flower),
      parent,
      x + Math.cos(i * 2.1) * 0.15,
      0.6,
      z + Math.sin(i * 2.1) * 0.15,
    );
  }
}

function bench(parent: THREE.Object3D, x: number, z: number, rotation = 0) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  b.rotation.y = rotation;
  parent.add(b);
  for (const step of [-0.15, 0, 0.15])
    box(b, [1.13, 0.055, 0.12], [0, 0.39, step], "#b77b20");
  for (const y of [0.61, 0.78])
    box(b, [1.13, 0.12, 0.06], [0, y, -0.25], "#b77b20");
  for (const side of [-0.41, 0.41]) {
    box(b, [0.055, 0.4, 0.5], [side, 0.2, -0.04], "#21143c");
    box(b, [0.055, 0.63, 0.055], [side, 0.51, -0.24], "#21143c");
  }
}

function lamp(parent: THREE.Object3D, x: number, z: number) {
  const dark = material("#120d1f");
  mesh(
    new THREE.CylinderGeometry(0.035, 0.048, 1.3, 6),
    dark,
    parent,
    x,
    0.65,
    z,
  );
  mesh(
    new THREE.CylinderGeometry(0.14, 0.07, 0.1, 6),
    dark,
    parent,
    x,
    1.33,
    z,
  );
  mesh(
    new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshStandardMaterial({
      color: "#f2c766",
      emissive: "#f2c766",
      emissiveIntensity: 0.5,
    }),
    parent,
    x,
    1.48,
    z,
  );
  mesh(new THREE.ConeGeometry(0.22, 0.12, 8), dark, parent, x, 1.65, z);
}

function arena(parent: THREE.Group) {
  platform(parent, 3.05, 2.6, 0.12, "#21143c", 0, 0.4);
  mesh(
    new THREE.CylinderGeometry(1.08, 1.17, 0.18, 24),
    material("#171126"),
    parent,
    0,
    0.24,
    0,
  );
  mesh(
    new THREE.CylinderGeometry(1.02, 1.08, 0.15, 24),
    material("#21143c"),
    parent,
    0,
    0.4,
    0,
  );
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * 0.08 + (i / 6) * Math.PI * 1.85;
    if (i === 1 || i === 2) continue;
    const x = Math.sin(angle) * 0.84,
      z = Math.cos(angle) * 0.84;
    mesh(
      new THREE.CylinderGeometry(0.115, 0.13, 1.18, 8),
      material("#2e1b55"),
      parent,
      x,
      1.05,
      z,
    );
    mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.12, 8),
      material("#f2c766"),
      parent,
      x,
      1.62,
      z,
    );
  }
  mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 0.2, 24),
    material("#7d4dff"),
    parent,
    0,
    1.82,
    0,
  );
  mesh(
    new THREE.ConeGeometry(1.32, 0.62, 24),
    material("#f2c766"),
    parent,
    0,
    2.23,
    0,
  );
  mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.58, 6),
    material("#b77b20"),
    parent,
    0,
    2.74,
    0,
  );
  const flag = box(parent, [0.5, 0.29, 0.035], [0.245, 2.87, 0], "#ffe3a0");
  flag.rotation.z = -0.08;
  // Trophy in the open pavilion.
  mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 0.14, 8),
    material("#b77b20"),
    parent,
    0,
    0.59,
    0.16,
  );
  mesh(
    new THREE.CylinderGeometry(0.05, 0.07, 0.28, 8),
    material("#f2c766", 0.35),
    parent,
    0,
    0.79,
    0.16,
  );
  mesh(
    new THREE.CylinderGeometry(0.25, 0.11, 0.3, 10),
    material("#f2c766", 0.35),
    parent,
    0,
    1.04,
    0.16,
  );
  for (const side of [-1, 1]) {
    const handle = mesh(
      new THREE.TorusGeometry(0.14, 0.032, 5, 12),
      material("#f2c766", 0.35),
      parent,
      side * 0.24,
      1.03,
      0.16,
    );
    handle.scale.x = 0.7;
  }
  planter(parent, -1.2, 1.07);
  planter(parent, 1.2, 1.07);
}

function library(parent: THREE.Group) {
  platform(parent, 3.35, 2.7, 0.13, "#21143c", 0, 0.35);
  box(parent, [2.7, 1.9, 1.95], [0, 1.08, 0], "#171126");
  box(parent, [2.83, 0.14, 2.05], [0, 0.25, 0], "#2e1b55");
  const roof = mesh(
    new THREE.CylinderGeometry(1.81, 1.81, 2.2, 3),
    material("#7d4dff"),
    parent,
    0,
    2.25,
    0,
  );
  roof.rotation.z = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.scale.y = 1.33;
  // Gabled roof built explicitly for a predictable silhouette.
  parent.remove(roof);
  roof.geometry.dispose();
  (roof.material as THREE.Material).dispose();
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-1.55, 0);
  roofShape.lineTo(0, 0.87);
  roofShape.lineTo(1.55, 0);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
    depth: 2.25,
    bevelEnabled: false,
  });
  mesh(roofGeo, material("#9c6cff"), parent, 0, 2.04, -1.12);
  box(parent, [0.78, 1.24, 0.13], [0, 0.85, 1.01], "#7d4dff");
  box(parent, [0.035, 1.13, 0.035], [0, 0.87, 1.09], "#f2c766");
  mesh(
    new THREE.SphereGeometry(0.042, 6, 6),
    material("#f2c766"),
    parent,
    0.18,
    0.85,
    1.11,
  );
  windowPane(parent, -0.87, 1.17, 1.02, 0.5, 0.63);
  windowPane(parent, 0.87, 1.17, 1.02, 0.5, 0.63);
  // Oversized open book above the entrance.
  const book = new THREE.Group();
  book.position.set(0, 2.12, 1.13);
  parent.add(book);
  for (const side of [-1, 1]) {
    const page = box(
      book,
      [0.39, 0.46, 0.065],
      [side * 0.19, 0.04, 0],
      "#ffe3a0",
    );
    page.rotation.z = side * -0.12;
    for (let i = 0; i < 3; i++)
      box(
        book,
        [0.23, 0.017, 0.075],
        [side * 0.19, 0.14 - i * 0.09, 0.012],
        "#b77b20",
      );
  }
  planter(parent, -1.35, 1.18, "#f2c766");
  planter(parent, 1.35, 1.18, "#f2c766");
}

function school(parent: THREE.Group) {
  platform(parent, 3.2, 2.8, 0.13, "#21143c", 0, 0.4);
  mesh(
    new THREE.CylinderGeometry(1.13, 1.16, 1.65, 24),
    material("#171126"),
    parent,
    0,
    0.97,
    0,
  );
  mesh(
    new THREE.CylinderGeometry(1.24, 1.24, 0.15, 24),
    material("#9c6cff"),
    parent,
    0,
    1.88,
    0,
  );
  mesh(
    new THREE.SphereGeometry(1.19, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    material("#7d4dff"),
    parent,
    0,
    1.96,
    0,
  );
  const scope = new THREE.Group();
  scope.position.set(0.27, 2.7, 0.16);
  scope.rotation.z = -0.55;
  parent.add(scope);
  mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 1.18, 12),
    material("#2e1b55"),
    scope,
    0,
    0.2,
    0,
  );
  mesh(
    new THREE.CylinderGeometry(0.21, 0.21, 0.15, 12),
    material("#7d4dff"),
    scope,
    0,
    0.78,
    0,
  );
  mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.017, 12),
    material("#9c6cff", 0.25),
    scope,
    0,
    0.865,
    0,
  );
  box(parent, [0.55, 0.92, 0.14], [0, 0.66, 1.12], "#7d4dff");
  windowPane(parent, -0.67, 1.13, 0.95, 0.35, 0.54);
  windowPane(parent, 0.67, 1.13, 0.95, 0.35, 0.54);
  const banner = box(parent, [0.56, 0.7, 0.05], [1.25, 1.59, 0.25], "#9c6cff");
  banner.rotation.z = -0.04;
  mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.7, 6),
    material("#21143c"),
    parent,
    1.53,
    0.86,
    0.25,
  );
}

function gallery(parent: THREE.Group) {
  platform(parent, 3.65, 2.65, 0.13, "#21143c", 0, 0.4);
  box(parent, [3.05, 1.62, 1.8], [0, 0.96, -0.1], "#171126");
  box(parent, [3.34, 0.18, 2.12], [0, 1.85, -0.1], "#2e1b55");
  box(parent, [2.9, 0.1, 1.72], [0, 1.99, -0.1], "#7d4dff");
  const skylight = mesh(
    new THREE.CylinderGeometry(0.47, 0.6, 0.22, 4),
    material("#9c6cff", 0.35),
    parent,
    0.7,
    2.12,
    -0.25,
  );
  skylight.rotation.y = Math.PI / 4;
  skylight.scale.z = 0.8;
  box(parent, [0.63, 1.14, 0.14], [0.77, 0.77, 0.83], "#7d4dff");
  box(parent, [0.035, 1.05, 0.02], [0.77, 0.8, 0.912], "#f2c766");
  for (let i = 0; i < 2; i++) {
    box(parent, [0.66, 0.85, 0.12], [-1.02 + i * 0.82, 1.01, 0.85], "#b77b20");
    box(
      parent,
      [0.54, 0.73, 0.14],
      [-1.02 + i * 0.82, 1.01, 0.87],
      i === 0 ? "#9c6cff" : "#7d4dff",
    );
    mesh(
      new THREE.CircleGeometry(0.16, 16),
      material(i === 0 ? "#f2c766" : "#f2c766"),
      parent,
      -1.08 + i * 0.82,
      1.12,
      0.95,
    );
    const tri = mesh(
      new THREE.ConeGeometry(0.26, 0.31, 3),
      material(i === 0 ? "#21143c" : "#7d4dff"),
      parent,
      -0.99 + i * 0.82,
      0.86,
      0.95,
    );
    tri.scale.z = 0.08;
  }
  // An outdoor easel makes the place recognizable from a distance.
  const easel = new THREE.Group();
  easel.position.set(-1.25, 0, 1.45);
  easel.rotation.y = -0.25;
  parent.add(easel);
  for (const side of [-1, 1]) {
    const leg = box(
      easel,
      [0.055, 1.15, 0.06],
      [side * 0.2, 0.58, 0],
      "#b77b20",
    );
    leg.rotation.z = side * 0.17;
  }
  box(easel, [0.69, 0.07, 0.14], [0, 0.57, 0.03], "#b77b20");
  box(easel, [0.64, 0.65, 0.06], [0, 0.91, 0.03], "#ffe3a0");
  mesh(
    new THREE.CircleGeometry(0.2, 14),
    material("#7d4dff"),
    easel,
    0,
    0.95,
    0.065,
  );
  planter(parent, 1.41, 1.03, "#f2c766");
}

function lounge(parent: THREE.Group) {
  platform(parent, 3.45, 2.75, 0.14, "#21143c", 0, 0.4);
  box(parent, [2.8, 1.6, 1.7], [0, 0.95, -0.22], "#2e1b55");
  box(parent, [3.08, 0.17, 2.07], [0, 1.85, -0.21], "#171126");
  box(parent, [1.55, 0.88, 0.1], [-0.28, 1.09, 0.67], "#7d4dff");
  box(parent, [0.48, 1.24, 0.12], [1, 0.78, 0.67], "#2e1b55");
  const awning = box(
    parent,
    [2.17, 0.08, 0.72],
    [-0.24, 1.61, 1.01],
    "#f2c766",
  );
  awning.rotation.x = 0.17;
  for (let i = 0; i < 6; i++) {
    const stripe = box(
      parent,
      [0.18, 0.087, 0.72],
      [-1.1 + i * 0.35, 1.61, 1.01],
      "#ffe3a0",
    );
    stripe.rotation.x = 0.17;
  }
  // Cup on the roof.
  mesh(
    new THREE.CylinderGeometry(0.26, 0.2, 0.43, 16),
    material("#ffe3a0"),
    parent,
    -0.22,
    2.2,
    -0.14,
  );
  mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.015, 16),
    material("#b77b20"),
    parent,
    -0.22,
    2.425,
    -0.14,
  );
  const handle = mesh(
    new THREE.TorusGeometry(0.13, 0.045, 6, 16),
    material("#ffe3a0"),
    parent,
    0.055,
    2.24,
    -0.14,
  );
  handle.scale.x = 0.8;
  mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.07, 16),
    material("#2e1b55"),
    parent,
    -0.22,
    2,
    -0.14,
  );
  mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.065, 16),
    material("#f2c766"),
    parent,
    0.15,
    0.69,
    1.62,
  );
  mesh(
    new THREE.CylinderGeometry(0.055, 0.1, 0.65, 8),
    material("#21143c"),
    parent,
    0.15,
    0.36,
    1.62,
  );
  for (const side of [-1, 1]) {
    mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12),
      material("#f2c766"),
      parent,
      0.15 + side * 0.61,
      0.4,
      1.62,
    );
    mesh(
      new THREE.CylinderGeometry(0.035, 0.08, 0.38, 8),
      material("#21143c"),
      parent,
      0.15 + side * 0.61,
      0.2,
      1.62,
    );
  }
  planter(parent, -1.43, 1.12);
}

function walkway(parent: THREE.Object3D, from: [number, number], to: [number, number], width = 1.85) {
  const dx = to[0] - from[0], dz = to[1] - from[1], length = Math.hypot(dx, dz);
  const path = box(parent, [width, .035, length], [(from[0] + to[0]) / 2, .145, (from[1] + to[1]) / 2], "#3a2358");
  path.rotation.y = Math.atan2(dx, dz);
  for (const side of [-1, 1]) {
    const edging = box(parent, [.038, .044, length], [
      (from[0] + to[0]) / 2 + Math.cos(path.rotation.y) * width / 2 * side,
      .153, (from[1] + to[1]) / 2 - Math.sin(path.rotation.y) * width / 2 * side,
    ], "#ac8141");
    edging.rotation.y = path.rotation.y;
  }
  return path;
}

function orbit(parent: THREE.Object3D, x: number, z: number, radius: number, color = "#b48745") {
  const ring = mesh(new THREE.TorusGeometry(radius, .035, 4, 64), material(color), parent, x, .19, z);
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function crystal(parent: THREE.Object3D, x: number, z: number, size = 1) {
  const group = new THREE.Group(); group.position.set(x, .15, z); parent.add(group);
  const mat = new THREE.MeshStandardMaterial({ color: "#8c59e8", roughness: .28, metalness: .25, emissive: "#572397", emissiveIntensity: .35 });
  for (let i = 0; i < 3; i++) {
    const shard = mesh(new THREE.OctahedronGeometry((i === 0 ? .33 : .19) * size, 0), mat, group,
      (i - 1) * .25 * size, (i === 0 ? .65 : .35) * size, (i % 2) * .16);
    shard.scale.y = 2.4; shard.rotation.z = (i - 1) * -.21;
  }
  mesh(new THREE.CylinderGeometry(.65 * size, .72 * size, .09, 12), material("#1d132b"), group, 0, .045, 0);
}

function colonnade(parent: THREE.Object3D, x: number, z: number, count = 5) {
  const group = new THREE.Group(); group.position.set(x, .15, z); parent.add(group);
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 1.05;
    mesh(new THREE.CylinderGeometry(.12, .17, 2.7, 8), material("#493164"), group, offset, 1.35, 0);
    mesh(new THREE.CylinderGeometry(.22, .22, .12, 8), material("#bd914a"), group, offset, 2.66, 0);
  }
  box(group, [count * 1.05 + .12, .15, .45], [0, 2.82, 0], "#79509c");
  box(group, [count * 1.05 + .18, .045, .48], [0, 2.92, 0], "#c39b52");
}

export function createIsland(): IslandScene {
  const root = new THREE.Group();
  // A larger navigable landscape: the buildings keep their human scale.
  const ground = platform(root, 48, 40, 1.2, "#140d23", -1.26, 5);
  platform(root, 47.9, 39.9, .07, "#a07836", -.065, 4.95);
  platform(root, 47.65, 39.65, .12, "#211530", .005, 4.85);
  ground.userData.walkable = true;

  // District courts, arterial paths, and an outer promenade make the scale explorable.
  for (const place of PLACES) {
    const court = new THREE.Group(); court.position.set(place.x, 0, place.z + .55); root.add(court);
    platform(court, 8.25, 7.6, .035, "#2e1c43", .132, 1.6);
    const inset = platform(court, 7.8, 7.15, .025, "#241634", .17, 1.4);
    inset.receiveShadow = true;
    walkway(root, [0, 0], [place.x, place.z + 2.8], 1.95);
    orbit(root, place.x, place.z + .55, 3.7, "#593878");
  }
  walkway(root, [-19.4, -16.3], [19.4, -16.3], 1.3);
  walkway(root, [19.4, -16.3], [19.4, 15.8], 1.3);
  walkway(root, [19.4, 15.8], [-19.4, 15.8], 1.3);
  walkway(root, [-19.4, 15.8], [-19.4, -16.3], 1.3);
  walkway(root, [-19.4, -4.7], [19.4, -4.7], 1.6);
  walkway(root, [-19.4, 12.6], [19.4, 12.6], 1.6);
  walkway(root, [0, 0], [0, 18.3], 2.65);
  walkway(root, [-13.5, -7.2], [-14, 8.2], 1.7);
  walkway(root, [13.5, -7.2], [12.5, 10.2], 1.7);

  const plazaMat = material("#39224e");
  mesh(new THREE.CylinderGeometry(4.5, 4.5, .045, 64), plazaMat, root, 0, .17, 0);
  orbit(root, 0, 0, 4.45, "#c09549");
  orbit(root, 0, 0, 3.62, "#694082");
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    const inlay = box(root, [.08, .026, .7], [Math.sin(angle) * 3.98, .201, Math.cos(angle) * 3.98], "#a77e41");
    inlay.rotation.y = angle;
  }
  const portal = new THREE.Group(); root.add(portal);
  mesh(new THREE.CylinderGeometry(1.14, 1.29, .19, 32), material("#4e2c70"), portal, 0, .25, 0);
  mesh(new THREE.CylinderGeometry(.95, 1.13, .12, 32), material("#bb8e42"), portal, 0, .41, 0);
  const frame = mesh(new THREE.TorusGeometry(1.02, .14, 10, 48), material("#7343bc", .4), portal, 0, 1.73, 0);
  frame.rotation.y = .42;
  const lightRing = mesh(new THREE.TorusGeometry(1.02, .051, 8, 48),
    new THREE.MeshStandardMaterial({ color: "#efc45f", emissive: "#de9e37", emissiveIntensity: 1.05 }),
    portal, .024, 1.73, .07);
  lightRing.rotation.y = .42;
  const core = mesh(new THREE.CircleGeometry(.91, 48),
    new THREE.MeshBasicMaterial({ color: "#9858ee", transparent: true, opacity: .27, side: THREE.DoubleSide, depthWrite: false }),
    portal, 0, 1.73, .015);
  core.rotation.y = .42;
  const diamond = mesh(new THREE.OctahedronGeometry(.31), material("#edbd57", .28), portal, 0, 1.73, .1);
  diamond.name = "portal-diamond";

  const placeGroups: THREE.Group[] = [];
  const builders = { arena, library, school, gallery, lounge };
  for (const place of PLACES) {
    const group = new THREE.Group(); group.position.set(place.x, .2, place.z);
    group.userData.placeId = place.id; group.name = place.id; root.add(group);
    builders[place.id](group);
    const label = labelSprite(place.name, { scale: 1.18 });
    label.position.set(0, place.labelY + .55, 0); group.add(label);
    placeGroups.push(group);
    for (const side of [-1, 1]) {
      lamp(root, place.x + side * 2.7, place.z + 2.85);
      bench(root, place.x + side * 2.7, place.z + .4, -side * Math.PI / 2);
    }
  }

  // Arena district: open colonnade and spectator terraces.
  colonnade(root, -13.5, -13.2, 7);
  for (let tier = 0; tier < 3; tier++) {
    for (const side of [-1, 1]) {
      box(root, [1.6, .16 + tier * .13, .46], [-13.5 + side * 2.65, .22 + tier * .065, -10.95 + tier * .6], tier % 2 ? "#50326d" : "#684087");
    }
  }

  // Library district: reading cloisters, book sculptures, and gold-lit study nooks.
  colonnade(root, 0, -17.25, 5);
  for (const side of [-1, 1]) {
    bench(root, side * 2.75, -13, side * Math.PI / 2);
    const books = new THREE.Group(); books.position.set(side * 3.3, .2, -15.5); root.add(books);
    for (let i = 0; i < 3; i++) {
      const volume = box(books, [.24, .88 + i * .16, .55], [(i - 1) * .3, .45 + i * .08, 0], ["#714ca5", "#a4783d", "#4b2e72"][i]);
      volume.rotation.z = (i - 1) * -.12;
      box(books, [.15, .045, .565], [(i - 1) * .3, .68 + i * .08, 0], "#d0a557");
    }
  }

  // Academy district: a constellation tower and outdoor lecture circle.
  const tower = new THREE.Group(); tower.position.set(16.9, .15, -10.1); root.add(tower);
  mesh(new THREE.CylinderGeometry(.48, .62, 2.7, 12), material("#34204c"), tower, 0, 1.35, 0);
  mesh(new THREE.SphereGeometry(.56, 16, 12), material("#8357bd", .3), tower, 0, 2.96, 0);
  const armillary = mesh(new THREE.TorusGeometry(.87, .042, 6, 40), material("#c29a4c", .4), tower, 0, 2.96, 0);
  armillary.rotation.x = .7; armillary.rotation.z = .4;
  orbit(root, 13.5, -6.2, 1.55, "#a5793b");
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    mesh(new THREE.CylinderGeometry(.24, .27, .35, 10), material("#5d3882"), root, 13.5 + Math.sin(a) * 1.7, .33, -6.2 + Math.cos(a) * 1.7);
  }

  // Gallery district: two outdoor pavilions and an open-air sculpture walk.
  for (const side of [-1, 1]) {
    const exhibit = new THREE.Group(); exhibit.position.set(-14 + side * 3.5, .15, 5.2 - (side > 0 ? .7 : 0)); root.add(exhibit);
    box(exhibit, [1, .2, 1.85], [0, .1, 0], "#402455");
    const art = mesh(new THREE.TorusKnotGeometry(.35, .085, 48, 6, side < 0 ? 2 : 3, 3), material(side < 0 ? "#cd9f45" : "#915acb", .35), exhibit, 0, 1, 0);
    art.rotation.x = .4;
    box(exhibit, [.55, .6, .55], [0, .42, 0], "#5d387d");
  }

  // Commons district: a generous garden terrace and social picnic tables.
  for (const side of [-1, 1]) {
    const pergola = new THREE.Group(); pergola.position.set(12.5 + side * 3.25, .15, 8.5); root.add(pergola);
    for (const x of [-.65, .65]) for (const z of [-.55, .55]) box(pergola, [.055, 1.75, .055], [x, .875, z], "#95682f");
    for (let i = 0; i < 5; i++) box(pergola, [.09, .075, 1.48], [-.7 + i * .35, 1.76, 0], "#794498");
    mesh(new THREE.CylinderGeometry(.43, .43, .075, 12), material("#af8141"), pergola, 0, .78, 0);
    mesh(new THREE.CylinderGeometry(.055, .11, .7, 8), material("#503166"), pergola, 0, .4, 0);
    bench(pergola, 0, .85);
  }

  // Reflection pool and sculpture garden are additional spaces to discover.
  const pool = new THREE.Group(); pool.position.set(6.6, .135, -1.5); root.add(pool);
  platform(pool, 4.8, 3.2, .16, "#825637", 0, .8);
  platform(pool, 4.55, 2.95, .17, "#211738", 0, .7);
  const water = platform(pool, 4.35, 2.75, .02, "#593486", .18, .6);
  (water.material as THREE.MeshStandardMaterial).roughness = .13;
  (water.material as THREE.MeshStandardMaterial).metalness = .6;
  for (let i = 0; i < 3; i++) orbit(pool, -.8 + i * .72, .1, .22 + i * .08, "#9166b0");
  bench(root, 6.6, .95); bench(root, 6.6, -4.05, Math.PI);

  const sculpture = new THREE.Group(); sculpture.position.set(-7.5, .15, 10.8); root.add(sculpture);
  mesh(new THREE.CylinderGeometry(.9, 1, .3, 24), material("#392346"), sculpture, 0, .15, 0);
  const knot = mesh(new THREE.TorusKnotGeometry(.68, .13, 72, 8), material("#ca9944", .25), sculpture, 0, 1.75, 0);
  knot.rotation.x = .4; knot.rotation.z = .5;
  orbit(root, -7.5, 10.8, 2.4, "#765091");
  walkway(root, [-7.5, 12.6], [-7.5, 8.3], 1.2);
  bench(root, -10.25, 10.8, Math.PI / 2);
  bench(root, -4.75, 10.8, -Math.PI / 2);

  // A small arrival arch anchors the southern avenue.
  for (const side of [-1, 1]) {
    box(root, [.28, 3.25, .4], [side * 1.65, 1.78, 17.5], "#60407d");
    box(root, [.42, .12, .52], [side * 1.65, 3.39, 17.5], "#c19b51");
  }
  box(root, [3.75, .22, .53], [0, 3.6, 17.5], "#69418c");
  const welcome = labelSprite("AI SPACE", { scale: .9 }); welcome.position.set(0, 4.35, 17.5); root.add(welcome);

  // Trees sit off the walking avenues; merged-instanced foliage keeps the open world light.
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.09, .15, 1.25, 6), material("#654327"), 64);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.84, 1), material("#73449a"), 64);
  trunks.castShadow = true; crowns.castShadow = true; crowns.receiveShadow = true;
  const transform = new THREE.Object3D();
  const treePositions: [number, number, number][] = [];
  for (let i = 0; i < 17; i++) {
    const x = -21 + i * 2.6;
    treePositions.push([x, -18.5 + (i % 2) * .35, .85 + (i % 3) * .16]);
    treePositions.push([x, 18.3 - (i % 2) * .4, .9 + (i % 3) * .15]);
  }
  for (let i = 0; i < 10; i++) {
    treePositions.push([-21.65, -13.8 + i * 3.05, .9 + (i % 3) * .13]);
    treePositions.push([21.65, -13.8 + i * 3.05, 1 + (i % 3) * .11]);
  }
  [[-6.2,-7.4],[-5,-8.2],[7,-12],[7.9,-13.5],[-7,4.6],[-6,6.1],[6.8,11],[7.8,12.9],[-15.8,13.9],[16.7,13.8]].forEach(([x,z],i) => treePositions.push([x,z,1+(i%3)*.18]));
  treePositions.slice(0,64).forEach(([x,z,size],i) => {
    transform.position.set(x,.15+.625*size,z); transform.scale.setScalar(size); transform.rotation.set(0,i,0); transform.updateMatrix(); trunks.setMatrixAt(i,transform.matrix);
    transform.position.set(x,.15+1.65*size,z); transform.scale.set(.82*size,1.13*size,.82*size); transform.updateMatrix(); crowns.setMatrixAt(i,transform.matrix);
    crowns.setColorAt(i,new THREE.Color(i%5===0 ? "#a7803c" : i%3===0 ? "#8d58bc" : "#65368e"));
  });
  trunks.count=treePositions.length; crowns.count=treePositions.length;
  root.add(trunks,crowns);

  for (const [x,z,size] of [[-7,-2,1.2],[8,4.5,1],[-18,-2,1.15],[17,2,.95],[-3,14,1],[3,-10,.9]] as [number,number,number][]) crystal(root,x,z,size);
  for (const [x,z] of [[-2.15,5.5],[2.15,5.5],[-2.15,10],[2.15,10],[-2.15,14.5],[2.15,14.5],[-7,-4.7],[7,-4.7],[-19.4,1],[19.4,1],[-19.4,10],[19.4,10]]) lamp(root,x,z);
  bench(root,-4.75,0,Math.PI/2); bench(root,4.75,1,-Math.PI/2);

  // Distant, faceted floating fragments extend the skyline without fake places or players.
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),material("#2e164c"),12);
  for(let i=0;i<12;i++){
    const angle=i/12*Math.PI*2;
    transform.position.set(Math.cos(angle)*29,-2-(i%3)*1.6,Math.sin(angle)*25);
    transform.scale.set(1+(i%3)*.4,.7+(i%4)*.3,1+(i%2)*.4); transform.rotation.set(i*.3,i,0); transform.updateMatrix();rocks.setMatrixAt(i,transform.matrix);
  }
  root.add(rocks);
  return { root, portal, placeGroups, ground, glows: [lightRing, diamond] };
}
