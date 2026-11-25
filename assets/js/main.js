(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Scroll reveals: once per element */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

  /* Current section in navigation */
  const links = [...document.querySelectorAll('.nav-links a, .mobile-menu a')];
  const sections = [...new Set(links.map(a => a.getAttribute('href')))].map(h => document.querySelector(h)).filter(Boolean);
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = '#' + e.target.id;
      links.forEach(a => a.getAttribute('href') === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => navIO.observe(s));

  /* Mobile menu */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('mobile-menu');
  let closeTimer = 0;
  const items = [...menu.querySelectorAll('li')];
  items.forEach((li, i) => { li.style.transitionDelay = `${Math.min(i * 60, 400)}ms`; });
  function setMenu(open) {
    clearTimeout(closeTimer);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('open')));
    } else {
      menu.classList.remove('open');
      closeTimer = setTimeout(() => { menu.hidden = true; }, 300);
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); } });
  window.matchMedia('(min-width: 1001px)').addEventListener('change', m => { if (m.matches) setMenu(false); });

  /* Tagline: words light up one at a time as the section scrolls past a trigger line */
  const tagline = document.getElementById('tagline');
  if (tagline) {
    const highlight = new Set(['trust', 'production.']);
    const words = tagline.textContent.trim().split(/\s+/);
    tagline.setAttribute('aria-label', tagline.textContent.trim());
    tagline.innerHTML = words.map(w => `<span class="w${highlight.has(w) ? ' hl' : ''}" aria-hidden="true">${w}</span>`).join(' ');
    const spans = [...tagline.querySelectorAll('.w')];
    if (reduced) {
      spans.forEach(s => s.classList.add('on'));
    } else {
      let lit = 0, ticking = false;
      const update = () => {
        ticking = false;
        const r = tagline.getBoundingClientRect();
        const trigger = window.innerHeight * 0.7;
        const progress = Math.max(0, Math.min(1, (trigger - r.top) / (r.height + window.innerHeight * 0.25)));
        const target = Math.round(progress * spans.length);
        while (lit < target) spans[lit++].classList.add('on');
        if (lit >= spans.length) window.removeEventListener('scroll', onScroll);
      };
      const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
    }
  }

  /* Commit graph lines */
  const git = document.querySelector('.git');
  if (git) {
    const svg = git.querySelector('.git-lines');
    const NS = 'http://www.w3.org/2000/svg';
    const center = el => {
      const g = git.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { x: r.left - g.left + r.width / 2, y: r.top - g.top + r.height / 2 };
    };
    const path = (d, stroke, opacity) => {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d); p.setAttribute('fill', 'none');
      p.setAttribute('stroke', stroke); p.setAttribute('stroke-width', '2');
      p.setAttribute('stroke-opacity', opacity); p.setAttribute('stroke-linecap', 'round');
      svg.appendChild(p);
    };
    const drawGit = () => {
      svg.innerHTML = '';
      const dots = [...git.querySelectorAll('.commit .dot')];
      if (!dots.length) return;
      const mainDot = git.querySelector('.commit[data-lane="main"] .dot');
      const acadDot = git.querySelector('.commit[data-lane="acad"] .dot');
      const mainX = center(mainDot).x;
      const acadX = acadDot ? center(acadDot).x : mainX;
      const top = center(dots[0]).y, bottom = center(dots[dots.length - 1]).y;
      path(`M${mainX} ${top} L${mainX} ${bottom}`, '#F2F2F2', '0.45');
      git.querySelectorAll('.commit[data-merge]').forEach(m => {
        const b = git.querySelector(`.commit[data-branch="${m.dataset.merge}"]`);
        if (!b) return;
        const y1 = center(m.querySelector('.dot')).y;
        const y2 = center(b.querySelector('.dot')).y;
        const c = 28;
        path(`M${mainX} ${y1} C${mainX} ${y1 + c} ${acadX} ${y1 + c / 2} ${acadX} ${y1 + c * 1.4}` +
             ` L${acadX} ${y2}` +
             ` C${acadX} ${y2 + c} ${mainX} ${y2 + c / 2} ${mainX} ${y2 + c * 1.4}`, '#C3F25C', '0.9');
      });
    };
    new ResizeObserver(drawGit).observe(git);
    if (document.fonts) document.fonts.ready.then(drawGit);
  }

  /* Copy email */
  const copyBtn = document.querySelector('.copy-email');
  const status = document.querySelector('.copy-status');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.email);
        status.textContent = `Copied ${copyBtn.dataset.email} to your clipboard.`;
      } catch {
        status.textContent = 'Copy failed. Use the Email me button instead.';
      }
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
