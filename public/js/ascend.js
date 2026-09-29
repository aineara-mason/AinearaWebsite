/* ─────────────────────────────────────────
   Ascend — ascend.js
   Page-specific interactions. Runs after main.js.
   ───────────────────────────────────────── */

(function () {
  'use strict';

  // ─── Readiness chip toggle ───
  const chips = document.querySelectorAll('.ascend-chips .sillage-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('sillage-chip--active'));
      chip.classList.add('sillage-chip--active');
    });
  });

  // ─── Extend cursor hover targets ───
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (isFinePointer) {
    const ring = document.getElementById('cursorRing');
    if (ring) {
      document.querySelectorAll('.sillage-chip').forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('expanded'));
        el.addEventListener('mouseleave', () => ring.classList.remove('expanded'));
      });
    }
  }

})();
