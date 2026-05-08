/* Socio Space OS — shared client behavior
   Two modes:
     - demo:      hardcoded mock data inlined in HTML stays as-is. Banner shown.
     - workspace: real account. JS clears demo content and renders empty states +
                  the user's actual studio info (from localStorage; backend later).
*/

(function () {
  const AUTH_KEY      = 'os_authed';
  const ADMIN_KEY     = 'os_admin_bypass';
  const MODE_KEY      = 'os_mode';
  const WORKSPACE_KEY = 'os_workspace';
  const PENDING_KEY   = 'os_pending_signup';

  const ROUTE     = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isLogin   = ROUTE === 'login.html'  || ROUTE === 'login';
  const isSignup  = ROUTE === 'signup.html' || ROUTE === 'signup';
  const isPublic  = isLogin || isSignup;

  // ----- Mode + Workspace helpers (exposed for pricing handoff) -----
  const Mode = {
    DEMO: 'demo',
    WORKSPACE: 'workspace',
    get()         { return localStorage.getItem(MODE_KEY) || 'demo'; },
    set(m)        { localStorage.setItem(MODE_KEY, m); },
    isDemo()      { return this.get() === 'demo'; },
    isWorkspace() { return this.get() === 'workspace'; }
  };

  const Workspace = {
    info() {
      try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null'); }
      catch (_) { return null; }
    },
    setInfo(info) { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(info)); },
    clear()       { localStorage.removeItem(WORKSPACE_KEY); },
    initials(name) {
      if (!name) return 'ME';
      const parts = String(name).trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  };

  // Expose for pricing.html and any cross-page handoff
  window.SocioOS = { Mode, Workspace, AUTH_KEY, MODE_KEY, WORKSPACE_KEY, PENDING_KEY };

  // ----- Auth gate -----
  if (!isPublic) {
    if (localStorage.getItem(AUTH_KEY) !== '1') {
      window.location.replace('login.html');
      return;
    }
  }

  // ====================================================================
  //  MODE-AWARE RENDERING
  // ====================================================================

  function emptyState(opts) {
    return '' +
      '<div class="os-workspace-empty">' +
        '<div class="icon">' + (opts.icon || '◇') + '</div>' +
        '<h4>' + opts.title + '</h4>' +
        '<p>' + opts.body + '</p>' +
        (opts.cta ? '<button class="btn btn-pink" type="button">' + opts.cta + '</button>' : '') +
      '</div>';
  }

  function clearStats(zeros) {
    const tiles = document.querySelectorAll('.os-stats .stat-tile');
    tiles.forEach((tile, i) => {
      const num = tile.querySelector('.num');
      const delta = tile.querySelector('.delta');
      if (num)   num.textContent  = zeros[i] != null ? zeros[i] : '0';
      if (delta) delta.innerHTML  = '<span style="color:var(--ink-4)">—</span>';
    });
  }

  function clearTbody(panelEl, colspan, opts) {
    if (!panelEl) return;
    const tbody = panelEl.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML =
      '<tr><td colspan="' + colspan + '" style="padding:0; border:none;">' +
        emptyState(opts) +
      '</td></tr>';
  }

  function findPanel(headTitle) {
    const heads = document.querySelectorAll('.panel-head h3');
    for (const h of heads) {
      if (h.textContent.trim().toLowerCase() === headTitle.toLowerCase()) {
        return h.closest('.panel');
      }
    }
    return null;
  }

  function clearPanel(headTitle, opts, colspan) {
    const panel = findPanel(headTitle);
    if (!panel) return;
    const tbody = panel.querySelector('tbody');
    if (tbody) {
      clearTbody(panel, colspan || 6, opts);
      return;
    }
    const body = panel.querySelector('.panel-body');
    if (body) body.innerHTML = emptyState(opts);
  }

  function injectModeBanner() {
    const main = document.querySelector('.os-main');
    if (!main) return;
    const top  = main.querySelector('.os-top');
    if (!top)  return;

    if (Mode.isDemo()) {
      if (!main.querySelector('.os-demo-banner')) {
        const banner = document.createElement('div');
        banner.className = 'os-demo-banner';
        banner.innerHTML =
          '<strong>Demo</strong>' +
          '<span>You\'re browsing a sample workspace with placeholder data — no commitment, no signup.</span>' +
          '<a href="signup.html" class="cta">Start your real workspace →</a>';
        top.insertAdjacentElement('afterend', banner);
      }
    } else if (Mode.isWorkspace()) {
      const info = Workspace.info();
      if (info) {
        const brand = document.querySelector('.os-side-head .brand');
        if (brand) {
          brand.innerHTML = escapeHtml(info.studio) +
            '<small>' + escapeHtml(info.plan || 'Studio') + ' plan</small>';
        }
        const foot = document.querySelector('.os-side-foot');
        if (foot) {
          const av  = foot.querySelector('.os-avatar');
          const who = foot.querySelector('.who');
          if (av)  av.textContent  = Workspace.initials(info.name);
          if (who) who.innerHTML   = escapeHtml(info.name) +
                                     '<small>' + escapeHtml(info.email) + '</small>';
        }
      }
      const h1 = top.querySelector('h1');
      if (h1 && !h1.querySelector('.workspace-badge')) {
        const badge = document.createElement('span');
        badge.className = 'workspace-badge';
        badge.textContent = (info && info.plan) ? info.plan : 'Live';
        h1.appendChild(badge);
      }
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ----- Per-page workspace renderers -----
  const renderers = {
    'index.html': function () {
      clearStats(['0', '0', '$0', '0']);
      const grid2 = document.querySelectorAll('.os-grid.cols-2 .panel');
      if (grid2[0]) clearTbody(grid2[0], 4, {
        icon: '◎', title: 'No deals in flight',
        body: 'Pitch a creator to a brand to start tracking your pipeline.',
        cta: '+ New deal'
      });
      const activity = findPanel('Activity');
      if (activity) {
        const body = activity.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({
          icon: '✦', title: 'Activity feed is quiet',
          body: 'Inquiries, applications, signed contracts, and payouts will appear here in real time.'
        });
      }
      const apps = findPanel('New Applications');
      if (apps) {
        const body = apps.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({
          icon: '⌗', title: 'No new applications',
          body: 'Share your apply link to start receiving creator submissions.'
        });
      }
      const inboxP = findPanel('Inbox · Recent');
      if (inboxP) {
        const body = inboxP.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({
          icon: '✉', title: 'Inbox empty',
          body: 'Form submissions from your public site land here, sorted by topic.'
        });
      }
      const bk = findPanel("This Week's Bookings");
      if (bk) {
        const body = bk.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({
          icon: '◷', title: 'Nothing booked',
          body: 'TikTok Lives, shoot days, and deadlines show up here as you book them.'
        });
      }
      const head = document.querySelector('.os-page-head h2');
      const sub  = document.querySelector('.os-page-head p');
      const info = Workspace.info();
      if (head && info) head.textContent = 'Welcome, ' + info.name.split(/\s+/)[0] + '.';
      if (sub) sub.textContent = "Your studio is set up. Add your first creator, client, or campaign to get rolling.";
    },

    'inbox.html': function () {
      const list = document.querySelector('.inbox-list');
      if (list) list.innerHTML = emptyState({
        icon: '✉', title: 'No messages yet',
        body: 'Form submissions from your public site (/contact) land here. Connect your form to start collecting.'
      });
      const detail = document.querySelector('.inbox-detail');
      if (detail) detail.innerHTML = '';
      const filters = document.querySelector('.os-filters');
      if (filters) filters.querySelectorAll('.filter-chip').forEach(c => {
        c.textContent = c.textContent.replace(/\s*·\s*\d+/, '').replace(/\s+\d+$/, '');
      });
    },

    'applications.html': function () {
      clearStats(['0', '0', '0', '—']);
      const panel = document.querySelector('.os-body .panel');
      clearTbody(panel, 7, {
        icon: '⌗', title: 'No applications yet',
        body: 'Share your /apply page link with creators. Submissions show here for review.'
      });
    },

    'creators.html': function () {
      const grid = document.querySelector('.creator-grid');
      if (grid) grid.innerHTML = emptyState({
        icon: '★', title: 'Roster is empty',
        body: 'Add your first creator to build your bookable lineup.',
        cta: '+ Add creator'
      });
    },

    'clients.html': function () {
      clearStats(['0', '$0', '0', '0']);
      const panel = document.querySelector('.os-body .panel');
      clearTbody(panel, 7, {
        icon: '▣', title: 'No clients yet',
        body: 'Brands you work with show up here. Add them as inquiries convert.',
        cta: '+ Add client'
      });
    },

    'campaigns.html': function () {
      document.querySelectorAll('.kan-col').forEach(col => {
        const cnt = col.querySelector('.kan-col-head .count');
        if (cnt) cnt.textContent = '0';
        col.querySelectorAll('.kan-card').forEach(c => c.remove());
      });
      const first = document.querySelector('.kan-col');
      if (first) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:30px 8px;text-align:center;color:var(--ink-4);font-size:0.78rem;border:1px dashed var(--line-3);border-radius:var(--radius-sm);margin-top:6px;';
        empty.innerHTML = 'No deals yet.<br>Click + to add.';
        first.appendChild(empty);
      }
    },

    'bookings.html': function () {
      document.querySelectorAll('.cal-event').forEach(e => e.remove());
    },

    'contracts.html': function () {
      clearStats(['0', '0', '5', '0']);
      const activity = findPanel('Recent Activity');
      if (activity) clearTbody(activity, 3, {
        icon: '§', title: 'No contracts sent',
        body: 'When you send your first contract for signature, it shows up here.'
      });
    },

    'payments.html': function () {
      clearStats(['$0', '$0', '$0', '$0']);
      const panels = document.querySelectorAll('.os-grid.cols-2 .panel');
      if (panels[0]) clearTbody(panels[0], 4, {
        icon: '$', title: 'No invoices yet',
        body: 'Send your first invoice to a client to start tracking payments.'
      });
      if (panels[1]) clearTbody(panels[1], 4, {
        icon: '↗', title: 'No payouts yet',
        body: 'Creator payouts settle here as deliveries are paid.'
      });
    },

    'content.html': function () {
      const grid = document.querySelector('.lib-grid');
      if (grid) grid.innerHTML = emptyState({
        icon: '▶', title: 'Library empty',
        body: 'Upload your first asset, or invite creators to submit deliverables.',
        cta: '+ Upload'
      });
    },

    'analytics.html': function () {
      clearStats(['$0', '0', '—', '$0']);
      document.querySelectorAll('.panel').forEach(panel => {
        const head = panel.querySelector('.panel-head h3');
        if (!head) return;
        const title = head.textContent.trim();
        if (title === 'Studio Analytics') return;
        const body = panel.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({
          icon: '⌁', title: 'Not enough data yet',
          body: 'Once you book deals and track deliveries, charts populate here automatically.'
        });
      });
    },

    'team.html': function () {
      const info = Workspace.info();
      const tbody = document.querySelector('.os-table tbody');
      if (tbody && info) {
        tbody.innerHTML =
          '<tr>' +
            '<td><div class="who"><div class="os-avatar" style="background:var(--ink);color:#fff;width:30px;height:30px;font-size:0.7rem">' +
              Workspace.initials(info.name) +
            '</div><div class="nm">' + escapeHtml(info.name) +
              '<small>' + escapeHtml(info.email) + '</small></div></div></td>' +
            '<td><span class="tag" style="background:var(--ink); color:#fff; border-color:var(--ink)">Owner</span></td>' +
            '<td>Just now</td>' +
            '<td><span class="pill active">Active</span></td>' +
            '<td><div class="row-actions"><button class="btn btn-ghost btn-sm">Edit</button></div></td>' +
          '</tr>';
      }
      const activity = findPanel('Activity');
      if (activity) {
        const body = activity.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({
          icon: '◉', title: 'No team activity yet',
          body: 'Invite teammates above. Their actions show up here.'
        });
      }
    },

    'settings.html': function () {
      const info = Workspace.info();
      if (!info) return;
      const studio = document.querySelector('#studio');
      if (studio) {
        const t = studio.querySelector('input[type="text"]');
        const e = studio.querySelector('input[type="email"]');
        if (t) t.value = info.studio;
        if (e) e.value = info.email;
      }
      const account = document.querySelector('#account');
      if (account) {
        const t = account.querySelector('input[type="text"]');
        const e = account.querySelector('input[type="email"]');
        if (t) t.value = info.name;
        if (e) e.value = info.email;
      }
    }
  };

  function renderWorkspace() {
    const r = renderers[ROUTE];
    if (r) r();
  }

  // ====================================================================
  //  DOM READY — universal handlers
  // ====================================================================
  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.querySelector('.os-menu-toggle');
    const side   = document.querySelector('.os-side');
    if (toggle && side) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        side.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (side.classList.contains('open') && !side.contains(e.target) && e.target !== toggle) {
          side.classList.remove('open');
        }
      });
    }

    document.querySelectorAll('[data-signout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(ADMIN_KEY);
        window.location.href = 'login.html';
      });
    });

    // Legacy admin banner is now superseded by the demo banner.
    // Wire the exit handler defensively in case any page still surfaces it.
    document.querySelectorAll('[data-exit-admin]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        localStorage.removeItem(ADMIN_KEY);
        localStorage.removeItem(AUTH_KEY);
        window.location.href = 'login.html';
      });
    });

    document.querySelectorAll('[data-filters]').forEach(function (group) {
      const multi = group.dataset.filters === 'multi';
      group.querySelectorAll('.filter-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          if (!multi) group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('on'));
          chip.classList.toggle('on');
        });
      });
    });

    document.querySelectorAll('.inbox-row').forEach(function (row) {
      row.addEventListener('click', function () {
        document.querySelectorAll('.inbox-row').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        row.classList.remove('unread');
      });
    });

    if (!isPublic) {
      injectModeBanner();
      if (Mode.isWorkspace()) renderWorkspace();
    }
  });

  // ====================================================================
  //  LOGIN PAGE
  // ====================================================================
  if (isLogin) {
    document.addEventListener('DOMContentLoaded', function () {
      const form = document.getElementById('login-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const email = form.email.value.trim();
          const pw    = form.password.value;
          const msg   = document.getElementById('login-msg');
          if (!email || !pw) {
            if (msg) { msg.textContent = 'Enter email and password to continue.'; msg.style.color = '#E64A4A'; }
            return;
          }
          // Skeleton: any non-empty creds work. Real sign-in → workspace mode.
          localStorage.setItem(AUTH_KEY, '1');
          localStorage.removeItem(ADMIN_KEY);
          Mode.set(Mode.WORKSPACE);
          if (!Workspace.info()) {
            const handle = email.split('@')[0];
            Workspace.setInfo({
              studio: handle.charAt(0).toUpperCase() + handle.slice(1) + "'s Studio",
              name: handle.charAt(0).toUpperCase() + handle.slice(1),
              email: email,
              plan: 'Studio'
            });
          }
          window.location.href = 'index.html';
        });
      }
      const bypass = document.getElementById('admin-bypass');
      if (bypass) {
        bypass.addEventListener('click', function () {
          // Admin bypass = direct entry to the real workspace (empty, no mock data).
          // The public demo entry is the /demo.html funnel on the marketing site.
          localStorage.setItem(AUTH_KEY, '1');
          localStorage.setItem(ADMIN_KEY, '1');
          Mode.set(Mode.WORKSPACE);
          if (!Workspace.info()) {
            Workspace.setInfo({
              studio: 'Admin Studio',
              name: 'Admin',
              email: 'admin@sociospace.studio',
              plan: 'Admin'
            });
          }
          window.location.href = 'index.html';
        });
      }
    });
  }

  // ====================================================================
  //  SIGNUP PAGE
  // ====================================================================
  if (isSignup) {
    document.addEventListener('DOMContentLoaded', function () {
      const form = document.getElementById('signup-form');
      if (!form) return;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const studio = form.studio.value.trim();
        const name   = form.name.value.trim();
        const email  = form.email.value.trim();
        const pw     = form.password.value;
        const msg    = document.getElementById('signup-msg');
        if (!studio || !name || !email || !pw) {
          if (msg) { msg.textContent = 'Please fill in every field to continue.'; msg.style.color = '#E64A4A'; }
          return;
        }
        if (pw.length < 8) {
          if (msg) { msg.textContent = 'Password must be at least 8 characters.'; msg.style.color = '#E64A4A'; }
          return;
        }
        try {
          localStorage.setItem(PENDING_KEY, JSON.stringify({
            studio: studio, name: name, email: email, at: Date.now()
          }));
        } catch (_) {}
        window.location.href = '../pricing.html?from=signup';
      });
    });
  }
})();
