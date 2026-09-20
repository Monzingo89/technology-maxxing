import * as THREE from "three";

export interface AvatarConfig {
  skin: string;
  hair: string;
  outfit: string;
  height: number;
  weight: number;
  body: "balanced" | "athletic" | "soft";
  legs: "classic" | "long" | "robotic";
  feet: "sneakers" | "boots" | "hover";
  presentation: "feminine" | "masculine" | "androgynous";
  hairStyle: "crop" | "waves" | "bun" | "mohawk";
  eyes: number;
  nose: number;
  mouth: number;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: "#b87955",
  hair: "#382c28",
  outfit: "#7d4dff",
  height: 50,
  weight: 45,
  body: "balanced",
  legs: "classic",
  feet: "sneakers",
  presentation: "androgynous",
  hairStyle: "crop",
  eyes: 50,
  nose: 45,
  mouth: 55,
};

export const HOUSE_COLORS: Record<string, string> = {
  Claude: "#f2c766",
  claude: "#f2c766",
  OpenAI: "#7d4dff",
  openai: "#7d4dff",
  "Open AI": "#7d4dff",
  Gemini: "#9c6cff",
  gemini: "#9c6cff",
};

export function houseColor(house?: string) {
  return HOUSE_COLORS[house || ""] || "#f2c766";
}

export function material(color: string, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function mesh(
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}

function clamped(value: number) {
  return Math.max(0, Math.min(100, value)) / 100;
}

function sphere(
  parent: THREE.Object3D, mat: THREE.Material,
  position: [number, number, number], scale: [number, number, number],
) {
  const part = mesh(new THREE.SphereGeometry(1, 16, 12), mat, parent, ...position);
  part.scale.set(...scale);
  return part;
}

function seam(parent: THREE.Object3D, mat: THREE.Material, points: THREE.Vector3[], radius = 0.008) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, radius, 5, false), mat, parent);
}

/** A smooth fitted jacket, with shoulders, waist and hips instead of a pill silhouette. */
function jacketGeometry(shoulder: number, waist: number, hip: number, depth: number) {
  const rings = [
    [0, hip, depth * 0.92], [0.06, hip * 1.03, depth],
    [0.28, waist, depth * 0.92], [0.47, shoulder, depth],
    [0.57, shoulder * 0.90, depth * 0.83], [0.64, 0.095, 0.085],
  ];
  const positions: number[] = [], indices: number[] = [];
  const segments = 20;
  rings.forEach(([y, xRadius, zRadius]) => {
    for (let i = 0; i <= segments; i++) {
      const theta = i / segments * Math.PI * 2;
      positions.push(Math.cos(theta) * xRadius, y, Math.sin(theta) * zRadius);
    }
  });
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i, b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Cosmetic, articulated social avatar. All variants share the same animation rig. */
export function createAvatar(input: Partial<AvatarConfig> = {}, house?: string): THREE.Group {
  const config = { ...DEFAULT_AVATAR, ...input };
  const agent = new THREE.Group();
  const skin = material(config.skin, 0.62);
  const skinShade = material(new THREE.Color(config.skin).multiplyScalar(0.80).getHexString().padStart(6, '0').replace(/^/, '#'), 0.7);
  const hair = material(config.hair, 0.5);
  const hairShine = material(new THREE.Color(config.hair).lerp(new THREE.Color('#bd9bd4'), 0.16).getStyle(), 0.44);
  const outfit = material(config.outfit, 0.58);
  const outfitShade = material(new THREE.Color(config.outfit).multiplyScalar(0.65).getStyle(), 0.65);
  const dark = material('#130d20', 0.75), pants = material('#251c34', 0.82);
  const gold = material('#e6bb60', 0.32); gold.metalness = 0.48;
  const accent = material(houseColor(house), 0.36); accent.metalness = 0.2;
  const cream = material('#fff2db', 0.38), iris = material('#8e65b9', 0.3);
  const body = new THREE.Group(); body.name = 'avatar-body'; agent.add(body);
  body.scale.y = 0.87 + clamped(config.height) * 0.28;
  const fullness = clamped(config.weight);
  const shoulder = 0.24 + fullness * 0.055 + (config.body === 'athletic' ? 0.043 : 0) + (config.presentation === 'masculine' ? 0.025 : 0);
  const waist = 0.175 + fullness * 0.082 + (config.body === 'soft' ? 0.03 : 0);
  const hip = 0.205 + fullness * 0.058 + (config.presentation === 'feminine' ? 0.022 : 0);
  const depth = 0.145 + fullness * 0.045;
  const legLength = config.legs === 'long' ? 0.84 : 0.70;
  const hipY = legLength + 0.13;
  const legWidth = 0.087 + fullness * 0.019;
  const jacket = mesh(jacketGeometry(shoulder, waist, hip, depth), outfit, body, 0, hipY - 0.025, 0);
  jacket.name = 'tailored-jacket';
  const hem = mesh(new THREE.CylinderGeometry(hip, hip * 0.99, 0.052, 20), outfitShade, body, 0, hipY + 0.005, 0);
  hem.scale.z = depth / hip;
  // High collar, lapels, center zipper and inset shoulder accents.
  const collar = mesh(new THREE.CylinderGeometry(0.102, 0.134, 0.12, 16), dark, body, 0, hipY + 0.59, 0);
  collar.scale.z = 0.88;
  mesh(new THREE.BoxGeometry(0.018, 0.42, 0.009), gold, body, 0, hipY + 0.28, depth + 0.006);
  mesh(new THREE.BoxGeometry(0.034, 0.04, 0.015), accent, body, 0, hipY + 0.455, depth + 0.012);
  for (const side of [-1, 1]) {
    seam(body, outfitShade, [
      new THREE.Vector3(side * shoulder * 0.87, hipY + 0.51, 0.08),
      new THREE.Vector3(side * shoulder * 0.65, hipY + 0.48, depth * 0.75),
      new THREE.Vector3(side * 0.105, hipY + 0.43, depth * 0.97),
    ], 0.018);
    seam(body, gold, [
      new THREE.Vector3(side * 0.064, hipY + 0.60, 0.09),
      new THREE.Vector3(side * 0.09, hipY + 0.52, depth * 0.8),
      new THREE.Vector3(side * 0.035, hipY + 0.40, depth + 0.01),
    ], 0.006);
    seam(body, outfitShade, [
      new THREE.Vector3(side * (waist * 0.68), hipY + 0.18, depth * 0.8),
      new THREE.Vector3(side * (hip * 0.82), hipY + 0.10, depth * 0.61),
    ], 0.009);
    // Pivot at the hip, then a separate knee joint. Shoes follow the leg.
    const leg = new THREE.Group(); leg.name = side < 0 ? 'left-leg' : 'right-leg';
    leg.position.set(side * hip * 0.59, hipY, 0); body.add(leg);
    const upperLength = legLength * 0.51, lowerLength = legLength * 0.49;
    mesh(new THREE.CapsuleGeometry(legWidth, upperLength - legWidth * 1.55, 5, 10), pants, leg, 0, -upperLength * 0.49, 0);
    const knee = new THREE.Group(); knee.name = side < 0 ? 'left-knee' : 'right-knee';
    knee.position.y = -upperLength; leg.add(knee);
    mesh(new THREE.CapsuleGeometry(legWidth * 0.84, lowerLength - legWidth * 1.5, 5, 10), config.legs === 'robotic' ? outfitShade : pants, knee, 0, -lowerLength * 0.48, 0);
    if (config.legs === 'robotic') {
      sphere(knee, dark, [0, 0, 0], [legWidth * 1.1, legWidth * 0.82, legWidth * 1.12]);
      sphere(knee, gold, [0, -0.006, legWidth * 0.95], [0.04, 0.042, 0.014]);
      mesh(new THREE.BoxGeometry(0.028, lowerLength * 0.54, 0.022), accent, knee, 0, -lowerLength * 0.5, legWidth * 0.84);
    }
    const footY = -lowerLength + 0.003;
    if (config.feet === 'hover') {
      sphere(knee, dark, [0, footY + 0.035, 0.035], [0.105, 0.075, 0.16]);
      const ring = mesh(new THREE.TorusGeometry(0.119, 0.017, 6, 20), accent, knee, 0, footY - 0.024, 0.035);
      ring.rotation.x = Math.PI / 2; ring.scale.y = 1.28;
      const core = mesh(new THREE.TorusGeometry(0.082, 0.012, 5, 16), gold, knee, 0, footY - 0.039, 0.035);
      core.rotation.x = Math.PI / 2;
    } else {
      const boot = config.feet === 'boots';
      sphere(knee, dark, [0, footY + 0.012, 0.057], [0.115, 0.058, 0.183]);
      sphere(knee, boot ? outfitShade : outfit, [0, footY + 0.044, 0.055], [0.108, 0.076, 0.168]);
      if (boot) mesh(new THREE.CylinderGeometry(0.09, 0.105, 0.18, 12), dark, knee, 0, footY + 0.13, 0.012);
      else {
        for (let lace = 0; lace < 3; lace++) mesh(new THREE.BoxGeometry(0.065, 0.012, 0.013), cream, knee, 0, footY + 0.105 - lace * 0.01, 0.06 + lace * 0.023);
      }
      const trim = mesh(new THREE.BoxGeometry(0.024, 0.036, 0.05), gold, knee, side * 0.098, footY + 0.047, 0.055);
      trim.rotation.z = side * 0.13;
    }
    const arm = new THREE.Group(); arm.name = side < 0 ? 'left-arm' : 'right-arm';
    arm.position.set(side * shoulder * 0.99, hipY + 0.47, 0);
    arm.rotation.z = side * 0.13; body.add(arm);
    mesh(new THREE.CapsuleGeometry(0.089 + fullness * 0.012, 0.12, 5, 10), outfit, arm, side * 0.018, -0.112, 0);
    const elbow = new THREE.Group(); elbow.name = side < 0 ? 'left-elbow' : 'right-elbow';
    elbow.position.set(side * 0.025, -0.235, 0); arm.add(elbow);
    mesh(new THREE.CapsuleGeometry(0.069 + fullness * 0.009, 0.12, 5, 10), outfitShade, elbow, 0, -0.102, 0.018);
    const cuff = mesh(new THREE.CylinderGeometry(0.071, 0.071, 0.037, 10), gold, elbow, 0, -0.20, 0.018);
    cuff.rotation.x = 0.04;
    sphere(elbow, skin, [0, -0.255, 0.025], [0.061, 0.078, 0.052]);
    sphere(elbow, skin, [-side * 0.045, -0.246, 0.05], [0.023, 0.04, 0.027]);
  }
  mesh(new THREE.CylinderGeometry(0.077, 0.085, 0.15, 14), skin, body, 0, hipY + 0.635, 0);
  const head = new THREE.Group(); head.name = 'head';
  head.position.set(0, hipY + 0.945, 0); body.add(head);
  const headWidth = config.presentation === 'masculine' ? 0.255 : config.presentation === 'feminine' ? 0.238 : 0.247;
  sphere(head, skin, [0, 0, 0], [headWidth, 0.305, 0.236]);
  sphere(head, skin, [0, -0.142, 0.048], [headWidth * 0.80, 0.14, 0.185]);
  const eyeSpacing = 0.072 + clamped(config.eyes) * 0.032;
  const eyeSize = 0.033 + clamped(config.eyes) * 0.015;
  for (const side of [-1, 1]) {
    sphere(head, skin, [side * headWidth, -0.024, -0.008], [0.050, 0.074, 0.047]);
    sphere(head, skinShade, [side * (headWidth + 0.022), -0.022, 0.020], [0.023, 0.044, 0.018]);
    sphere(head, cream, [side * eyeSpacing, 0.014, 0.214], [eyeSize * 1.26, eyeSize * 0.86, 0.027]);
    sphere(head, iris, [side * eyeSpacing, 0.013, 0.237], [eyeSize * 0.61, eyeSize * 0.72, 0.011]);
    sphere(head, dark, [side * eyeSpacing, 0.013, 0.247], [eyeSize * 0.33, eyeSize * 0.48, 0.007]);
    sphere(head, cream, [side * eyeSpacing - 0.009, 0.026, 0.253], [0.008, 0.009, 0.004]);
    seam(head, hair, [
      new THREE.Vector3(side * (eyeSpacing - eyeSize * 1.06), 0.035, 0.224),
      new THREE.Vector3(side * eyeSpacing, 0.052 + clamped(config.eyes) * 0.01, 0.237),
      new THREE.Vector3(side * (eyeSpacing + eyeSize * 1.1), 0.03, 0.218),
    ], 0.006);
    seam(head, hair, [
      new THREE.Vector3(side * (eyeSpacing - 0.034), 0.092, 0.218),
      new THREE.Vector3(side * eyeSpacing, 0.107, 0.22),
      new THREE.Vector3(side * (eyeSpacing + 0.042), 0.091, 0.2),
    ], config.presentation === 'masculine' ? 0.012 : 0.009);
    // Soft cheeks and a subtle ear stud bring detail into a close-up.
    sphere(head, skin, [side * 0.147, -0.067, 0.174], [0.071, 0.063, 0.050]);
    if (config.presentation !== 'masculine') sphere(head, gold, [side * (headWidth + 0.016), -0.065, 0.028], [0.016, 0.018, 0.012]);
  }
  const noseSize = 0.022 + clamped(config.nose) * 0.030;
  sphere(head, skin, [0, -0.039, 0.235], [noseSize * 0.72, noseSize * 1.13, noseSize]);
  sphere(head, skin, [0, -0.068, 0.243], [noseSize, noseSize * 0.58, noseSize * 0.85]);
  const smile = 0.033 + clamped(config.mouth) * 0.033;
  seam(head, skinShade, [new THREE.Vector3(-smile, -0.119, 0.223), new THREE.Vector3(0, -0.132, 0.233), new THREE.Vector3(smile, -0.117, 0.223)], 0.008);
  seam(head, skin, [new THREE.Vector3(-smile * 0.72, -0.14, 0.223), new THREE.Vector3(0, -0.147, 0.226), new THREE.Vector3(smile * 0.72, -0.138, 0.223)], 0.009);
  const cap = mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, head, 0, 0.035, -0.012);
  cap.scale.set(headWidth * 1.055, 0.304, 0.248);
  if (config.hairStyle === 'crop') {
    for (let i = 0; i < 4; i++) {
      const lock = sphere(head, i === 0 ? hairShine : hair, [-0.115 + i * 0.065, 0.227 + i * 0.008, 0.132], [0.117, 0.075, 0.139]);
      lock.rotation.z = -0.34;
    }
    sphere(head, hair, [-0.225, 0.084, -0.01], [0.038, 0.13, 0.10]);
    sphere(head, hair, [0.225, 0.084, -0.01], [0.035, 0.10, 0.10]);
  } else if (config.hairStyle === 'waves') {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const lock = sphere(head, i % 2 ? hairShine : hair, [side * (0.20 + Math.sin(i * 1.7) * 0.027), 0.13 - i * 0.10, -0.095], [0.080, 0.13, 0.115]);
        lock.rotation.z = side * (0.10 + i * 0.10);
      }
    }
    for (let i = 0; i < 3; i++) {
      const fringe = sphere(head, i === 1 ? hairShine : hair, [-0.13 + i * 0.09, 0.24 - i * 0.015, 0.14], [0.12, 0.071, 0.11]);
      fringe.rotation.z = -0.4;
    }
  } else if (config.hairStyle === 'bun') {
    sphere(head, hair, [0, 0.30, -0.14], [0.144, 0.14, 0.13]);
    sphere(head, hairShine, [-0.047, 0.339, -0.06], [0.084, 0.057, 0.06]);
    const band = mesh(new THREE.TorusGeometry(0.102, 0.014, 6, 20), gold, head, 0, 0.252, -0.12); band.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) sphere(head, hair, [side * 0.205, 0.08, 0.12], [0.031, 0.15, 0.047]);
  } else {
    cap.scale.y = 0.265;
    for (let i = 0; i < 6; i++) {
      const crest = sphere(head, i % 2 ? hairShine : hair, [0, 0.315 + Math.sin(i / 5 * Math.PI) * 0.065, -0.20 + i * 0.075], [0.063, 0.11, 0.083]);
      crest.rotation.x = 0.28 - i * 0.08;
    }
  }
  // Jewel-like community pin, always in the purple / black / gold family.
  const badge = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 6), gold, body, -shoulder * 0.49, hipY + 0.40, depth * 0.9);
  badge.rotation.x = Math.PI / 2;
  const inset = mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.014, 6), accent, body, -shoulder * 0.49, hipY + 0.40, depth * 0.9 + 0.008);
  inset.rotation.x = Math.PI / 2;
  agent.userData.body = body;
  agent.userData.head = head;
  agent.userData.restHeight = 0;
  agent.userData.hover = config.feet === 'hover';
  agent.userData.rig = {
    leftArm: body.getObjectByName('left-arm'), rightArm: body.getObjectByName('right-arm'),
    leftLeg: body.getObjectByName('left-leg'), rightLeg: body.getObjectByName('right-leg'),
    leftKnee: body.getObjectByName('left-knee'), rightKnee: body.getObjectByName('right-knee'),
    leftElbow: body.getObjectByName('left-elbow'), rightElbow: body.getObjectByName('right-elbow'),
  };
  return agent;
}

/** Shared world / preview rig; time is elapsed seconds, never wall-clock milliseconds. */
export function animateAvatar(agent: THREE.Group, time: number, moving = false) {
  const body = agent.userData.body as THREE.Group | undefined;
  const head = agent.userData.head as THREE.Group | undefined;
  const rig = agent.userData.rig as Record<string, THREE.Object3D> | undefined;
  if (!body || !rig) return;
  const stride = Math.sin(time * 9);
  const swing = moving ? stride * 0.47 : Math.sin(time * 1.6) * 0.025;
  body.position.y = agent.userData.hover ? 0.07 + Math.sin(time * 2.6) * 0.025 : moving ? Math.abs(Math.sin(time * 9)) * 0.018 : Math.sin(time * 1.8) * 0.008;
  body.rotation.z = moving ? Math.sin(time * 9) * 0.017 : 0;
  rig.leftArm.rotation.x = -swing * 0.8;
  rig.rightArm.rotation.x = swing * 0.8;
  rig.leftLeg.rotation.x = moving ? swing : 0;
  rig.rightLeg.rotation.x = moving ? -swing : 0;
  rig.leftKnee.rotation.x = moving ? Math.max(0, -stride) * 0.48 : 0;
  rig.rightKnee.rotation.x = moving ? Math.max(0, stride) * 0.48 : 0;
  rig.leftElbow.rotation.x = -0.06 - (moving ? Math.max(0, stride) * 0.15 : 0);
  rig.rightElbow.rotation.x = -0.06 - (moving ? Math.max(0, -stride) * 0.15 : 0);
  if (head) { head.rotation.y = moving ? -Math.sin(time * 9) * 0.022 : Math.sin(time * 0.6) * 0.028; head.rotation.z = moving ? 0 : Math.sin(time * 0.8) * 0.016; }
}

export function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      if ("geometry" in child)
        geometries.add(child.geometry as THREE.BufferGeometry);
      (Array.isArray(child.material)
        ? child.material
        : [child.material]
      ).forEach((mat) => {
        materials.add(mat);
        const textured = mat as THREE.MeshStandardMaterial;
        if (textured.map) textures.add(textured.map);
      });
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((mat) => mat.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}
