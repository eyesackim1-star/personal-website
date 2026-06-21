// Footer year
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Mobile nav
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");
toggle?.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
links?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  })
);

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Scroll progress bar
const progress = document.getElementById("progress");
const onScroll = () => {
  const h = document.documentElement;
  const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
  if (progress) progress.style.width = `${Math.min(scrolled * 100, 100)}%`;
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Reveal on scroll
const revealEls = document.querySelectorAll(".reveal");
if (reduceMotion) {
  revealEls.forEach((el) => el.classList.add("in"));
} else {
  const revealIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // stagger siblings entering together
          entry.target.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => revealIO.observe(el));
}

// Count-up for numeric metrics
const counters = document.querySelectorAll(".num[data-count]");
const animateCount = (el) => {
  if (reduceMotion) return;
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const duration = 1100;
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(decimals);
  };
  requestAnimationFrame(step);
};
const countIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countIO.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.6 }
);
counters.forEach((el) => countIO.observe(el));

// Active nav link tracking
const navLinks = [...document.querySelectorAll(".nav-links a")];
const sections = navLinks
  .map((a) => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);
const navIO = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach((a) =>
          a.classList.toggle("active", a.getAttribute("href") === `#${id}`)
        );
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
sections.forEach((s) => navIO.observe(s));
