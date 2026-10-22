// The QR plate on hover: it lifts, leans toward the cursor and follows it
// while the cursor stays on it, and the light on the metal moves with the
// cursor. Everything eases toward its target each frame, so it glides
// rather than snapping; on leave it settles back into place.
(function () {
  const tile = document.querySelector(".qr-tile");
  if (!tile || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const FOLLOW = 0.07;   // share of the cursor's offset the plate travels
  const TILT = 5;        // degrees at the plate's edge
  const EASE = 0.12;

  const target = { x: 0, y: 0, rx: 0, ry: 0, lift: 0, mx: 30, my: 20 };
  const now = { ...target };
  let raf = 0;

  function onMove(e) {
    // The plate's resting box, not its moved one, so following the cursor
    // doesn't feed back into where the cursor appears to be.
    const r = tile.parentElement.querySelector(".qr-anchor").getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const nx = Math.max(-1, Math.min(1, dx / (r.width / 2)));
    const ny = Math.max(-1, Math.min(1, dy / (r.height / 2)));
    target.x = dx * FOLLOW;
    target.y = dy * FOLLOW;
    target.ry = nx * TILT;
    target.rx = -ny * TILT;
    target.lift = 1;
    target.mx = 50 + nx * 50;
    target.my = 50 + ny * 50;
    if (!raf) raf = requestAnimationFrame(step);
  }
  function onLeave() {
    Object.assign(target, { x: 0, y: 0, rx: 0, ry: 0, lift: 0, mx: 30, my: 20 });
    if (!raf) raf = requestAnimationFrame(step);
  }
  function step() {
    let moving = false;
    for (const k in target) {
      const d = target[k] - now[k];
      now[k] += d * EASE;
      if (Math.abs(d) > 0.01) moving = true;
    }
    tile.style.setProperty("--tx", now.x.toFixed(2) + "px");
    tile.style.setProperty("--ty", (now.y - now.lift * 3).toFixed(2) + "px");
    tile.style.setProperty("--rx", now.rx.toFixed(2) + "deg");
    tile.style.setProperty("--ry", now.ry.toFixed(2) + "deg");
    tile.style.setProperty("--lift", now.lift.toFixed(3));
    tile.style.setProperty("--mx", now.mx.toFixed(1) + "%");
    tile.style.setProperty("--my", now.my.toFixed(1) + "%");
    raf = moving ? requestAnimationFrame(step) : 0;
  }

  // The hit area is a fixed anchor the size of the plate at rest, a little
  // padded, so the plate can drift without slipping out from under the
  // cursor and the cursor can't chase it off.
  const anchor = document.createElement("span");
  anchor.className = "qr-anchor";
  tile.parentElement.insertBefore(anchor, tile);
  anchor.addEventListener("pointermove", onMove);
  anchor.addEventListener("pointerleave", onLeave);
  anchor.addEventListener("click", () => tile.click());
})();
