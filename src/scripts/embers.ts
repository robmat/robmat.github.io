// Sparks rising from the bottom of the hero, pushed aside by the pointer.
// Pauses while the hero is off-screen or the tab is hidden; skipped for reduced motion.

type Spark = { x: number; y: number; vx: number; vy: number; size: number; life: number; max: number; seed: number };

export function startEmbers(canvas: HTMLCanvasElement, area: HTMLElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // A soft glow drawn once and stamped for every spark: much cheaper than shadowBlur.
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const s = sprite.getContext('2d')!;
  const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,236,210,1)');
  g.addColorStop(0.18, 'rgba(255,170,90,.9)');
  g.addColorStop(0.45, 'rgba(242,107,29,.35)');
  g.addColorStop(1, 'rgba(242,107,29,0)');
  s.fillStyle = g;
  s.fillRect(0, 0, 64, 64);

  let width = 0;
  let height = 0;
  let sparks: Spark[] = [];
  let target = 0;
  const pointer = { x: -9999, y: -9999 };

  const spawn = (anywhere = false): Spark => ({
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + 10,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -(0.35 + Math.random() * 1.1),
    size: 2 + Math.random() * 7,
    life: 0,
    max: 260 + Math.random() * 420,
    seed: Math.random() * 1000,
  });

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = area.clientWidth;
    height = area.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    target = Math.round(Math.min(150, (width * height) / 9000));
    if (sparks.length === 0) sparks = Array.from({ length: target }, () => spawn(true));
  };
  new ResizeObserver(resize).observe(area);
  resize();

  area.addEventListener('pointermove', (e) => {
    const r = area.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  });
  area.addEventListener('pointerleave', () => (pointer.x = pointer.y = -9999));

  let visible = true;
  let running = false;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(area);
  document.addEventListener('visibilitychange', () => !document.hidden && start());

  let t = 0;
  const frame = () => {
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    t += 1;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';
    while (sparks.length < target) sparks.push(spawn());

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += 1;
      // Gentle sideways drift, like hot air.
      p.vx += Math.sin((t + p.seed) * 0.02) * 0.012;
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 140 * 140) {
        const d = Math.sqrt(d2) || 1;
        const force = (1 - d / 140) * 0.9;
        p.vx += (dx / d) * force;
        p.vy += (dy / d) * force * 0.6;
      }
      p.vx *= 0.97;
      p.vy = p.vy * 0.985 - 0.012;
      p.x += p.vx;
      p.y += p.vy;

      const fade = Math.min(1, p.life / 40) * (1 - p.life / p.max);
      const flicker = 0.65 + Math.sin((t + p.seed) * 0.25) * 0.35;
      if (fade <= 0 || p.y < -20) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, fade * flicker);
      const size = p.size * (0.6 + fade * 0.6);
      ctx.drawImage(sprite, p.x - size, p.y - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  };

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(frame);
  }
  start();
}
