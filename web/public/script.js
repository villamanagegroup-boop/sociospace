// ===== Mobile menu =====
const toggle = document.getElementById('menuToggle');
const body = document.body;
if (toggle) {
  toggle.addEventListener('click', () => body.classList.toggle('menu-open'));
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => body.classList.remove('menu-open'));
  });
}

// ===== Tab toggle (How It Works) =====
const tabCreator = document.getElementById('tab-creator');
const tabBrand = document.getElementById('tab-brand');
const stepsCreator = document.getElementById('steps-creator');
const stepsBrand = document.getElementById('steps-brand');

if (tabCreator && tabBrand && stepsCreator && stepsBrand) {
  function setTab(which) {
    if (which === 'creator') {
      tabCreator.classList.add('on');
      tabBrand.classList.remove('on');
      stepsCreator.style.display = '';
      stepsBrand.style.display = 'none';
    } else {
      tabBrand.classList.add('on');
      tabCreator.classList.remove('on');
      stepsBrand.style.display = '';
      stepsCreator.style.display = 'none';
      stepsBrand.querySelectorAll('.fade-up').forEach((el, i) => {
        el.classList.remove('in');
        requestAnimationFrame(() => setTimeout(() => el.classList.add('in'), 30 + i * 90));
      });
    }
  }
  tabCreator.addEventListener('click', () => setTab('creator'));
  tabBrand.addEventListener('click', () => setTab('brand'));
}

// ===== Pricing toggle =====
const billMonth = document.getElementById('bill-month');
const billYear = document.getElementById('bill-year');
const prices = document.querySelectorAll('.plan .price[data-monthly]');
const compareCells = document.querySelectorAll('[data-compare-monthly]');

if (billMonth && billYear) {
  function setBilling(period) {
    if (period === 'month') {
      billMonth.classList.add('on');
      billYear.classList.remove('on');
    } else {
      billYear.classList.add('on');
      billMonth.classList.remove('on');
    }
    prices.forEach(p => {
      const monthly = p.dataset.monthly;
      const yearly = p.dataset.yearly;
      const per = p.querySelector('.per');
      const note = p.querySelector('.annual-note');
      const valueNode = p.childNodes[0];
      if (period === 'month') {
        valueNode.nodeValue = monthly + '\n      ';
        per.textContent = '/month';
        if (note) note.style.display = 'none';
      } else {
        valueNode.nodeValue = yearly + '\n      ';
        per.textContent = '/month';
        if (note) note.style.display = 'block';
      }
    });
    compareCells.forEach(c => {
      c.textContent = period === 'month' ? c.dataset.compareMonthly : c.dataset.compareYearly;
    });
  }
  billMonth.addEventListener('click', () => setBilling('month'));
  billYear.addEventListener('click', () => setBilling('year'));
}

// ===== Fade-in =====
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
document.querySelectorAll('.fade-up').forEach(el => io.observe(el));

window.addEventListener('load', () => {
  document.querySelectorAll('.hero .fade-up, .page-hero .fade-up, .profile-hero .fade-up').forEach(el => el.classList.add('in'));
});

// ===== Animated stat counters =====
const counters = document.querySelectorAll('[data-counter]');
if (counters.length) {
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.counterDecimals || '0', 10);
    const prefix = el.dataset.counterPrefix || '';
    const suffix = el.dataset.counterSuffix || '';
    const duration = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const v = target * easeOutCubic(t);
      el.textContent = prefix + v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCounter(e.target);
        counterIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterIO.observe(c));
}

// ===== Roster filter chips (brands page) =====
const rosterChips = document.querySelectorAll('.roster-preview .filter-chip[data-filter]');
const rosterRows = document.querySelectorAll('.roster-preview .creator-row[data-niche]');
if (rosterChips.length && rosterRows.length) {
  rosterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      rosterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      rosterRows.forEach(r => {
        const niches = r.dataset.niche.split(',').map(n => n.trim());
        if (f === 'all' || niches.includes(f)) {
          r.classList.remove('hidden');
        } else {
          r.classList.add('hidden');
        }
      });
    });
  });
}

// ===== Scroll progress bar =====
const progressBar = document.querySelector('.scroll-progress .bar');
if (progressBar) {
  const updateProgress = () => {
    const h = document.documentElement;
    const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
    progressBar.style.width = (Math.max(0, Math.min(1, scrolled)) * 100) + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
}

// ===== Jump nav active section =====
const jumpChips = document.querySelectorAll('.jump-chip[data-target]');
if (jumpChips.length) {
  const targets = Array.from(jumpChips).map(c => document.getElementById(c.dataset.target)).filter(Boolean);
  const setActiveChip = (id) => {
    jumpChips.forEach(c => c.classList.toggle('on', c.dataset.target === id));
  };
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) setActiveChip(e.target.id);
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  targets.forEach(t => sectionIO.observe(t));
  // smooth scroll w/ offset for sticky nav
  jumpChips.forEach(c => {
    c.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(c.dataset.target);
      if (target) {
        const top = target.getBoundingClientRect().top + window.pageYOffset - 180;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ===== Form chip multi-select (apply page) =====
document.querySelectorAll('[data-form-chip-group]').forEach(group => {
  const hidden = document.getElementById(group.dataset.formChipGroup);
  group.querySelectorAll('.form-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('on');
      if (hidden) {
        hidden.value = Array.from(group.querySelectorAll('.form-chip.on'))
          .map(c => c.dataset.value).join(',');
      }
    });
  });
});

// ===== Topic chooser (contact catch-all) =====
const topicCards = document.querySelectorAll('.topic-card[data-topic]');
const topicSelect = document.getElementById('form-topic');
const topicPillValue = document.querySelector('.topic-pill .topic-pill-value');

const TOPIC_LABELS = {
  brand: 'Brand Campaign',
  creator: 'Creator Support',
  careers: 'Work With Us',
  press: 'Press & Media',
  bug: 'Report a Problem',
  general: 'General Inquiry',
};

function selectTopic(topic, scroll = false) {
  if (!TOPIC_LABELS[topic]) return;
  topicCards.forEach(c => c.classList.toggle('on', c.dataset.topic === topic));
  if (topicSelect) topicSelect.value = topic;
  if (topicPillValue) topicPillValue.textContent = TOPIC_LABELS[topic];
  if (scroll) {
    const form = document.querySelector('form[data-form-type="contact"]');
    if (form) {
      const top = form.getBoundingClientRect().top + window.pageYOffset - 130;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }
}

if (topicCards.length) {
  topicCards.forEach(card => {
    card.addEventListener('click', () => selectTopic(card.dataset.topic, true));
  });
  // Preselect from ?topic= URL param
  const params = new URLSearchParams(window.location.search);
  const preTopic = params.get('topic');
  if (preTopic && TOPIC_LABELS[preTopic]) {
    selectTopic(preTopic, false);
  }
  // "change" link inside topic-pill scrolls back up
  const changeLink = document.querySelector('.topic-pill .change');
  if (changeLink) {
    changeLink.addEventListener('click', (e) => {
      e.preventDefault();
      const grid = document.querySelector('.topic-grid');
      if (grid) {
        const top = grid.getBoundingClientRect().top + window.pageYOffset - 130;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  }
}

// ===== Forms (apply / contact) =====
document.querySelectorAll('form[data-form-type]').forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const required = form.querySelectorAll('[required]');
    let firstInvalid = null;
    required.forEach(el => {
      const empty = !el.value || !el.value.trim();
      el.style.borderColor = empty ? '#FF7BA8' : '';
      el.style.background = empty ? '#FFE8EE' : '';
      if (empty && !firstInvalid) firstInvalid = el;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const success = form.querySelector('.form-success');
    if (success) {
      success.classList.add('on');
      form.querySelectorAll('input, select, textarea').forEach(el => {
        el.value = '';
        el.style.borderColor = '';
        el.style.background = '';
      });
      form.querySelectorAll('.form-chip.on').forEach(c => c.classList.remove('on'));
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => success.classList.remove('on'), 6000);
    }
  });
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => {
      el.style.borderColor = '';
      el.style.background = '';
    });
  });
});
