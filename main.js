/* ═══════════════════════════════════════════
   PURE FOR CURE — main.js
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── BANNER CAROUSEL ───
     Slides come from Supabase (tables: banners, site_settings),
     managed from the dashboard's Banners section — nothing is
     hardcoded here. This block only contains carousel behavior. */
  (async function() {
    const track = document.getElementById('bannerTrack');
    const section = document.getElementById('banner-carousel');
    const dotsWrap = document.getElementById('bannerDots');
    if (!track || !section) return;

    function isExternalUrl(url) {
      try { return new URL(url, window.location.href).origin !== window.location.origin; }
      catch { return false; }
    }

    let masterEnabled = true;
    let slides = [];
    try {
      const [{ data: setting }, { data: banners, error }] = await Promise.all([
        sb.from('site_settings').select('value').eq('key', 'homepage_banner_enabled').maybeSingle(),
        sb.from('banners').select('*').eq('enabled', true).order('sort_order', { ascending: true })
      ]);
      if (error) throw error;
      masterEnabled = setting ? setting.value === 'true' : true;
      slides = (banners || []).filter(b => b.image_url && b.image_url.trim());
    } catch (err) {
      section.style.display = 'none'; // Supabase unreachable — hide rather than show broken content
      return;
    }

    if (!masterEnabled || !slides.length) {
      section.style.display = 'none';
      return;
    }

    const n = slides.length;
    const BP_MOBILE = 767; // matches the project's existing breakpoints (see style.css)

    // With only one banner there's nothing to navigate between —
    // hide the arrows and dots rather than showing controls that do nothing.
    const prevBtn = document.getElementById('bannerPrev');
    const nextBtn = document.getElementById('bannerNext');
    if (n <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (dotsWrap) dotsWrap.style.display = 'none';
    }

    // Full image, no cropping: desktop banner is used at every size; the
    // mobile <source> only kicks in below BP_MOBILE, and only when a
    // mobile banner was actually uploaded. Height is intentionally not
    // set here — see updateHeight(), which sizes the container to match
    // whichever image the browser actually loaded, so nothing is ever
    // stretched, zoomed, or cut off.
    function slideHTML(b, i) {
      const alt = (b.title || 'Campaign banner').replace(/"/g, '&quot;');
      const loading = i === 0 ? 'eager' : 'lazy';
      const fetchpriority = i === 0 ? 'high' : 'auto';
      const mobileSource = b.mobile_image_url && b.mobile_image_url.trim()
        ? `<source media="(max-width: ${BP_MOBILE}px)" srcset="${b.mobile_image_url}" />`
        : '';
      const media = `<picture>${mobileSource}<img class="banner-image" src="${b.image_url}" alt="${alt}" loading="${loading}" fetchpriority="${fetchpriority}" /></picture>`;
      if (!b.link_url) return `<div class="banner-slide">${media}</div>`;
      const external = isExternalUrl(b.link_url);
      const relAttr = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<div class="banner-slide"><a class="banner-slide-link" href="${b.link_url}"${relAttr}>${media}</a></div>`;
    }

    // Leading clone of the last slide + trailing clone of the first,
    // so looping in either direction is seamless.
    track.innerHTML = slideHTML(slides[n - 1], n - 1) + slides.map(slideHTML).join('') + slideHTML(slides[0], 0);
    const totalSlides = n + 2;
    track.style.width = `${totalSlides * 100}%`;
    [...track.children].forEach(el => { el.style.width = `${100 / totalSlides}%`; });

    let index = 1; // position 1 = first real slide (position 0 is the leading clone)
    let animating = false;

    function setPosition(withTransition) {
      track.style.transition = withTransition ? 'transform 0.6s cubic-bezier(.4,0,.2,1)' : 'none';
      track.style.transform = `translateX(-${index * (100 / totalSlides)}%)`;
    }
    setPosition(false);

    // Sizes the carousel to exactly match the currently-active slide's
    // image at its real aspect ratio — this is what makes "no cropping"
    // possible with a horizontally-sliding track. Re-runs whenever the
    // active slide changes, the image finishes loading, or the viewport
    // is resized (which can also swap which <source> is loaded).
    function updateHeight() {
      const activeSlide = track.children[index];
      const img = activeSlide?.querySelector('img.banner-image');
      if (!img || !img.naturalWidth) return;
      const ratio = img.naturalHeight / img.naturalWidth;
      section.style.height = `${section.clientWidth * ratio}px`;
    }
    track.querySelectorAll('img.banner-image').forEach(img => {
      // Persistent (not { once: true }) — a resize across the mobile
      // breakpoint makes the browser swap <picture><source>, which
      // fires 'load' again for the newly-fetched image.
      img.addEventListener('load', updateHeight);
      if (img.complete) updateHeight();
    });
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateHeight, 120);
    });

    function updateDots() {
      const real = ((index - 1) + n) % n;
      dotsWrap?.querySelectorAll('.banner-dot').forEach((d, i) => d.classList.toggle('active', i === real));
    }

    function goTo(newIndex) {
      if (animating) return;
      animating = true;
      index = newIndex;
      setPosition(true);
      updateDots();
      updateHeight();
    }
    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    track.addEventListener('transitionend', () => {
      animating = false;
      if (index === n + 1) { index = 1; setPosition(false); }
      else if (index === 0) { index = n; setPosition(false); }
    });

    if (dotsWrap) {
      dotsWrap.innerHTML = slides.map((_, i) => `<button class="banner-dot${i === 0 ? ' active' : ''}" aria-label="Go to banner ${i + 1}"></button>`).join('');
      dotsWrap.addEventListener('click', e => {
        const btn = e.target.closest('.banner-dot');
        if (!btn) return;
        goTo([...dotsWrap.children].indexOf(btn) + 1);
        resetAutoplay();
      });
    }

    document.getElementById('bannerNext')?.addEventListener('click', () => { next(); resetAutoplay(); });
    document.getElementById('bannerPrev')?.addEventListener('click', () => { prev(); resetAutoplay(); });

    let autoplayTimer;
    function startAutoplay() { autoplayTimer = setInterval(next, 5000); }
    function resetAutoplay() { clearInterval(autoplayTimer); startAutoplay(); }
    if (n > 1) startAutoplay();

    section.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    section.addEventListener('mouseleave', () => { if (n > 1) startAutoplay(); });

    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; clearInterval(autoplayTimer); }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
      if (n > 1) startAutoplay();
    });
  })();

  /* ─── LOADER ─── */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => {
    setTimeout(() => loader.classList.add('loaded'), 1600);
  });

  /* ─── PARTICLES ─── */
  const particleContainer = document.getElementById('particles');
  if (particleContainer) {
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        bottom: ${Math.random() * 20}%;
        width: ${2 + Math.random() * 4}px;
        height: ${2 + Math.random() * 4}px;
        animation-duration: ${6 + Math.random() * 12}s;
        animation-delay: ${Math.random() * 8}s;
        opacity: ${0.2 + Math.random() * 0.5};
      `;
      particleContainer.appendChild(p);
    }
  }

  /* ─── NAVBAR SCROLL ─── */
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      backToTop.classList.add('visible');
    } else {
      navbar.classList.remove('scrolled');
      backToTop.classList.remove('visible');
    }
  }, { passive: true });

  /* ─── MOBILE NAV ─── */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileNav = document.querySelector('.nav-mobile');
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  document.querySelectorAll('.nav-mobile a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    });
  });

  /* ─── BACK TO TOP ─── */
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ─── SMOOTH SCROLL for nav links ─── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ─── LIVE STATS (auto-incrementing over time) ───
     Meals Served: +10,000 every week
     Locations: +1 every week
     Days Active: +1 every day
     All computed from a fixed baseline so the site stays in sync
     without needing manual edits. */
  const STATS_BASE_DATE = new Date('2026-08-04T00:00:00');
  const STATS_BASE = { meals: 4000000, mealsPerWeek: 10000, locations: 40, locationsPerWeek: 1, days: 3000 };
  function computeLiveStats() {
    const elapsedDays = Math.max(0, Math.floor((Date.now() - STATS_BASE_DATE) / 86400000));
    const elapsedWeeks = Math.floor(elapsedDays / 7);
    return {
      meals: STATS_BASE.meals + elapsedWeeks * STATS_BASE.mealsPerWeek,
      locations: STATS_BASE.locations + elapsedWeeks * STATS_BASE.locationsPerWeek,
      days: STATS_BASE.days + elapsedDays,
    };
  }
  const liveStats = computeLiveStats();
  document.querySelectorAll('[data-stat]').forEach(el => {
    const val = liveStats[el.dataset.stat];
    if (val !== undefined) el.textContent = val.toLocaleString('en-IN');
  });

  /* ─── COUNT-UP NUMBER ANIMATION ─── */
  function countUp(el, duration = 1600) {
    const target = Number(el.textContent.replace(/[^0-9]/g, ''));
    if (!target) return;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString('en-IN');
    }
    requestAnimationFrame(tick);
  }
  const countTargets = document.querySelectorAll('.hstat-num, .stat-number');

  /* ─── SEVA MEMORIES LOCATION CARDS ───
     Rendered from PFC_LOCATIONS (locations-data.js). To add, remove,
     or reorder a location/activity card, edit that file only. Runs
     before the reveal-on-scroll setup below so the new cards get the
     same animation as everything else. */
  (function() {
    const grid = document.getElementById('sevaLocationsGrid');
    if (!grid || typeof PFC_LOCATIONS === 'undefined') return;
    grid.innerHTML = PFC_LOCATIONS.map((loc, i) => `
      <a href="${loc.href}" class="seva-card reveal-up" style="--delay:${(i * 0.1).toFixed(1)}s">
        <div class="seva-card-glow"></div>
        <div class="seva-card-icon"><i class="fas ${loc.icon}"></i></div>
        <div class="seva-card-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="seva-card-body">
          <h3>${loc.title}</h3>
          <p>${loc.subtitle}</p>
          <div class="seva-card-tag">${loc.tag}</div>
        </div>
        <div class="seva-card-footer">
          <span class="seva-photo-count"><i class="fas fa-images"></i> View Memories</span>
          <span class="seva-arrow"><i class="fas fa-arrow-right"></i></span>
        </div>
      </a>`).join('');
  })();

  /* ─── SCROLL REVEAL ─── */
  const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  // Separate hero elements from the rest
  const heroSection = document.getElementById('hero');
  const heroRevealEls = [...revealEls].filter(el => heroSection.contains(el));
  const pageRevealEls = [...revealEls].filter(el => !heroSection.contains(el));

  // Hero elements animate in after loader (1.7s), each with its own CSS --delay
  setTimeout(() => {
    heroRevealEls.forEach(el => el.classList.add('visible'));
    countTargets.forEach(el => { if (heroSection.contains(el)) countUp(el); });
  }, 1700);

  // All other elements use IntersectionObserver on scroll
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        entry.target.querySelectorAll('.hstat-num, .stat-number').forEach(el => countUp(el));
        if (entry.target.matches('.hstat-num, .stat-number')) countUp(entry.target);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  pageRevealEls.forEach(el => revealObserver.observe(el));


  /* ─── MISSION/VISION TABS ─── */
  const tabs = document.querySelectorAll('.mv-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.mv-content').forEach(c => c.classList.add('hidden'));
      const target = document.getElementById(`mv-${tab.dataset.tab}`);
      target?.classList.remove('hidden');
    });
  });

  /* ─── TESTIMONIALS CAROUSEL ─── */
  const track = document.getElementById('testimonialsTrack');
  const cards = track?.querySelectorAll('.testimonial-card');
  const dotsContainer = document.getElementById('tDots');
  const prevBtn = document.getElementById('tPrev');
  const nextBtn = document.getElementById('tNext');

  if (track && cards && cards.length) {
    let currentIndex = 0;
    let cardsVisible = 3;
    let autoInterval;

    const getCardsVisible = () => window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
    const totalSlides = () => Math.ceil(cards.length / getCardsVisible());

    const buildDots = () => {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < totalSlides(); i++) {
        const dot = document.createElement('div');
        dot.className = `t-dot${i === 0 ? ' active' : ''}`;
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    };

    const updateDots = () => {
      document.querySelectorAll('.t-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentIndex);
      });
    };

    const goTo = (index) => {
      cardsVisible = getCardsVisible();
      const max = totalSlides() - 1;
      currentIndex = Math.max(0, Math.min(index, max));
      const cardWidth = cards[0].offsetWidth + 28;
      track.style.transform = `translateX(-${currentIndex * cardsVisible * cardWidth}px)`;
      updateDots();
    };

    prevBtn?.addEventListener('click', () => { goTo(currentIndex - 1); resetAuto(); });
    nextBtn?.addEventListener('click', () => { goTo(currentIndex + 1); resetAuto(); });

    const startAuto = () => {
      autoInterval = setInterval(() => {
        const next = currentIndex + 1 >= totalSlides() ? 0 : currentIndex + 1;
        goTo(next);
      }, 5000);
    };
    const resetAuto = () => { clearInterval(autoInterval); startAuto(); };

    // Touch/swipe support
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { diff > 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1); resetAuto(); }
    });

    window.addEventListener('resize', () => { buildDots(); goTo(0); });

    buildDots();
    startAuto();
  }

  /* ─── GALLERY LIGHTBOX ─── */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img && img.src) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  });
  const closeLightbox = () => {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  };
  document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  document.querySelector('.lightbox-overlay')?.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  /* ─── DONATE AMOUNT BUTTONS ─── */
  const PLATE_COST = 80;
  const goDonateBtn = document.getElementById('goDonateBtn');

  function homePlatesFor(amt) {
    const n = Number(amt);
    if (!n || n <= 0) return null;
    const p = n / PLATE_COST;
    return Number.isInteger(p) ? p.toLocaleString('en-IN') : p.toFixed(1);
  }

  function updateHomeDonate(amount) {
    const n = Number(amount);
    if (!n || n <= 0) return;
    if (goDonateBtn) goDonateBtn.href = `donate.html?amount=${n}`;
    const noteEl = document.getElementById('homePlatesNote');
    if (noteEl) {
      const plates = homePlatesFor(n);
      const plural = plates === '1' ? 'plate' : 'plates';
      noteEl.innerHTML = `<i class="fas fa-utensils"></i> ₹${n.toLocaleString('en-IN')} serves <strong>${plates}</strong> ${plural} of prasadam`;
    }
  }

  updateHomeDonate(4000);

  document.querySelectorAll('.amount-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const customInput = document.getElementById('customAmount');
      if (customInput) customInput.value = '';
      updateHomeDonate(btn.dataset.amount);
    });
  });

  const customAmountInput = document.getElementById('customAmount');
  if (customAmountInput) {
    customAmountInput.addEventListener('input', () => {
      const val = Number(customAmountInput.value);
      if (val > 0) {
        document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
        updateHomeDonate(val);
      }
    });
  }

  /* ─── COPY TO CLIPBOARD ─── */
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        const icon = btn.querySelector('i');
        icon.className = 'fas fa-check';
        btn.style.color = '#4ade80';
        setTimeout(() => {
          icon.className = 'fas fa-copy';
          btn.style.color = '';
        }, 2000);
      } catch {}
    });
  });

  /* ─── VOLUNTEER FORM ─── */
  document.getElementById('volunteerForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Registered! We\'ll reach out soon.';
    btn.style.background = '#16a34a';
    e.target.reset();
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
    }, 4000);
  });

  /* ─── CONTACT FORM ─── */
  document.getElementById('contactForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Message Sent! Thank you.';
    btn.style.background = '#16a34a';
    e.target.reset();
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
    }, 4000);
  });

  /* ─── ACTIVE NAV LINK on scroll ─── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      }
    });
  }, { threshold: 0.4 });
  sections.forEach(s => sectionObserver.observe(s));


});
