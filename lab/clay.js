// Clay orbit: nine matte clay phones on a slowly turning ring, each with a
// real extruded body (rounded, bevelled, with a camera bump and a side
// button), its screen inset on the front. Studio lighting from a soft room
// environment plus one key light gives the clay its shading; soft painted
// shadows ground the ring. Drag to spin, a flick carries on and eases back
// to cruising; the caption follows the phone facing you.
import * as THREE from "three";
import { RoomEnvironment } from "/assets/vendor/RoomEnvironment.js";

const S = window.SCREENS;
const n = S.length;
const mount = document.querySelector(".clay");
const cap = document.querySelector(".orbit-cap");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function fallback() {
  mount.classList.add("flat");
  mount.innerHTML = S.map((s) => `<img class="phone" src="${s.src}" alt="${s.alt}" loading="lazy">`).join("");
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  fallback();
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

// ---------- Light ----------

const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(-4, 7, 6);
scene.add(key);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 0.35));

// Shadows are painted, not cast: a heavily blurred ellipse under each
// phone and a wide faint haze under the whole ring, like a soft studio
// floor. Light-cast shadow maps always keep a readable edge; these don't.
function blurTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.35, "rgba(0,0,0,0.28)");
  grad.addColorStop(0.7, "rgba(0,0,0,0.07)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const blur = blurTexture();
const shadowMat = (opacity) => new THREE.MeshBasicMaterial({ map: blur, transparent: true, opacity, depthWrite: false, toneMapped: false });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat(0.22));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ---------- One clay phone ----------

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const SCREEN_W = 1.05, SCREEN_H = SCREEN_W * (1800 / 828), BEZEL = 0.075;
const BODY_W = SCREEN_W + 2 * BEZEL, BODY_H = SCREEN_H + 2 * BEZEL;
// Total depth is about a tenth of the width, as on a real phone.
const BEVEL = 0.04, DEPTH = 0.04, BEVEL_T = 0.035;
const clay = new THREE.MeshStandardMaterial({ color: 0xeceae5, roughness: 0.9, metalness: 0 });
const clayDark = new THREE.MeshStandardMaterial({ color: 0xd9d5cd, roughness: 0.85, metalness: 0 });

// The body: a rounded rectangle extruded with a soft bevel. The shape is
// shrunk by the bevel so the finished body lands on BODY_W x BODY_H.
const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(BODY_W - 2 * BEVEL, BODY_H - 2 * BEVEL, 0.2), {
  depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL_T, bevelSize: BEVEL, bevelSegments: 10, curveSegments: 40,
});
bodyGeo.translate(0, 0, -DEPTH / 2);
const FRONT = DEPTH / 2 + BEVEL_T;

// The screen: a rounded rectangle with UVs normalised to the texture.
const screenGeo = new THREE.ShapeGeometry(roundedRect(SCREEN_W, SCREEN_H, SCREEN_W * 0.14), 40);
{
  const pos = screenGeo.attributes.position, uv = screenGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / SCREEN_W + 0.5, pos.getY(i) / SCREEN_H + 0.5);
}

// Back details: a camera plateau with three lenses, and a side button.
const bumpGeo = new THREE.ExtrudeGeometry(roundedRect(0.5, 0.5, 0.14), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.02, bevelSegments: 6, curveSegments: 24 });
const lensGeo = new THREE.CylinderGeometry(0.085, 0.09, 0.03, 40);
const buttonGeo = new THREE.CapsuleGeometry(0.016, 0.32, 6, 16);

const loader = new THREE.TextureLoader();
function makePhone(src) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, clay);
  g.add(body);

  const tex = loader.load(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.z = FRONT + 0.003;
  g.add(screen);

  const bump = new THREE.Mesh(bumpGeo, clay);
  bump.rotation.y = Math.PI;
  bump.position.set(BODY_W / 2 - 0.38, BODY_H / 2 - 0.38, -FRONT);
  g.add(bump);
  for (const [dx, dy] of [[-0.11, 0.11], [0.11, 0.11], [-0.11, -0.11]]) {
    const lens = new THREE.Mesh(lensGeo, clayDark);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(bump.position.x - dx, bump.position.y + dy, -FRONT - 0.045);
    g.add(lens);
  }
  const button = new THREE.Mesh(buttonGeo, clay);
  button.position.set(BODY_W / 2 + 0.005, 0.45, 0);
  g.add(button);
  return g;
}

// ---------- The ring ----------

const SCALE = 1.15;  // the phones' size on screen; the ring grows with them
const ring = new THREE.Group();
scene.add(ring);
const FLOOR_Y = -(BODY_H * SCALE) / 2 - 0.32;
// Tight enough that neighbours nearly touch: nine phone widths plus a
// small gap, wrapped into a circle.
const RADIUS = (n * (BODY_W + 0.32) * SCALE) / (Math.PI * 2);
floor.position.y = FLOOR_Y - 0.002;
floor.scale.set(RADIUS * 3.4, RADIUS * 2.6, 1);
const phones = S.map((s, i) => {
  const p = makePhone(s.src);
  p.scale.setScalar(SCALE);
  const a = (i / n) * Math.PI * 2;
  p.position.set(Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS);
  p.rotation.y = a;
  p.userData.a = a;
  ring.add(p);
  // Its own soft shadow, on the floor beneath it, turning with the ring.
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(BODY_W * SCALE * 1.9, BODY_W * SCALE * 0.9), shadowMat(0.32));
  blob.rotation.set(-Math.PI / 2, 0, -a);
  blob.position.set(p.position.x, FLOOR_Y, p.position.z);
  ring.add(blob);
  p.userData.blob = blob;
  return p;
});

// ---------- Size and camera ----------

function resize() {
  const w = mount.clientWidth, h = mount.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Pull back on narrow screens so the whole ring stays in frame.
  // The front phone is the nearest, so it sits lowest in frame; aim a
  // little below the ring's centre so it clears the bottom edge.
  const dist = 10.5 * Math.max(1, 0.95 / camera.aspect);
  camera.position.set(0, dist * 0.13, dist);
  camera.lookAt(0, -0.35, 0);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(mount);
resize();

// ---------- Motion ----------

const CRUISE = reduce ? 0 : -0.16;  // radians per second
let angle = 0, vel = CRUISE, front = -1, dragging = false, lastX = 0, lastT = 0, t = 0;

function setCaption(i) {
  cap.style.opacity = 0;
  setTimeout(() => { cap.innerHTML = `<strong>${S[i].lead}</strong> ${S[i].body}`; cap.style.opacity = 1; }, 180);
}

let visible = true, last = performance.now();
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(mount);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!visible) return;
  t += dt;
  if (!dragging) {
    vel += (CRUISE - vel) * Math.min(1, dt * 1.4);
    angle += vel * dt;
  }
  ring.rotation.y = angle;
  // A slow float, out of step from phone to phone.
  phones.forEach((p, i) => {
    p.position.y = reduce ? 0 : Math.sin(t * 0.9 + i * 0.7) * 0.06;
    // As a phone floats up its shadow spreads and fades a little.
    p.userData.blob.material.opacity = 0.32 - p.position.y * 0.8;
    p.rotation.x = reduce ? 0 : Math.sin(t * 0.7 + i) * 0.03;
  });
  // The phone facing the camera: its angle on the ring closest to zero.
  let best = 0, bestCos = -2;
  phones.forEach((p, i) => {
    const c = Math.cos(p.userData.a + angle);
    if (c > bestCos) { bestCos = c; best = i; }
  });
  if (best !== front) { front = best; setCaption(best); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// ---------- Drag to spin ----------

mount.addEventListener("pointerdown", (e) => {
  dragging = true; mount.classList.add("dragging");
  lastX = e.clientX; lastT = performance.now();
  mount.setPointerCapture(e.pointerId);
});
mount.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const now = performance.now(), dx = e.clientX - lastX;
  const d = dx * 0.006;
  angle += d;
  vel = d / Math.max((now - lastT) / 1000, 0.008);
  lastX = e.clientX; lastT = now;
});
const end = () => { dragging = false; mount.classList.remove("dragging"); vel = Math.max(-4, Math.min(4, vel)); };
mount.addEventListener("pointerup", end);
mount.addEventListener("pointercancel", end);
