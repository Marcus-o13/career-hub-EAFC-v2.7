/* Career Hub — visualizador em tela cheia com navegação e zoom por pinça. */
(function () {
  'use strict';
  let overlay, image, counter, previous, next, close, items = [], index = 0;
  let startX = 0, startY = 0, lastX = 0, lastY = 0, scale = 1, panX = 0, panY = 0;
  let pinchStartDistance = 0, pinchStartScale = 1, panStartX = 0, panStartY = 0, lastTap = 0;
  const pointers = new Map();
  const MIN_ZOOM = 1, MAX_ZOOM = 4;
  const excluded = (img) => !img || img.closest('#careerImageViewer') || img.closest('button, a, label') || img.closest('[data-no-image-viewer]') || !img.getAttribute('src') || img.getAttribute('src').startsWith('data:image/svg+xml');
  function collect(clicked) {
    const all = Array.from(document.querySelectorAll('img')).filter(img => !excluded(img) && img.complete && img.naturalWidth > 0);
    items = all.map(img => ({ src: img.currentSrc || img.src, alt: img.alt || 'Imagem do Career Hub' }));
    index = Math.max(0, all.indexOf(clicked));
  }
  function resetZoom() { scale = 1; panX = 0; panY = 0; applyTransform(); }
  function applyTransform() {
    if (!image) return;
    image.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    image.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    image.style.touchAction = 'none';
  }
  function render() {
    if (!items.length) return;
    resetZoom(); image.src = items[index].src; image.alt = items[index].alt;
    counter.textContent = `${index + 1} / ${items.length}`;
    previous.disabled = items.length < 2; next.disabled = items.length < 2;
  }
  function move(delta) { if (items.length > 1) { index = (index + delta + items.length) % items.length; render(); } }
  function closeViewer() { overlay.hidden = true; document.body.classList.remove('image-viewer-open'); image.removeAttribute('src'); resetZoom(); pointers.clear(); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function build() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.id = 'careerImageViewer'; overlay.hidden = true;
    overlay.innerHTML = '<button class="civ-close" type="button" aria-label="Fechar imagem">×</button><button class="civ-prev" type="button" aria-label="Imagem anterior">‹</button><figure><img class="civ-image" alt=""><figcaption class="civ-counter"></figcaption></figure><button class="civ-next" type="button" aria-label="Próxima imagem">›</button><div class="civ-zoom-hint" aria-hidden="true">Aproxime dois dedos para ampliar · toque duas vezes para zoom</div>';
    document.body.appendChild(overlay);
    image = overlay.querySelector('.civ-image'); counter = overlay.querySelector('.civ-counter'); previous = overlay.querySelector('.civ-prev'); next = overlay.querySelector('.civ-next'); close = overlay.querySelector('.civ-close');
    close.addEventListener('click', closeViewer); previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeViewer(); });
    image.addEventListener('dblclick', e => { e.preventDefault(); scale = scale > 1 ? 1 : 2; if (scale === 1) { panX = 0; panY = 0; } applyTransform(); });
    image.addEventListener('wheel', e => { e.preventDefault(); scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale + (e.deltaY < 0 ? .2 : -.2))); if (scale === 1) { panX = 0; panY = 0; } applyTransform(); }, { passive: false });
    image.addEventListener('touchstart', e => {
      const now = Date.now();
      if (e.touches.length === 1) {
        const t = e.touches[0]; startX = lastX = t.clientX; startY = lastY = t.clientY; panStartX = panX; panStartY = panY;
        if (now - lastTap < 300) { scale = scale > 1 ? 1 : 2; if (scale === 1) { panX = 0; panY = 0; } applyTransform(); lastTap = 0; e.preventDefault(); }
        else lastTap = now;
      } else if (e.touches.length === 2) {
        pinchStartDistance = distance({x:e.touches[0].clientX,y:e.touches[0].clientY},{x:e.touches[1].clientX,y:e.touches[1].clientY});
        pinchStartScale = scale; e.preventDefault();
      }
    }, { passive: false });
    image.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const d = distance({x:e.touches[0].clientX,y:e.touches[0].clientY},{x:e.touches[1].clientX,y:e.touches[1].clientY});
        if (pinchStartDistance) scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartScale * d / pinchStartDistance));
        if (scale === 1) { panX = 0; panY = 0; } applyTransform(); e.preventDefault();
      } else if (e.touches.length === 1 && scale > 1) {
        panX = panStartX + e.touches[0].clientX - startX; panY = panStartY + e.touches[0].clientY - startY; applyTransform(); e.preventDefault();
      }
    }, { passive: false });
    image.addEventListener('touchend', e => {
      if (e.touches.length < 2) pinchStartDistance = 0;
      if (scale === 1 && e.changedTouches.length && e.touches.length === 0) {
        const t = e.changedTouches[0], dx = t.clientX - startX, dy = t.clientY - startY;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
    document.addEventListener('keydown', e => { if (overlay.hidden) return; if (e.key === 'Escape') closeViewer(); if (e.key === 'ArrowRight' && scale === 1) move(1); if (e.key === 'ArrowLeft' && scale === 1) move(-1); });
  }
  document.addEventListener('click', e => {
    const img = e.target.closest && e.target.closest('img');
    if (!img || excluded(img)) return;
    build(); collect(img); if (!items.length) return;
    overlay.hidden = false; document.body.classList.add('image-viewer-open'); render();
  });
})();
