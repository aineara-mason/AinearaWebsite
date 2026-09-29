/* ─────────────────────────────────────────
   Sillage — sillage.js
   Page-specific interactions. Runs after main.js.
   ───────────────────────────────────────── */

(function () {
  'use strict';

  // ─── AI Chip toggle ───
  const chips = document.querySelectorAll('.sillage-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('sillage-chip--active'));
      chip.classList.add('sillage-chip--active');
    });
  });

  // ─── Extend cursor hover targets to Sillage elements ───
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (isFinePointer) {
    const ring = document.getElementById('cursorRing');
    if (ring) {
      const extraTargets = document.querySelectorAll('.sillage-chip, .sillage-review');
      extraTargets.forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('expanded'));
        el.addEventListener('mouseleave', () => ring.classList.remove('expanded'));
      });
    }
  }

})();
