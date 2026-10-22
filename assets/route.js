// The route above the headline, drawn the way the app's Orbit Ridge draws
// one: the line lifted off the ground in an isometric view, with the
// Tracer light hanging beneath it as a curtain. A WebGL port of
// RenderEngine/RouteShaders.metal — route_fragment for the line (fixed
// solid core plus glow skirt), curtain_fragment's Tracer variant for the
// curtain. The view sways slowly on its axis
// so it reads as 3D rather than a drawing of it.
(function () {
  const canvas = document.querySelector("canvas.route");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: true, alpha: true });
  if (!gl) { canvas.hidden = true; return; }

  // ---------- The route ----------

  // A city loop: a street grid, a diagonal avenue, a river bend, and a cut
  // back across its own outbound leg. Ground plane, 0…1 both ways.
  const WAYPOINTS = [
    [0.08, 0.74], [0.30, 0.74], [0.30, 0.86], [0.44, 0.86], [0.44, 0.46],
    [0.56, 0.30], [0.74, 0.30], [0.74, 0.12], [0.86, 0.12], [0.90, 0.30],
    [0.86, 0.44], [0.94, 0.58], [0.88, 0.74], [0.70, 0.80], [0.62, 0.62],
    [0.26, 0.60], [0.20, 0.40], [0.30, 0.26], [0.16, 0.16], [0.06, 0.34],
    [0.12, 0.52],
  ];

  // Generous corner turns, then two passes of Chaikin so the curvature
  // itself is continuous: no kink where a turn meets a straight.
  function roundCorners(points, radius) {
    const out = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n], c = points[i], next = points[(i + 1) % n];
      const l1 = Math.hypot(prev[0] - c[0], prev[1] - c[1]);
      const l2 = Math.hypot(next[0] - c[0], next[1] - c[1]);
      const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
      const a = [c[0] + (prev[0] - c[0]) * r / l1, c[1] + (prev[1] - c[1]) * r / l1];
      const b = [c[0] + (next[0] - c[0]) * r / l2, c[1] + (next[1] - c[1]) * r / l2];
      for (let s = 0; s <= 10; s++) {
        const t = s / 10, u = 1 - t;
        out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
      }
    }
    return out;
  }
  function chaikin(points, rounds) {
    let p = points;
    for (let r = 0; r < rounds; r++) {
      const next = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      p = next;
    }
    return p;
  }
  // Even spacing keeps arc length honest, so the tracer moves at one speed.
  function resample(points, count) {
    const closed = points.concat([points[0]]);
    const lengths = [0];
    for (let i = 1; i < closed.length; i++) {
      lengths.push(lengths[i - 1] + Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]));
    }
    const total = lengths[lengths.length - 1];
    const out = [];
    let j = 1;
    for (let k = 0; k < count; k++) {
      const target = (k / count) * total;
      while (lengths[j] < target) j++;
      const t = (target - lengths[j - 1]) / (lengths[j] - lengths[j - 1] || 1);
      const a = closed[j - 1], b = closed[j];
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return out;
  }

  const N = 900;
  const flat = resample(chaikin(roundCorners(WAYPOINTS, 0.09), 2), N);
  // Elevation: two rolling climbs and one short sharp hill, as a loop
  // would have. It doubles as the curtain's effort value, the way heart
  // rate drives it in the app.
  function elevation(a) {
    const tau = Math.PI * 2;
    return 0.5 + 0.28 * Math.sin(tau * a * 2 + 0.9) + 0.16 * Math.sin(tau * a * 5 + 2.1)
      + 0.22 * Math.exp(-Math.pow((a - 0.62) / 0.05, 2));
  }
  const LIFT = 0.30;  // world height of the highest point
  const BASE = 0.10;  // the line never touches the floor
  const world = flat.map(([u, v], i) => {
    const e = Math.min(Math.max(elevation(i / N), 0), 1.2) / 1.2;
    return { x: (u - 0.5) * 2, z: (v - 0.5) * 1.6, y: BASE + e * LIFT, value: e };
  });

  // ---------- Shaders ----------

  const COMMON = `
    precision highp float;
    uniform float uHead;      // tracer head, 0…1 along the route
    uniform float uDrawing;   // 1 while drawing on: nothing past the head
    float trailAt(float arc) {
      float behind = arc <= uHead ? uHead - arc : uHead + 1.0 - arc;
      return exp(-behind * 6.0);
    }
    float columnAt(float arc) {
      float d = abs(arc - uHead);
      d = min(d, 1.0 - d);
      return exp(-d * d * 900.0);
    }`;

  // Line: a screen-space ribbon, so the stroke keeps one width however
  // the view turns. uFloor flattens it onto the ground for its shadow.
  const LINE_VS = `
    attribute vec3 aPos; attribute vec3 aPrev; attribute vec3 aNext;
    attribute float aArc; attribute float aSide;
    uniform mat4 uMVP; uniform vec2 uView; uniform float uHalfWidth; uniform float uFloor;
    varying float vArc; varying float vSide;
    vec3 ground(vec3 p) { return mix(p, vec3(p.x, 0.0, p.z), uFloor); }
    void main() {
      vec4 c = uMVP * vec4(ground(aPos), 1.0);
      vec2 sp = (uMVP * vec4(ground(aPrev), 1.0)).xy * uView;
      vec2 sn = (uMVP * vec4(ground(aNext), 1.0)).xy * uView;
      vec2 dir = normalize(sn - sp + vec2(1e-6, 0.0));
      c.xy += vec2(-dir.y, dir.x) * aSide * uHalfWidth / uView;
      gl_Position = c;
      vArc = aArc; vSide = aSide;
    }`;
  const LINE_FS = COMMON + `
    varying float vArc; varying float vSide;
    uniform float uGlow; uniform float uSoftness; uniform float uDim;
    void main() {
      if (uDrawing > 0.5 && vArc > uHead) discard;
      float d = clamp(abs(vSide), 0.0, 1.0);
      float core = 1.0 - smoothstep(0.12, 0.20, d);
      float skirt = pow(1.0 - d, uSoftness) * uGlow;
      float profile = core + skirt * 0.9;
      float energy = 0.34 + trailAt(vArc) * 0.55 + columnAt(vArc) * 1.7;
      float a = clamp(profile * energy * uDim, 0.0, 1.0);
      gl_FragColor = vec4(vec3(a), a);
    }`;

  // Curtain: the wall from the floor up to the line, lit by the Tracer.
  const CURTAIN_VS = `
    attribute vec3 aPos; attribute float aArc; attribute float aH; attribute float aValue;
    uniform mat4 uMVP;
    varying float vArc; varying float vH; varying float vValue;
    void main() {
      gl_Position = uMVP * vec4(aPos, 1.0);
      vArc = aArc; vH = aH; vValue = aValue;
    }`;
  const CURTAIN_FS = COMMON + `
    varying float vArc; varying float vH; varying float vValue;
    void main() {
      if (uDrawing > 0.5 && vArc > uHead) discard;
      float h = clamp(vH, 0.0, 1.0);
      float intensity = pow(h, 1.6) * (columnAt(vArc) * 1.7 + trailAt(vArc) * 0.55 + 0.08);
      intensity *= 0.45 + 0.65 * clamp(vValue, 0.0, 1.0);
      float a = clamp(intensity * 0.95, 0.0, 1.0);
      gl_FragColor = vec4(vec3(a), a);
    }`;

  function program(vs, fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  }
  const lineProg = program(LINE_VS, LINE_FS);
  const curtainProg = program(CURTAIN_VS, CURTAIN_FS);
  if (!lineProg || !curtainProg) { canvas.hidden = true; return; }

  // ---------- Geometry ----------

  function upload(data) {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return b;
  }

  // Line strip: two vertices per point, each carrying its neighbours.
  const lineData = [];
  for (let i = 0; i <= N; i++) {
    const p = world[i % N], prev = world[(i - 1 + N) % N], next = world[(i + 1) % N];
    for (const side of [1, -1]) {
      lineData.push(p.x, p.y, p.z, prev.x, prev.y, prev.z, next.x, next.y, next.z, i / N, side);
    }
  }
  const lineBuf = upload(lineData);
  const lineCount = lineData.length / 11;

  const curtainData = [];
  for (let i = 0; i <= N; i++) {
    const p = world[i % N];
    curtainData.push(p.x, p.y, p.z, i / N, 1, p.value);
    curtainData.push(p.x, 0, p.z, i / N, 0, p.value);
  }
  const curtainBuf = upload(curtainData);
  const curtainCount = curtainData.length / 6;

  function bind(prog, buffer, layout) {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = layout.reduce((s, [, n]) => s + n, 0) * 4;
    let offset = 0;
    for (const [name, n] of layout) {
      const loc = gl.getAttribLocation(prog, name);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride, offset);
      }
      offset += n * 4;
    }
  }
  const uni = (prog, name) => gl.getUniformLocation(prog, name);

  // ---------- Camera ----------

  // Isometric: a fixed tilt, and a yaw that sways a few degrees either side.
  const PITCH = 0.60;   // ≈ 34°
  const YAW = Math.PI / 4;
  const SWAY = 0.16;    // radians either side
  function project(p, yaw) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    return [cy * p.x + sy * p.z, sp * sy * p.x + cp * p.y - sp * cy * p.z];
  }
  // One fixed fit for every sway angle, so the sway never reads as a zoom.
  let fit = null;
  function computeFit() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let k = -4; k <= 4; k++) {
      const yaw = YAW + (k / 4) * SWAY;
      for (let i = 0; i < N; i += 3) {
        for (const y of [world[i].y, 0]) {
          const [sx, sy] = project({ x: world[i].x, y, z: world[i].z }, yaw);
          minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
          minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
        }
      }
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
  }
  // Column-major: the project() rotation, then an orthographic fit into
  // the canvas with square pixels and room left for the glow.
  function mvp(yaw, width, height) {
    if (!fit) fit = computeFit();
    const margin = 0.88;
    const sX = Math.min((2 * margin) / fit.w, ((2 * margin) / fit.h) * (height / width));
    const sY = sX * (width / height);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    return new Float32Array([
      cy * sX, sp * sy * sY, 0, 0,
      0, cp * sY, 0, 0,
      sy * sX, -sp * cy * sY, 0, 0,
      -fit.cx * sX, -fit.cy * sY, 0, 1,
    ]);
  }

  // ---------- Frame loop ----------

  let dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  // MAX blending: overlapping light holds its level instead of stacking
  // into spikes where the loop crosses itself. Additive is the fallback.
  gl.enable(gl.BLEND);
  const minmax = gl.getExtension("EXT_blend_minmax");
  if (minmax) gl.blendEquation(minmax.MAX_EXT);
  gl.blendFunc(gl.ONE, gl.ONE);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The tracer laps at the app's pace: head = fract(t · 2.2 · 0.055).
  const LAP_SPEED = 2.2 * 0.055;
  // The draw-on decelerates into exactly the lap speed, so the head that
  // draws the line is the same light that then keeps lapping it.
  const DRAW = 2.4;
  const B = (LAP_SPEED * DRAW - 1) / (DRAW * DRAW);
  const A = LAP_SPEED - 2 * B * DRAW;
  let start = null;

  function frame(now) {
    if (start === null) start = now;
    resize();
    const t = reduce ? DRAW + 3 : (now - start) / 1000;
    const drawing = t < DRAW;
    const head = drawing ? A * t + B * t * t : (1 + (t - DRAW) * LAP_SPEED) % 1;
    const yaw = YAW + (reduce ? 0 : Math.sin(t * 0.22) * SWAY);
    const W = canvas.width, H = canvas.height;
    const m = mvp(yaw, W, H);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    bind(curtainProg, curtainBuf, [["aPos", 3], ["aArc", 1], ["aH", 1], ["aValue", 1]]);
    gl.uniformMatrix4fv(uni(curtainProg, "uMVP"), false, m);
    gl.uniform1f(uni(curtainProg, "uHead"), head);
    gl.uniform1f(uni(curtainProg, "uDrawing"), drawing ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, curtainCount);

    bind(lineProg, lineBuf, [["aPos", 3], ["aPrev", 3], ["aNext", 3], ["aArc", 1], ["aSide", 1]]);
    gl.uniformMatrix4fv(uni(lineProg, "uMVP"), false, m);
    gl.uniform2f(uni(lineProg, "uView"), W / 2, H / 2);
    gl.uniform1f(uni(lineProg, "uHead"), head);
    gl.uniform1f(uni(lineProg, "uDrawing"), drawing ? 1 : 0);
    gl.uniform1f(uni(lineProg, "uGlow"), 0.55);
    gl.uniform1f(uni(lineProg, "uSoftness"), 2.4);
    // The route's shadow on the floor first, faint, then the line itself.
    gl.uniform1f(uni(lineProg, "uFloor"), 1);
    gl.uniform1f(uni(lineProg, "uHalfWidth"), 5 * dpr);
    gl.uniform1f(uni(lineProg, "uDim"), 0.22);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, lineCount);
    gl.uniform1f(uni(lineProg, "uFloor"), 0);
    gl.uniform1f(uni(lineProg, "uHalfWidth"), 9 * dpr);
    gl.uniform1f(uni(lineProg, "uDim"), 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, lineCount);

    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if (reduce) window.addEventListener("resize", () => requestAnimationFrame(frame));
})();
