// Page-wide motion and pointer effects. Everything here is decoration: the page works
// (and stays fully visible) without it, and it backs off for reduced motion and touch.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ---------- Scroll reveal ---------- */

const revealer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

/* ---------- Count-up numbers ---------- */

const counter = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const el = entry.target as HTMLElement;
    counter.unobserve(el);
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix ?? '';
    if (reduceMotion) continue;
    const start = performance.now();
    const duration = 1600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(target * (t === 1 ? 1 : eased)) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
});
document.querySelectorAll('[data-count]').forEach((el) => counter.observe(el));

/* ---------- Header: hide on scroll down, show on scroll up ---------- */

const header = document.querySelector<HTMLElement>('.site-header');
if (header) {
  let lastY = scrollY;
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      header.dataset.scrolled = String(y > 24);
      header.dataset.hidden = String(y > lastY && y > 400);
      lastY = y;
    },
    { passive: true },
  );
}

/* ---------- Pointer effects (mouse / trackpad only) ---------- */

if (finePointer && !reduceMotion) {
  // Cursor spotlight on cards: the glow and the border light follow the pointer.
  document.addEventListener(
    'pointermove',
    (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--x', `${e.clientX - r.left}px`);
      card.style.setProperty('--y', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );

  // 3D tilt toward the pointer.
  document.querySelectorAll<HTMLElement>('.tilt').forEach((el) => {
    const max = Number(el.dataset.tilt ?? 7);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = 'transform .15s ease-out';
      el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = '';
      el.style.transform = '';
    });
  });

  // Magnetic buttons drift toward the pointer, the label a little further than the button.
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic || 0.35);
    const inner = el.querySelector<HTMLElement>('[data-magnetic-inner]');
    el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
    if (inner) inner.style.transition = el.style.transition;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      if (inner) inner.style.transform = `translate(${dx * strength * 0.4}px, ${dy * strength * 0.4}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
      if (inner) inner.style.transform = '';
    });
  });

  // Cursor follower: a ring that trails the pointer and grows over anything clickable.
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<div class="cursor-ring"></div>';
  document.body.append(cursor);
  const ring = cursor.firstElementChild as HTMLElement;
  let tx = -100;
  let ty = -100;
  let cx = tx;
  let cy = ty;
  document.addEventListener(
    'pointermove',
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      const target = e.target as HTMLElement;
      const labelled = target.closest<HTMLElement>('[data-cursor]');
      if (labelled) {
        cursor.dataset.state = 'label';
        ring.textContent = labelled.dataset.cursor!;
      } else {
        cursor.dataset.state = target.closest('a, button, [role="button"]') ? 'link' : '';
        ring.textContent = '';
      }
    },
    { passive: true },
  );
  document.documentElement.addEventListener('pointerleave', () => (cursor.dataset.state = 'hidden'));
  const follow = () => {
    cx = lerp(cx, tx, 0.2);
    cy = lerp(cy, ty, 0.2);
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);

  // Footer wordmark: each letter gets heavier the closer the pointer is.
  const wordmark = document.querySelector<HTMLElement>('.wordmark');
  if (wordmark) {
    const letters = [...wordmark.querySelectorAll<HTMLElement>('span')];
    wordmark.parentElement!.addEventListener('pointermove', (e) => {
      for (const letter of letters) {
        const r = letter.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        const w = 200 + 600 * Math.max(0, 1 - d / 420);
        letter.style.setProperty('--w', String(Math.round(w)));
      }
    });
    wordmark.parentElement!.addEventListener('pointerleave', () => letters.forEach((l) => l.style.removeProperty('--w')));
  }
}
