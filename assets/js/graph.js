/* Interactive force directed knowledge graph for the hero. No dependencies. */
(() => {
  const canvas = document.getElementById('graph');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const photo = document.getElementById('graph-photo');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    line: '#313131', lineHi: '#C3F25C', text: '#F2F2F2', muted: '#9B9B9B',
    faint: '#6B6B6B', surface: '#181818', accent: '#C3F25C', bg: '#000000'
  };

  const hubs = {
    'Generative AI': ['LLMs', 'RAG', 'Intelligent search'],
    'Agents': ['Multi agent', 'MCP', 'Tool use'],
    'Graph AI': ['Knowledge graphs', 'GNNs', 'Graph embeddings'],
    'Evaluation': ['Responsible AI', 'Retrieval quality'],
    'Production ML': ['MLOps', 'Anomaly detection', 'Azure AI Foundry'],
    'Life sciences': ['Discovery', 'Regulatory', 'Manufacturing']
  };
  const cross = [
    ['RAG', 'Knowledge graphs'], ['Retrieval quality', 'RAG'], ['Agents', 'Evaluation'],
    ['Discovery', 'Knowledge graphs'], ['Azure AI Foundry', 'Agents'], ['LLMs', 'Multi agent'],
    ['Anomaly detection', 'Graph embeddings']
  ];

  const nodes = [];
  const byId = new Map();
  const links = [];
  const add = (id, tier) => { const n = { id, tier, x: 0, y: 0, vx: 0, vy: 0, phase: Math.random() * Math.PI * 2 }; nodes.push(n); byId.set(id, n); return n; };
  const link = (a, b, kind) => links.push({ a: byId.get(a), b: byId.get(b), kind });

  add('me', 0);
  Object.entries(hubs).forEach(([hub, leaves]) => {
    add(hub, 1); link('me', hub, 'hub');
    leaves.forEach(l => { add(l, 2); link(hub, l, 'leaf'); });
  });
  cross.forEach(([a, b]) => link(a, b, 'cross'));

  const neighbors = new Map(nodes.map(n => [n, new Set([n])]));
  links.forEach(({ a, b }) => { neighbors.get(a).add(b); neighbors.get(b).add(a); });

  let W = 0, H = 0, scale = 1, dpr = 1;
  let hover = null, drag = null, running = false, visible = true, raf = 0, t = 0;

  function layoutInitial() {
    const cx = W / 2, cy = H / 2;
    const hubList = nodes.filter(n => n.tier === 1);
    hubList.forEach((h, i) => {
      const a = (i / hubList.length) * Math.PI * 2 - Math.PI / 2;
      h.x = cx + Math.cos(a) * 150 * scale; h.y = cy + Math.sin(a) * 150 * scale;
      const leaves = links.filter(l => l.a === h && l.kind === 'leaf').map(l => l.b);
      leaves.forEach((leaf, j) => {
        const b = a + (j - (leaves.length - 1) / 2) * 0.5;
        leaf.x = cx + Math.cos(b) * 245 * scale; leaf.y = cy + Math.sin(b) * 245 * scale;
      });
    });
    const me = byId.get('me'); me.x = cx; me.y = cy;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const first = W === 0;
    W = rect.width; H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(0.55, Math.min(1, Math.min(W, H * 1.1) / 560));
    if (first) layoutInitial();
    if (reduced && first) { for (let i = 0; i < 400; i++) step(false); }
    draw();
  }

  function step(drift = true) {
    const cx = W / 2, cy = H / 2;
    t += 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d2 = dx * dx + dy * dy || 0.01;
        if (d2 > 90000) continue;
        const f = (2200 * scale * scale) / d2;
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
      }
    }
    links.forEach(({ a, b, kind }) => {
      const target = (kind === 'hub' ? 140 : kind === 'leaf' ? 78 : 150) * scale;
      const k = kind === 'cross' ? 0.004 : 0.03;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = (d - target) * k;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    });
    const pad = 24;
    const me = byId.get('me');
    const keepOut = radius(me) + 28;
    nodes.forEach(n => {
      if (n === me) return;
      const dx = n.x - me.x, dy = n.y - me.y, d = Math.hypot(dx, dy) || 0.01;
      if (d < keepOut) { const f = (keepOut - d) * 0.2; n.vx += (dx / d) * f; n.vy += (dy / d) * f; }
    });
    // keep labels from overlapping: separate overlapping label boxes vertically
    ctx.font = '400 12px "Geist Mono", ui-monospace, monospace';
    const boxes = nodes.filter(n => n.tier).map(n => {
      const w = n.w || (n.w = ctx.measureText(n.id).width + (n.tier === 1 ? 24 : 12));
      const right = n.x + radius(n) + 8 + w < W - 4;
      return { n, x0: right ? n.x : n.x - w - 8, x1: right ? n.x + w + 8 : n.x, y: n.y, h: 18 };
    });
    const R = radius(me);
    boxes.push({ n: me, x0: me.x - R - 6, x1: me.x + R + 6, y: me.y, h: 2 * R + 12, fixed: true });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x1 < b.x0 || b.x1 < a.x0) continue;
        const dy = b.y - a.y, overlap = (a.h + b.h) / 2 - Math.abs(dy);
        if (overlap <= 0) continue;
        const s = (dy >= 0 ? 1 : -1) * overlap * 0.08;
        if (!a.fixed) a.n.vy -= s;
        if (!b.fixed) b.n.vy += s;
      }
    }
    nodes.forEach(n => {
      if (n === drag) { n.vx = n.vy = 0; return; }
      const g = n.tier === 0 ? 0.04 : 0.003;
      n.vx += (cx - n.x) * g; n.vy += (cy - n.y) * g;
      if (drift && n.tier) {
        n.vx += Math.cos(t * 0.012 + n.phase) * 0.06;
        n.vy += Math.sin(t * 0.010 + n.phase) * 0.06;
      }
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.max(pad, Math.min(W - pad, n.x + n.vx));
      n.y = Math.max(pad, Math.min(H - pad, n.y + n.vy));
    });
  }

  function radius(n) { return n.tier === 0 ? 42 * Math.max(scale, 0.75) : n.tier === 1 ? 6 : 3.5; }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const active = hover ? neighbors.get(hover) : null;

    links.forEach(({ a, b, kind }) => {
      const on = active && active.has(a) && active.has(b) && (a === hover || b === hover);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = on ? C.lineHi : C.line;
      ctx.globalAlpha = active && !on ? 0.35 : 1;
      ctx.lineWidth = on ? 1.5 : 1;
      if (kind === 'cross') ctx.setLineDash([3, 4]); else ctx.setLineDash([]);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    nodes.forEach(n => {
      const dim = active && !active.has(n);
      ctx.globalAlpha = dim ? 0.25 : 1;
      const r = radius(n);
      if (n.tier === 0) {
        ctx.save();
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.closePath();
        ctx.fillStyle = C.surface; ctx.fill();
        if (photo && photo.complete && photo.naturalWidth) {
          ctx.clip(); ctx.drawImage(photo, n.x - r, n.y - r, r * 2, r * 2);
        }
        ctx.restore();
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.stroke();
        return;
      }
      const isHover = n === hover;
      ctx.beginPath(); ctx.arc(n.x, n.y, isHover ? r + 2 : r, 0, Math.PI * 2);
      if (n.tier === 1) {
        ctx.fillStyle = isHover ? C.accent : C.bg; ctx.fill();
        ctx.strokeStyle = isHover ? C.accent : C.text; ctx.lineWidth = 1.5; ctx.stroke();
      } else {
        ctx.fillStyle = isHover || (active && active.has(n)) ? C.accent : C.faint; ctx.fill();
      }
      const label = n.id;
      ctx.font = n.tier === 1 ? '600 14px Manrope, system-ui, sans-serif' : '400 12px "Geist Mono", ui-monospace, monospace';
      ctx.fillStyle = n.tier === 1 ? C.text : (active && active.has(n) ? C.text : C.muted);
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(label).width;
      const right = n.x + r + 8 + w < W - 4;
      ctx.textAlign = right ? 'left' : 'right';
      ctx.fillText(label, right ? n.x + r + 8 : n.x - r - 8, n.y);
    });
    ctx.globalAlpha = 1;
  }

  function loop() {
    if (!running) return;
    step(!reduced);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function pick(x, y) {
    let best = null, bestD = Infinity;
    nodes.forEach(n => {
      const d = Math.hypot(n.x - x, n.y - y);
      const hit = radius(n) + (n.tier === 0 ? 4 : 12);
      if (d < hit && d < bestD) { best = n; bestD = d; }
    });
    return best;
  }
  function local(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  canvas.addEventListener('pointermove', e => {
    const [x, y] = local(e);
    if (drag) { drag.x = x; drag.y = y; if (reduced) { step(false); draw(); } return; }
    const n = pick(x, y);
    if (n !== hover) { hover = n; canvas.style.cursor = n ? 'pointer' : 'grab'; if (!running) draw(); }
  });
  canvas.addEventListener('pointerdown', e => {
    const [x, y] = local(e);
    const n = pick(x, y);
    if (!n) return;
    drag = n; hover = n; canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
  });
  const release = () => { drag = null; canvas.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => { if (!drag) { hover = null; if (!running) draw(); } });

  new ResizeObserver(resize).observe(canvas);
  if (photo) photo.addEventListener('load', draw);
  if (document.fonts) document.fonts.ready.then(draw);

  if (!reduced) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }
})();
