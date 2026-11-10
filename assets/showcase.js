// The "A look for every finish" section: the screens and their copy, and a
// loader that brings in the 3D (Three.js and clay.js, ~180 KB compressed)
// only when the section is about to come on screen.
const SCREENS = [
  { lead: "Every workout, ready.", body: "Runs, rides, walks and lifts arrive from Apple Health, grouped by week, each with the shape of its route.", alt: "A list of workouts grouped by week, each with its type, date and stats." },
  { lead: "Your route, on the map.", body: "The line traced over the streets and water you actually passed, with your time, pace and heart rate beneath it.", alt: "A run's route drawn in white over a dark street map." },
  { lead: "A route with depth.", body: "The line lifts off the ground and glows over a photo you took on the way.", alt: "A glowing gold route lifted in 3D over a photo of a covered walkway." },
  { lead: "Liquid glass.", body: "Your numbers set in a pane of glass over your own photo, the heart rate drawn across the sky.", alt: "A tennis session's stats in a pane of glass over a photo of the court." },
  { lead: "Your heart rate, over the moment.", body: "Every beat of the session charted onto your photo, the peak and the low marked.", alt: "A heart-rate chart drawn over a photo of a racing circuit." },
  { lead: "A Polaroid for every run.", body: "Your photo in a white frame, the route drawn over it, the place and date in the margin.", alt: "A Polaroid-style card with the route drawn over a park photo." },
  { lead: "Fly over the city.", body: "Your route winding through the streets in 3D, the buildings standing around it.", alt: "A route winding through a 3D city of buildings." },
  { lead: "Every stat, packed.", body: "Thin rules and small type fit the whole workout on one card, splits and all.", alt: "A micro-graphics card of thin rules and small type over a cyclist." },
  { lead: "Burn as bright as you ran.", body: "A border of fire around your route and your numbers, flickering as it plays.", alt: "A run framed by a glowing border of fire against a night skyline." },
].map((s, i) => ({ ...s, src: `/assets/screens/screen-flat-${String(i + 1).padStart(2, "0")}.webp` }));

const mount = document.querySelector(".clay");
const cap = document.querySelector(".showcase-cap");
if (mount && cap) {
  const go = () => import("/assets/clay.js").then((m) => m.start(mount, cap, SCREENS));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); go(); } }, { rootMargin: "600px 0px" });
    io.observe(mount);
  } else {
    go();
  }
}
