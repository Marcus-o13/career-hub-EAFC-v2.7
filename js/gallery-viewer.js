/* Career Hub — visualizador de imagens em tela cheia, com navegação lateral. */
(function () {
  'use strict';
  let overlay, image, counter, previous, next, close, items = [], index = 0, startX = 0, startY = 0;
  const excluded = (img) => !img || img.closest('#careerImageViewer') || img.closest('button, a, label') || img.closest('[data-no-image-viewer]') || !img.getAttribute('src') || img.getAttribute('src').startsWith('data:image/svg+xml');
  function collect(clicked) {
    const all = Array.from(document.querySelectorAll('img')).filter(img => !excluded(img) && img.complete && img.naturalWidth > 0);
    items = all.map(img => ({ src: img.currentSrc || img.src, alt: img.alt || 'Imagem do Career Hub' }));
    index = Math.max(0, all.indexOf(clicked));
  }
  function render() {
    if (!items.length) return;
    image.src = items[index].src;
    image.alt = items[index].alt;
    counter.textContent = `${index + 1} / ${items.length}`;
    previous.disabled = items.length < 2;
    next.disabled = items.length < 2;
  }
  function move(delta) { if (items.length > 1) { index = (index + delta + items.length) % items.length; render(); } }
  function closeViewer() { overlay.hidden = true; document.body.classList.remove('image-viewer-open'); image.removeAttribute('src'); }
  function build() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.id = 'careerImageViewer'; overlay.hidden = true;
    overlay.innerHTML = '<button class="civ-close" type="button" aria-label="Fechar imagem">×</button><button class="civ-prev" type="button" aria-label="Imagem anterior">‹</button><figure><img class="civ-image" alt=""><figcaption class="civ-counter"></figcaption></figure><button class="civ-next" type="button" aria-label="Próxima imagem">›</button>';
    document.body.appendChild(overlay);
    image = overlay.querySelector('.civ-image'); counter = overlay.querySelector('.civ-counter'); previous = overlay.querySelector('.civ-prev'); next = overlay.querySelector('.civ-next'); close = overlay.querySelector('.civ-close');
    close.addEventListener('click', closeViewer); previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
    overlay.addEventListener('click', e => { if (e.target === overlay) closeViewer(); });
    overlay.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; startY = e.changedTouches[0].clientY; }, { passive: true });
    overlay.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - startX; const dy = e.changedTouches[0].clientY - startY; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1); }, { passive: true });
    document.addEventListener('keydown', e => { if (overlay.hidden) return; if (e.key === 'Escape') closeViewer(); if (e.key === 'ArrowRight') move(1); if (e.key === 'ArrowLeft') move(-1); });
  }
  document.addEventListener('click', e => {
    const img = e.target.closest && e.target.closest('img');
    if (!img || excluded(img)) return;
    build(); collect(img); if (!items.length) return;
    overlay.hidden = false; document.body.classList.add('image-viewer-open'); render();
  });
})();
