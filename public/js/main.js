/* ─────────────────────────────────────────
   Aineara — main.js
   ───────────────────────────────────────── */

(function () {
  'use strict';

  // ─── Custom Cursor (desktop only) ───
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (isFinePointer) {
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursorRing');

    if (cursor && ring) {
      let mouseX = 0, mouseY = 0;
      let ringX  = 0, ringY  = 0;
      let rafId;
      let rafRunning = true;

      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.style.left = mouseX + 'px';
        cursor.style.top  = mouseY + 'px';
      });

      function animateRing() {
        ringX += (mouseX - ringX) * 0.12;
        ringY += (mouseY - ringY) * 0.12;
        ring.style.left = ringX + 'px';
        ring.style.top  = ringY + 'px';
        if (rafRunning) rafId = requestAnimationFrame(animateRing);
      }
      animateRing();

      window.addEventListener('blur',  () => { rafRunning = false; cancelAnimationFrame(rafId); });
      window.addEventListener('focus', () => { if (!rafRunning) { rafRunning = true; animateRing(); } });

      const hoverTargets = document.querySelectorAll(
        'a, button, .pillar, .approach-item, .nav-cta, .btn-primary, .btn-ghost'
      );
      hoverTargets.forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('expanded'));
        el.addEventListener('mouseleave', () => ring.classList.remove('expanded'));
      });
    }
  }

  // ─── Nav: scroll state ───
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── Nav: mobile toggle ───
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen.toString());
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        // Disable smooth scroll briefly so anchor jumps don't fight the menu close
        document.documentElement.style.scrollBehavior = 'auto';
        requestAnimationFrame(() => {
          document.documentElement.style.scrollBehavior = '';
        });
      });
    });
  }

  // ─── Hero scroll indicator: hide once hero leaves viewport ───
  const heroScroll = document.querySelector('.hero-scroll');
  const heroSection = document.querySelector('.hero');
  if (heroScroll && heroSection && 'IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => { heroScroll.style.opacity = entry.isIntersecting ? '' : '0'; },
      { threshold: 0.1 }
    );
    heroObserver.observe(heroSection);
  }

  // ─── Scroll Reveal ───
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -72px 0px' }
    );
    reveals.forEach((el) => observer.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('visible'));
  }

  // ─── Helpers ───
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  // ─── Resend integration ───
  async function subscribeEmail(email, source) {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Subscription failed');
    }
    return res.json();
  }

  // ─── Homepage Email Form ───
  // Matches your existing success UX: hides the form, shows #successMsg element.
  const emailForm  = document.getElementById('emailForm');
  const emailInput = document.getElementById('emailInput');
  const formNote   = document.getElementById('formNote');
  const successMsg = document.getElementById('successMsg');

  if (emailForm && emailInput) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = emailInput.value.trim();

      if (!email || !isValidEmail(email)) {
        emailInput.classList.add('error');
        emailInput.focus();
        return;
      }
      emailInput.classList.remove('error');

      const submitBtn = emailForm.querySelector('button');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        await subscribeEmail(email, 'aineara-homepage');

        emailInput.value = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get Early Access';
        if (formNote) {
          formNote.textContent = "You're on the list. We'll be in touch.";
          formNote.style.color = 'var(--amber)';
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get Early Access';
        if (formNote) {
          formNote.textContent = 'Something went wrong. Please try again.';
          formNote.style.color = 'rgba(201, 100, 76, 0.8)';
        }
        console.error('Subscription error:', err);
      }
    });

    emailInput.addEventListener('input', () => {
      emailInput.classList.remove('error');
    });
  }

  // ─── Sillage Forms ───
  // Two forms (hero + CTA). Both update a note element inline
  // rather than hiding the form — keeps the page feeling alive.
  function wireSillageForm({ formId, inputId, noteId, source, successMsg = "You're on the list." }) {
    const form  = document.getElementById(formId);
    const input = document.getElementById(inputId);
    const note  = noteId ? document.getElementById(noteId) : null;

    if (!form || !input) return; // not on this page

    const btn = form.querySelector('button');
    if (btn) btn.dataset.label = btn.textContent;

    function setNote(msg, isError) {
      if (!note) return;
      note.textContent = msg;
      note.style.color = isError ? 'rgba(201, 100, 76, 0.8)' : 'var(--cognac)';
    }

    input.addEventListener('input', () => {
      input.classList.remove('error');
      setNote('');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = input.value.trim();

      if (!email || !isValidEmail(email)) {
        input.classList.add('error');
        input.focus();
        return;
      }
      input.classList.remove('error');

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      setNote('');

      try {
        await subscribeEmail(email, source);
        input.value = '';
        setNote(successMsg);
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
        setNote('Something went wrong. Please try again.', true);
        console.error('Sillage subscription error:', err);
      }
    });
  }

  wireSillageForm({ formId: 'heroForm',      inputId: 'heroEmail',      noteId: 'heroNote',      source: 'sillage-landing',  successMsg: "You'll be first to wear it." });
  wireSillageForm({ formId: 'ctaForm',       inputId: 'ctaEmail',       noteId: 'ctaMsg',        source: 'sillage-landing',  successMsg: "You'll be first to wear it." });
  wireSillageForm({ formId: 'ascendForm',    inputId: 'ascendEmail',    noteId: 'ascendNote',    source: 'ascend-homepage',  successMsg: "We'll reach out when Ascend is ready." });
  wireSillageForm({ formId: 'ascendHeroForm', inputId: 'ascendHeroEmail', noteId: 'ascendHeroNote', source: 'ascend-landing', successMsg: "We'll reach out when Ascend is ready." });

  // ─── Theme Toggle ───
  // (Moved inside IIFE — was previously leaking into global scope)
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  function getInitialTheme() {
    const saved = localStorage.getItem('aineara-theme');
    if (saved) return saved;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      html.removeAttribute('data-theme');
    }
    localStorage.setItem('aineara-theme', theme);
    if (themeToggle) {
      themeToggle.setAttribute('aria-label',
        theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      );
    }
  }

  applyTheme(getInitialTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('aineara-theme')) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });

  // ─── Dynamic copyright year ───
  const yearEl = document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
