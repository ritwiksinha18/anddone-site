// The highlights rail: arrows that step through the cards, and videos that
// play only while their card is on screen.
(function () {
  const rail = document.querySelector(".rail");
  if (!rail) return;
  const cards = [...rail.querySelectorAll(".rail-card")];
  const buttons = [...document.querySelectorAll(".rail-btn")];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Arrows ----------

  function stepBy(dir) {
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: dir * (cards[0].offsetWidth + gap), behavior: reduce ? "auto" : "smooth" });
  }
  function updateButtons() {
    const max = rail.scrollWidth - rail.clientWidth - 2;
    buttons.forEach((b) => {
      b.disabled = +b.dataset.dir < 0 ? rail.scrollLeft <= 2 : rail.scrollLeft >= max;
    });
  }
  buttons.forEach((b) => b.addEventListener("click", () => stepBy(+b.dataset.dir)));
  rail.addEventListener("scroll", updateButtons, { passive: true });
  window.addEventListener("resize", updateButtons);
  window.addEventListener("load", updateButtons);
  // Safari can run this before the rail is laid out, when it measures no
  // overflow and switches Next off; re-check whenever the rail or a card
  // changes size.
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(updateButtons);
    ro.observe(rail);
    ro.observe(cards[0]);
  }
  updateButtons();

  // ---------- Videos play only while their card is on screen ----------

  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target.querySelector("video");
      if (!v) continue;
      if (e.isIntersecting && !reduce) {
        v.preload = "auto";
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, { threshold: 0.12 });
  cards.forEach((c) => seen.observe(c));
})();
