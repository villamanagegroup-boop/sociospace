/* Socio Space OS — full client app
   Auth: Supabase (real users only). The /demo/ folder is the public read-only
   demo, fully isolated. /os/ is the real workspace and requires a real session.
*/

(function () {
  // ====================================================================
  //  CONFIG
  // ====================================================================
  const SUPABASE_URL      = 'https://bjfvmclkpmqarvnrlttk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZnZtY2xrcG1xYXJ2bnJsdHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODgyOTUsImV4cCI6MjA5Mzg2NDI5NX0.NLYvFG97OZCm8nASXWaywD7uNzSJ_-G7CxVwWKbQsUY';
  const SDK_URL           = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45';

  const AUTH_KEY      = 'os_authed';
  const ADMIN_KEY     = 'os_admin_bypass';
  const MODE_KEY      = 'os_mode';
  const WORKSPACE_KEY = 'os_workspace';
  const PENDING_KEY   = 'os_pending_signup';

  const ROUTE    = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isLogin  = ROUTE === 'login.html'  || ROUTE === 'login';
  const isSignup = ROUTE === 'signup.html' || ROUTE === 'signup';
  const isPublic = isLogin || isSignup;

  const NICHES = ['beauty','fashion','food','fitness','lifestyle','tech','finance','parenting','travel','wellness'];
  const STAGES = [
    { key: 'pitched',      label: 'Pitched' },
    { key: 'negotiating',  label: 'Negotiating' },
    { key: 'signed',       label: 'Signed' },
    { key: 'delivered',    label: 'Delivered' },
    { key: 'paid',         label: 'Paid' }
  ];

  // ====================================================================
  //  MODE + WORKSPACE helpers
  // ====================================================================
  const Mode = {
    DEMO: 'demo', WORKSPACE: 'workspace',
    get(){ return localStorage.getItem(MODE_KEY) || 'demo'; },
    set(m){ localStorage.setItem(MODE_KEY, m); },
    isDemo(){ return this.get() === 'demo'; },
    isWorkspace(){ return this.get() === 'workspace'; }
  };

  const Workspace = {
    info(){ try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null'); } catch(_) { return null; } },
    setInfo(i){ localStorage.setItem(WORKSPACE_KEY, JSON.stringify(i)); },
    clear(){ localStorage.removeItem(WORKSPACE_KEY); },
    initials(name){
      if (!name) return 'ME';
      const p = String(name).trim().split(/\s+/);
      if (p.length === 1) return p[0].slice(0,2).toUpperCase();
      return (p[0][0] + p[p.length-1][0]).toUpperCase();
    }
  };

  if (!isPublic) document.documentElement.style.visibility = 'hidden';

  // ====================================================================
  //  Supabase loader
  // ====================================================================
  function loadSupabase(){
    return new Promise(function(resolve, reject){
      if (window.supabase) return resolve();
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error('SDK load failed')); };
      document.head.appendChild(s);
    });
  }

  // ====================================================================
  //  STATE
  // ====================================================================
  let SB = null;
  let SESSION = null;
  const CTX = {
    mode: Mode.get(),
    info: null,
    isAuthed: false
  };
  window.OSContext = CTX;

  // True when we should hit Supabase for data on this page
  function isLive(){ return CTX.isAuthed && SB && CTX.info && CTX.info.studioId; }

  // ====================================================================
  //  BOOTSTRAP
  // ====================================================================
  async function bootstrap(){
    try {
      await loadSupabase();
      SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      window.SBClient = SB;
    } catch (err) {
      console.warn('[OS] Supabase load failed; localStorage-only mode.', err);
    }

    if (SB) {
      try { const { data } = await SB.auth.getSession(); SESSION = data.session; }
      catch(err){ console.warn('[OS] getSession:', err); }
    }

    CTX.isAuthed = !!SESSION;

    // /os/ is real workspace only. Auth gate = real Supabase session.
    // Demo viewing lives at /demo/ — fully isolated, no shared auth.
    if (!isPublic && !CTX.isAuthed) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(ADMIN_KEY);
      location.replace('login.html');
      return;
    }

    if (CTX.isAuthed && SB) {
      try {
        const { data: studio } = await SB.from('studios').select('id, name, plan').limit(1).maybeSingle();
        if (studio) {
          const u = SESSION.user;
          const meta = u.user_metadata || {};
          const displayName = meta.name || (u.email ? u.email.split('@')[0] : 'You');
          CTX.info = {
            studioId: studio.id,
            studio: studio.name,
            plan: studio.plan,
            name: displayName,
            email: u.email,
            initials: Workspace.initials(displayName)
          };
        }
      } catch(err){ console.warn('[OS] load studio:', err); }
    }

    document.documentElement.style.visibility = 'visible';

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUI);
    } else {
      initUI();
    }
  }

  // ====================================================================
  //  UTILITIES
  // ====================================================================
  function escapeHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtMoneyCents(c){
    const n = (c || 0) / 100;
    return n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : '$' + n.toFixed(0);
  }

  function fmtDateRel(d){
    if (!d) return '';
    const dt = new Date(d);
    const now = Date.now();
    const diff = now - dt.getTime();
    const m = Math.floor(diff/60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm';
    const h = Math.floor(m/60);
    if (h < 24) return h + 'h';
    const d2 = Math.floor(h/24);
    if (d2 === 1) return 'yesterday';
    if (d2 < 7)   return d2 + 'd';
    return dt.toLocaleDateString();
  }

  function pickAv(name){
    const cls = ['','pk','lc','or','yw'];
    let h = 0;
    for (const c of String(name||'')) h = (h * 31 + c.charCodeAt(0)) | 0;
    return cls[Math.abs(h) % cls.length];
  }

  function toast(message, kind){
    const t = document.createElement('div');
    t.className = 'os-toast ' + (kind || '');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 2200);
    setTimeout(function(){ t.remove(); }, 2600);
  }

  // ====================================================================
  //  MODAL
  // ====================================================================
  function openModal(opts){
    return new Promise(function(resolve){
      const wrap = document.createElement('div');
      wrap.className = 'os-modal-backdrop';
      wrap.innerHTML =
        '<form class="os-modal' + (opts.wide ? ' wide' : opts.wider ? ' wider' : '') + '" novalidate>' +
          '<div class="os-modal-head">' +
            '<h3>' + escapeHtml(opts.title) + '</h3>' +
            '<button class="os-modal-close" type="button" aria-label="Close">×</button>' +
          '</div>' +
          '<div class="os-modal-body">' +
            '<div class="os-modal-error"></div>' +
            opts.body +
          '</div>' +
          '<div class="os-modal-foot">' +
            '<button class="btn btn-ghost btn-sm" type="button" data-cancel>Cancel</button>' +
            '<button class="btn btn-primary btn-sm" type="submit">' + (opts.submitLabel || 'Save') + '</button>' +
          '</div>' +
        '</form>';
      document.body.appendChild(wrap);

      const form = wrap.querySelector('form');
      const errEl = wrap.querySelector('.os-modal-error');

      // Init chip groups
      wrap.querySelectorAll('[data-chips]').forEach(function(group){
        const hidden = group.parentNode.querySelector('input[type="hidden"]');
        group.querySelectorAll('.chip').forEach(function(chip){
          chip.addEventListener('click', function(){
            chip.classList.toggle('on');
            if (hidden) {
              const on = Array.prototype.map.call(group.querySelectorAll('.chip.on'), c => c.dataset.value);
              hidden.value = on.join(',');
            }
          });
        });
      });

      function close(val){
        wrap.remove();
        document.removeEventListener('keydown', esc);
        resolve(val);
      }
      function esc(e){ if (e.key === 'Escape') close(null); }
      document.addEventListener('keydown', esc);

      wrap.querySelector('.os-modal-close').addEventListener('click', function(){ close(null); });
      wrap.querySelector('[data-cancel]').addEventListener('click', function(){ close(null); });
      wrap.addEventListener('click', function(e){ if (e.target === wrap) close(null); });

      form.addEventListener('submit', async function(e){
        e.preventDefault();
        const data = {};
        new FormData(form).forEach(function(v, k){ data[k] = v; });
        if (opts.onSubmit) {
          const submitBtn = form.querySelector('[type="submit"]');
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving…';
          try {
            const result = await opts.onSubmit(data);
            close(result == null ? data : result);
          } catch (err) {
            errEl.textContent = (err && err.message) || 'Something went wrong.';
            errEl.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.textContent = opts.submitLabel || 'Save';
          }
        } else {
          close(data);
        }
      });

      // Optional post-mount hook (lets callers wire inline buttons in the body)
      if (opts.onMount) {
        opts.onMount(wrap, close);
      }

      // Focus first input
      setTimeout(function(){
        const first = form.querySelector('input, textarea, select');
        if (first) first.focus();
      }, 50);
    });
  }

  // Form helpers
  function fField(label, name, opts){
    opts = opts || {};
    const type = opts.type || 'text';
    const required = opts.required ? 'required' : '';
    const placeholder = opts.placeholder ? 'placeholder="' + escapeHtml(opts.placeholder) + '"' : '';
    const value = opts.value != null ? 'value="' + escapeHtml(opts.value) + '"' : '';
    return '<div class="field"><label for="f-' + name + '">' + escapeHtml(label) +
      (opts.required ? ' <span style="color:var(--error)">*</span>' : '') + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + type + '" ' +
        placeholder + ' ' + value + ' ' + required + '>' +
      (opts.hint ? '<div class="hint">' + escapeHtml(opts.hint) + '</div>' : '') +
      '</div>';
  }
  function fTextarea(label, name, opts){
    opts = opts || {};
    return '<div class="field"><label for="f-' + name + '">' + escapeHtml(label) + '</label>' +
      '<textarea id="f-' + name + '" name="' + name + '" rows="' + (opts.rows || 3) + '" ' +
      'placeholder="' + escapeHtml(opts.placeholder || '') + '">' + escapeHtml(opts.value || '') + '</textarea>' +
      '</div>';
  }
  function fSelect(label, name, options, opts){
    opts = opts || {};
    const html = options.map(function(o){
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      const sel = (opts.value === v) ? ' selected' : '';
      return '<option value="' + escapeHtml(v) + '"' + sel + '>' + escapeHtml(l) + '</option>';
    }).join('');
    return '<div class="field"><label for="f-' + name + '">' + escapeHtml(label) + '</label>' +
      '<select id="f-' + name + '" name="' + name + '">' + html + '</select></div>';
  }
  function fChips(label, name, options, opts){
    opts = opts || {};
    const selected = (opts.value || []).map(String);
    const chips = options.map(function(v){
      const on = selected.indexOf(v) >= 0 ? ' on' : '';
      return '<span class="chip' + on + '" data-value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</span>';
    }).join('');
    return '<div class="field"><label>' + escapeHtml(label) + '</label>' +
      '<div class="os-chips" data-chips>' + chips + '</div>' +
      '<input type="hidden" name="' + name + '" value="' + selected.join(',') + '">' +
      '</div>';
  }

  // ====================================================================
  //  DATA LAYER
  // ====================================================================
  function studioId(){ return CTX.info && CTX.info.studioId; }

  const Data = {
    // ----- Creators -----
    listCreators(){
      return SB.from('admin_creators').select('*').eq('studio_id', studioId()).order('created_at', { ascending: false });
    },
    addCreator(p){
      return SB.from('admin_creators').insert(Object.assign({ studio_id: studioId() }, p)).select().single();
    },
    updateCreator(id, p){
      return SB.from('admin_creators').update(p).eq('id', id).select().single();
    },
    deleteCreator(id){
      return SB.from('admin_creators').delete().eq('id', id);
    },

    // ----- Clients -----
    listClients(){
      return SB.from('clients').select('*').eq('studio_id', studioId()).order('created_at', { ascending: false });
    },
    addClient(p){
      return SB.from('clients').insert(Object.assign({ studio_id: studioId() }, p)).select().single();
    },
    updateClient(id, p){
      return SB.from('clients').update(p).eq('id', id).select().single();
    },

    // ----- Deals -----
    listDeals(){
      return SB.from('admin_deals')
        .select('*, creator:admin_creators(id,name), client:clients(id,name)')
        .eq('studio_id', studioId())
        .order('created_at', { ascending: false });
    },
    addDeal(p){
      return SB.from('admin_deals').insert(Object.assign({ studio_id: studioId() }, p)).select().single();
    },
    updateDeal(id, p){
      return SB.from('admin_deals').update(p).eq('id', id);
    },
    moveDeal(id, stage){
      return SB.from('admin_deals').update({ stage: stage }).eq('id', id);
    },

    // ----- Inquiries -----
    // No explicit studio_id filter — RLS already scopes to "studio_id is null OR member's studio".
    // Routing public form submissions to a specific studio comes later (multi-tenant routing).
    listInquiries(){
      return SB.from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
    },
    countUnreadInquiries(){
      return SB.from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new');
    },
    updateInquiry(id, p){
      return SB.from('inquiries').update(p).eq('id', id);
    },

    // ----- Applications -----
    listApplications(){
      return SB.from('admin_applications')
        .select('*')
        .order('created_at', { ascending: false });
    },
    countOpenApplications(){
      return SB.from('admin_applications')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'review']);
    },
    async approveApplication(app){
      // Create creator from application
      const ins = await SB.from('admin_creators').insert({
        studio_id: studioId(),
        name: app.name,
        handle: app.handle,
        email: app.email,
        city: app.city,
        niches: app.niches || [],
        followers: app.followers || 0,
        engagement_rate: app.engagement_rate || 0,
        status: 'onboarding',
        bio: app.pitch
      });
      if (ins.error) throw ins.error;
      const upd = await SB.from('admin_applications')
        .update({ status: 'approved', reviewer_id: SESSION.user.id, studio_id: studioId() })
        .eq('id', app.id);
      if (upd.error) throw upd.error;
    },
    declineApplication(id){
      return SB.from('admin_applications')
        .update({ status: 'declined', reviewer_id: SESSION.user.id, studio_id: studioId() })
        .eq('id', id);
    },

    // ----- Bookings -----
    listBookings(){
      return SB.from('bookings')
        .select('*, creator:admin_creators(id,name), client:clients(id,name)')
        .eq('studio_id', studioId())
        .order('starts_at', { ascending: true });
    },
    addBooking(p){
      return SB.from('bookings').insert(Object.assign({ studio_id: studioId() }, p)).select().single();
    },

    // ----- Invoices -----
    listInvoices(){
      return SB.from('admin_invoices')
        .select('*, client:clients(id,name)')
        .eq('studio_id', studioId())
        .order('created_at', { ascending: false });
    },
    addInvoice(p){
      return SB.from('admin_invoices').insert(Object.assign({ studio_id: studioId() }, p)).select().single();
    },
    updateInvoice(id, p){
      return SB.from('admin_invoices').update(p).eq('id', id);
    },

    // ----- Payouts -----
    listPayouts(){
      return SB.from('payouts')
        .select('*, creator:admin_creators(id,name), deal:admin_deals(id,title)')
        .eq('studio_id', studioId())
        .order('created_at', { ascending: false });
    },
    addPayout(p){
      return SB.from('payouts').insert(Object.assign({ studio_id: studioId() }, p)).select().single();
    },
    updatePayout(id, p){
      return SB.from('payouts').update(p).eq('id', id);
    },

    // ----- Activity -----
    listActivity(limit){
      return SB.from('activity').select('*').eq('studio_id', studioId())
        .order('created_at', { ascending: false }).limit(limit || 20);
    },
    logActivity(type, body, meta){
      return SB.from('activity').insert({
        studio_id: studioId(),
        actor_id: SESSION ? SESSION.user.id : null,
        type: type, body: body, meta: meta || {}
      });
    },

    // ----- Studio settings -----
    updateStudio(p){
      return SB.from('studios').update(p).eq('id', studioId());
    },

    // ----- Dashboard aggregates -----
    async dashboardStats(){
      const sId = studioId();
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [active, apps, paid, unread] = await Promise.all([
        SB.from('admin_deals').select('id', { count: 'exact', head: true }).eq('studio_id', sId).neq('stage', 'paid'),
        SB.from('admin_applications').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        SB.from('admin_invoices').select('amount_cents').eq('studio_id', sId).eq('status','paid')
          .gte('paid_at', monthStart.toISOString()),
        SB.from('inquiries').select('id', { count: 'exact', head: true }).eq('status','new')
      ]);
      const revenue = (paid.data || []).reduce(function(s, i){ return s + (i.amount_cents || 0); }, 0);
      return {
        activeCampaigns:    active.count || 0,
        pendingApplications: apps.count || 0,
        mtdRevenue:         revenue,
        unreadInquiries:    unread.count || 0
      };
    }
  };

  // ====================================================================
  //  RENDERERS  (one per page)
  // ====================================================================

  function emptyState(opts){
    return '<div class="os-workspace-empty">' +
      '<div class="icon">' + (opts.icon || '◇') + '</div>' +
      '<h4>' + escapeHtml(opts.title) + '</h4>' +
      '<p>' + escapeHtml(opts.body) + '</p>' +
      (opts.cta ? '<button class="btn btn-pink" type="button" data-action="' + escapeHtml(opts.action || '') + '">' + escapeHtml(opts.cta) + '</button>' : '') +
      '</div>';
  }

  function clearStats(zeros){
    document.querySelectorAll('.os-stats .stat-tile').forEach(function(tile, i){
      const num = tile.querySelector('.num'); if (num) num.textContent = zeros[i] != null ? zeros[i] : '0';
      const delta = tile.querySelector('.delta'); if (delta) delta.innerHTML = '<span style="color:var(--ink-4)">—</span>';
    });
  }

  function findPanel(headTitle){
    const heads = document.querySelectorAll('.panel-head h3');
    for (let i = 0; i < heads.length; i++) {
      if (heads[i].textContent.trim().toLowerCase() === headTitle.toLowerCase()) {
        return heads[i].closest('.panel');
      }
    }
    return null;
  }

  // Personalize the workspace shell from CTX.info. Demo banners are gone — /os/ is workspace-only now.
  function injectModeBanner(){
    const main = document.querySelector('.os-main');
    if (!main) return;
    const top = main.querySelector('.os-top');
    if (!top) return;

    const info = CTX.info;
    if (info) {
      const brand = document.querySelector('.os-side-head .brand');
      if (brand) brand.innerHTML = escapeHtml(info.studio) + '<small>' + escapeHtml(info.plan || 'Studio') + ' plan</small>';
      const foot = document.querySelector('.os-side-foot');
      if (foot) {
        const av = foot.querySelector('.os-avatar');
        const who = foot.querySelector('.who');
        if (av) av.textContent = info.initials;
        if (who) who.innerHTML = escapeHtml(info.name) + '<small>' + escapeHtml(info.email || '') + '</small>';
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

  // ----- Sidebar badges (Inbox + Applications counts) -----
  async function updateSidebarBadges(){
    const inboxBadge = document.querySelector('.os-nav a[href="inbox.html"] .badge');
    const appsBadge  = document.querySelector('.os-nav a[href="applications.html"] .badge');

    // Default to hidden 0, then fetch real counts if we have a live session.
    if (inboxBadge) { inboxBadge.textContent = '0'; inboxBadge.style.display = 'none'; }
    if (appsBadge)  { appsBadge.textContent  = '0'; appsBadge.style.display  = 'none'; }

    if (!isLive()) return;  // Admin bypass / no Supabase auth — leave as 0/hidden.

    try {
      const [inboxRes, appsRes] = await Promise.all([
        Data.countUnreadInquiries(),
        Data.countOpenApplications()
      ]);
      const inboxCount = inboxRes.count || 0;
      const appsCount  = appsRes.count  || 0;
      if (inboxBadge) {
        inboxBadge.textContent  = inboxCount;
        inboxBadge.style.display = inboxCount > 0 ? '' : 'none';
      }
      if (appsBadge) {
        appsBadge.textContent  = appsCount;
        appsBadge.style.display = appsCount > 0 ? '' : 'none';
      }
    } catch (err) {
      console.warn('[OS] Sidebar badges fetch failed:', err);
    }
  }

  // ----- Dashboard -----
  async function renderDashboard(){
    const head = document.querySelector('.os-page-head h2');
    const sub  = document.querySelector('.os-page-head p');
    if (head && CTX.info) head.textContent = 'Welcome, ' + CTX.info.name.split(/\s+/)[0] + '.';
    if (sub) sub.textContent = "Here's what's moving in the studio.";

    if (!isLive()) {
      // Admin bypass — just empty states
      clearStats(['0','0','$0','0']);
      const grid2 = document.querySelectorAll('.os-grid.cols-2 .panel');
      if (grid2[0]) {
        const tbody = grid2[0].querySelector('tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="padding:0;border:none;">' +
          emptyState({ icon:'◎', title:'No deals in flight', body:'Pitch a creator to a brand to start tracking your pipeline.' }) + '</td></tr>';
      }
      ['Activity','New Applications','Inbox · Recent',"This Week's Bookings"].forEach(function(t){
        const p = findPanel(t); if (p) { const b = p.querySelector('.panel-body'); if (b) b.innerHTML = emptyState({ title: 'No data yet', body: 'Sign in with your real account to see your studio here.' }); }
      });
      return;
    }

    // Real data
    try {
      const [stats, deals, activity, apps, inboxes, bookings] = await Promise.all([
        Data.dashboardStats(),
        Data.listDeals(),
        Data.listActivity(8),
        Data.listApplications(),
        Data.listInquiries(),
        Data.listBookings()
      ]);

      // Stats
      const tiles = document.querySelectorAll('.os-stats .stat-tile');
      if (tiles[0]) {
        tiles[0].querySelector('.num').textContent = stats.activeCampaigns;
        tiles[0].querySelector('.delta').innerHTML = '<span style="color:var(--ink-4)">Open deals</span>';
      }
      if (tiles[1]) {
        tiles[1].querySelector('.num').textContent = stats.pendingApplications;
        tiles[1].querySelector('.delta').innerHTML = stats.pendingApplications > 0 ? 'Awaiting review' : 'All caught up';
      }
      if (tiles[2]) {
        tiles[2].querySelector('.num').textContent = fmtMoneyCents(stats.mtdRevenue);
        tiles[2].querySelector('.delta').innerHTML = '<span style="color:var(--ink-4)">Paid this month</span>';
      }
      if (tiles[3]) {
        tiles[3].querySelector('.num').textContent = stats.unreadInquiries;
        tiles[3].querySelector('.delta').innerHTML = stats.unreadInquiries > 0 ? 'New messages' : 'Inbox at zero';
      }

      // Pipeline panel
      const panels = document.querySelectorAll('.os-grid.cols-2 .panel');
      if (panels[0]) {
        const tbody = panels[0].querySelector('tbody');
        if (tbody) {
          const rows = (deals.data || []).slice(0, 5);
          if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding:0;border:none;">' +
              emptyState({ icon:'◎', title:'No deals yet', body:'Add your first deal to populate the pipeline.', cta:'+ New deal', action:'add-deal' }) +
              '</td></tr>';
          } else {
            tbody.innerHTML = rows.map(function(d){
              return '<tr>' +
                '<td><strong>' + escapeHtml(d.client ? d.client.name : '—') + '</strong>' +
                  '<br><small style="color:var(--ink-4)">' + escapeHtml(d.title) + '</small></td>' +
                '<td><div class="who"><div class="av ' + pickAv(d.creator ? d.creator.name : '') + '">' +
                  Workspace.initials(d.creator ? d.creator.name : '?') + '</div>' +
                  '<div class="nm">' + escapeHtml(d.creator ? d.creator.name : 'Unassigned') + '</div></div></td>' +
                '<td><span class="pill ' + d.stage + '">' + STAGES.find(function(s){return s.key===d.stage;}).label + '</span></td>' +
                '<td style="text-align:right"><strong>' + fmtMoneyCents(d.value_cents) + '</strong></td>' +
              '</tr>';
            }).join('');
          }
        }
      }

      // Activity panel
      const actPanel = findPanel('Activity');
      if (actPanel) {
        const body = actPanel.querySelector('.panel-body');
        if (body) {
          const items = activity.data || [];
          if (items.length === 0) {
            body.innerHTML = emptyState({ icon:'✦', title:'Nothing yet', body:'Inquiries, applications, signed contracts, and payouts will appear here in real time.' });
          } else {
            body.innerHTML = items.map(function(a){
              return '<div class="feed-item"><span class="dot"></span>' +
                '<div class="body">' + escapeHtml(a.body || a.type) + '</div>' +
                '<span class="when">' + fmtDateRel(a.created_at) + '</span></div>';
            }).join('');
          }
        }
      }

      // New Applications
      const appsPanel = findPanel('New Applications');
      if (appsPanel) {
        const body = appsPanel.querySelector('.panel-body');
        if (body) {
          const items = (apps.data || []).filter(function(a){ return a.status === 'new' || a.status === 'review'; }).slice(0, 4);
          if (items.length === 0) {
            body.innerHTML = emptyState({ icon:'⌗', title:'No new applications', body:'Share your /apply link to receive submissions.' });
          } else {
            body.innerHTML = items.map(function(a){
              return '<div class="feed-item"><div class="body"><strong>' + escapeHtml(a.name) + '</strong>' +
                (a.followers ? ' · ' + a.followers : '') +
                ' · ' + escapeHtml((a.niches || [])[0] || '—') +
                '<br><small style="color:var(--ink-4)">' + fmtDateRel(a.created_at) + '</small></div>' +
                '<span class="when"><span class="pill ' + (a.status === 'review' ? 'review' : 'new') + '">' +
                (a.status === 'review' ? 'Review' : 'New') + '</span></span></div>';
            }).join('');
          }
        }
      }

      // Inbox
      const inboxPanel = findPanel('Inbox · Recent');
      if (inboxPanel) {
        const body = inboxPanel.querySelector('.panel-body');
        if (body) {
          const items = (inboxes.data || []).slice(0, 4);
          if (items.length === 0) {
            body.innerHTML = emptyState({ icon:'✉', title:'Inbox empty', body:'Submissions from your contact form land here.' });
          } else {
            body.innerHTML = items.map(function(i){
              return '<div class="feed-item ' + (i.status === 'new' ? 'pink' : '') + '"><span class="dot"></span>' +
                '<div class="body"><strong>' + escapeHtml(i.from_name || i.from_email || 'Anon') + '</strong>' +
                ' — ' + escapeHtml(i.topic) + '<br>' +
                '<small style="color:var(--ink-4)">"' + escapeHtml((i.message || '').slice(0, 60)) + '..."</small></div>' +
                '<span class="when">' + fmtDateRel(i.created_at) + '</span></div>';
            }).join('');
          }
        }
      }

      // Bookings
      const bkPanel = findPanel("This Week's Bookings");
      if (bkPanel) {
        const body = bkPanel.querySelector('.panel-body');
        if (body) {
          const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
          const items = (bookings.data || []).filter(function(b){
            if (!b.starts_at) return false;
            const t = new Date(b.starts_at);
            return t >= new Date() && t <= weekEnd;
          }).slice(0, 4);
          if (items.length === 0) {
            body.innerHTML = emptyState({ icon:'◷', title:'Nothing booked', body:'TikTok Lives, shoot days, and deadlines show up here.' });
          } else {
            body.innerHTML = items.map(function(b){
              const dt = new Date(b.starts_at);
              return '<div class="feed-item"><div class="body"><strong>' +
                dt.toLocaleDateString(undefined, { weekday: 'short' }) + ' · ' +
                dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + '</strong>' +
                '<br><small style="color:var(--ink-4)">' + escapeHtml(b.title) + '</small></div>' +
                '<span class="when"><span class="pill ' + (b.status === 'pending' ? 'pending' : 'active') + '">' +
                (b.status === 'pending' ? 'Pending' : 'Confirmed') + '</span></span></div>';
            }).join('');
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard] render failed:', err);
      toast('Could not load dashboard: ' + err.message, 'error');
    }
  }

  // ----- Creators -----
  async function renderCreators(){
    const grid = document.querySelector('.creator-grid');
    if (!grid) return;

    if (!isLive()) {
      grid.innerHTML = emptyState({ icon:'★', title:'Roster is empty', body:'Sign in to your real workspace to manage creators.', cta:'+ Add creator', action:'add-creator' });
      wireAddCreator();
      return;
    }

    const { data, error } = await Data.listCreators();
    if (error) { grid.innerHTML = emptyState({ title:'Could not load', body: error.message }); return; }

    const items = data || [];
    if (items.length === 0) {
      grid.innerHTML = emptyState({ icon:'★', title:'Roster is empty', body:'Add your first creator to build your bookable lineup.', cta:'+ Add creator', action:'add-creator' });
    } else {
      grid.innerHTML = items.map(function(c){
        const initials = Workspace.initials(c.name);
        const niches = (c.niches || []).slice(0,2).map(function(n){ return '<span class="tag ' + n + '">' + escapeHtml(n) + '</span>'; }).join('');
        return '<div class="creator-tile" data-id="' + c.id + '">' +
          '<div class="head"><div class="av">' + initials + '</div>' +
            '<div><h4>' + escapeHtml(c.name) + '<small>' + escapeHtml(c.handle || '') + (c.city ? ' · ' + escapeHtml(c.city) : '') + '</small></h4></div>' +
            '<span class="pill ' + (c.status === 'active' ? 'active' : c.status === 'onboarding' ? 'pending' : 'closed') + '" style="margin-left:auto">' +
            (c.status === 'active' ? 'Active' : c.status === 'onboarding' ? 'Onboarding' : c.status) + '</span></div>' +
          '<div>' + (niches || '<span style="color:var(--ink-4); font-size:0.8rem">No niches set</span>') + '</div>' +
          '<div class="stats">' +
            '<div><div class="v">' + (c.followers ? (c.followers >= 1000 ? (c.followers/1000).toFixed(0) + 'k' : c.followers) : '—') + '</div><div class="l">Followers</div></div>' +
            '<div><div class="v">' + (c.engagement_rate ? c.engagement_rate + '%' : '—') + '</div><div class="l">Engage</div></div>' +
            '<div><div class="v">' + (c.avg_deal_cents ? fmtMoneyCents(c.avg_deal_cents) : '—') + '</div><div class="l">Avg deal</div></div>' +
          '</div>' +
          '<div class="actions">' +
            '<button class="btn btn-ghost btn-sm" data-creator-edit="' + c.id + '">Edit</button>' +
            '<button class="btn btn-primary btn-sm" data-creator-book="' + c.id + '">Book</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    wireAddCreator();
    grid.querySelectorAll('[data-creator-edit]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const id = btn.dataset.creatorEdit;
        const creator = items.find(function(c){ return c.id === id; });
        if (creator) editCreator(creator);
      });
    });
  }

  function wireAddCreator(){ /* handled by global click delegation in initUI */ }

  async function addCreator(){
    if (!isLive()) { toast('Sign in with your real account to add creators.', 'error'); return; }
    const result = await openModal({
      title: 'Add Creator',
      submitLabel: 'Add to roster',
      body:
        fField('Name', 'name', { required: true, placeholder: 'Maya Rivera' }) +
        '<div class="os-form-row">' +
          fField('Handle', 'handle', { placeholder: '@mayarcreates' }) +
          fField('City', 'city', { placeholder: 'Brooklyn, NY' }) +
        '</div>' +
        fField('Email', 'email', { type: 'email', placeholder: 'maya@email.com' }) +
        fChips('Niches', 'niches', NICHES) +
        '<div class="os-form-row">' +
          fField('Followers', 'followers', { type: 'number', placeholder: '120000' }) +
          fField('Engagement %', 'engagement_rate', { type: 'number', placeholder: '5.4', hint: 'e.g. 5.4 for 5.4%' }) +
        '</div>' +
        fField('Avg deal value ($)', 'avg_deal', { type: 'number', placeholder: '1500' }) +
        fSelect('Status', 'status', [
          { value: 'active', label: 'Active' },
          { value: 'onboarding', label: 'Onboarding' },
          { value: 'hold', label: 'Hold' }
        ], { value: 'active' }) +
        fTextarea('Bio / notes', 'bio', { rows: 2, placeholder: 'Short summary, specialty, anything to remember.' }),
      onSubmit: async function(d){
        const payload = {
          name: d.name,
          handle: d.handle || null,
          city: d.city || null,
          email: d.email || null,
          niches: d.niches ? d.niches.split(',').filter(Boolean) : [],
          followers: parseInt(d.followers, 10) || 0,
          engagement_rate: parseFloat(d.engagement_rate) || 0,
          avg_deal_cents: Math.round((parseFloat(d.avg_deal) || 0) * 100),
          status: d.status || 'active',
          bio: d.bio || null
        };
        const res = await Data.addCreator(payload);
        if (res.error) throw res.error;
        Data.logActivity('creator.added', 'Creator added: ' + payload.name);
      }
    });
    if (result) { toast('Creator added.', 'success'); renderCreators(); }
  }

  async function editCreator(creator){
    const result = await openModal({
      title: 'Edit Creator',
      submitLabel: 'Save changes',
      body:
        fField('Name', 'name', { required: true, value: creator.name }) +
        '<div class="os-form-row">' +
          fField('Handle', 'handle', { value: creator.handle || '' }) +
          fField('City', 'city', { value: creator.city || '' }) +
        '</div>' +
        fField('Email', 'email', { type: 'email', value: creator.email || '' }) +
        fChips('Niches', 'niches', NICHES, { value: creator.niches || [] }) +
        '<div class="os-form-row">' +
          fField('Followers', 'followers', { type: 'number', value: creator.followers || 0 }) +
          fField('Engagement %', 'engagement_rate', { type: 'number', value: creator.engagement_rate || 0 }) +
        '</div>' +
        fField('Avg deal value ($)', 'avg_deal', { type: 'number', value: ((creator.avg_deal_cents || 0)/100).toFixed(0) }) +
        fSelect('Status', 'status',
          ['active','onboarding','hold','archived'].map(function(s){ return { value: s, label: s.charAt(0).toUpperCase()+s.slice(1) }; }),
          { value: creator.status }
        ) +
        fTextarea('Bio / notes', 'bio', { rows: 2, value: creator.bio || '' }),
      onSubmit: async function(d){
        const payload = {
          name: d.name,
          handle: d.handle || null,
          city: d.city || null,
          email: d.email || null,
          niches: d.niches ? d.niches.split(',').filter(Boolean) : [],
          followers: parseInt(d.followers, 10) || 0,
          engagement_rate: parseFloat(d.engagement_rate) || 0,
          avg_deal_cents: Math.round((parseFloat(d.avg_deal) || 0) * 100),
          status: d.status || 'active',
          bio: d.bio || null
        };
        const res = await Data.updateCreator(creator.id, payload);
        if (res.error) throw res.error;
      }
    });
    if (result) { toast('Creator updated.', 'success'); renderCreators(); }
  }

  // ----- Clients -----
  async function renderClients(){
    if (!isLive()) {
      clearStats(['0','$0','0','0']);
      const panel = document.querySelector('.os-body .panel');
      if (panel) {
        const tb = panel.querySelector('tbody');
        if (tb) tb.innerHTML = '<tr><td colspan="7" style="padding:0;border:none;">' +
          emptyState({ icon:'▣', title:'No clients yet', body:'Sign in to your real workspace to manage clients.', cta:'+ Add client', action:'add-client' }) + '</td></tr>';
      }
      wireAddClient();
      return;
    }

    const { data, error } = await Data.listClients();
    if (error) { toast('Load failed: ' + error.message, 'error'); return; }

    const items = data || [];
    const total = items.length;
    const newThisMonth = items.filter(function(c){
      const cd = new Date(c.created_at);
      const now = new Date();
      return cd.getMonth() === now.getMonth() && cd.getFullYear() === now.getFullYear();
    }).length;
    const lifetime = items.reduce(function(s, c){ return s + (c.lifetime_spend_cents || 0); }, 0);
    const atRisk = items.filter(function(c){ return c.status === 'at_risk'; }).length;
    clearStats([String(total), fmtMoneyCents(lifetime), String(newThisMonth), String(atRisk)]);

    const panel = document.querySelector('.os-body .panel');
    if (!panel) return;
    const tbody = panel.querySelector('tbody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:0;border:none;">' +
        emptyState({ icon:'▣', title:'No clients yet', body:'Add your first client to start tracking deals.', cta:'+ Add client', action:'add-client' }) + '</td></tr>';
    } else {
      tbody.innerHTML = items.map(function(c){
        return '<tr data-id="' + c.id + '">' +
          '<td><strong>' + escapeHtml(c.name) + '</strong>' +
            (c.industry ? '<br><small style="color:var(--ink-4)">' + escapeHtml(c.industry) + '</small>' : '') + '</td>' +
          '<td>' + escapeHtml(c.primary_contact_name || '—') +
            (c.primary_contact_email ? '<br><small style="color:var(--ink-4)">' + escapeHtml(c.primary_contact_email) + '</small>' : '') + '</td>' +
          '<td>—</td>' +
          '<td>' + fmtDateRel(c.created_at) + '</td>' +
          '<td><strong>' + fmtMoneyCents(c.lifetime_spend_cents) + '</strong></td>' +
          '<td><span class="pill ' + (c.status === 'active' ? 'active' : c.status === 'new' ? 'new' : c.status === 'at_risk' ? 'pending' : 'closed') + '">' +
            (c.status === 'at_risk' ? 'At risk' : c.status.charAt(0).toUpperCase() + c.status.slice(1)) + '</span></td>' +
          '<td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-client-edit="' + c.id + '">Edit</button></div></td>' +
        '</tr>';
      }).join('');
    }

    wireAddClient();
    tbody.querySelectorAll('[data-client-edit]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const id = btn.dataset.clientEdit;
        const client = items.find(function(c){ return c.id === id; });
        if (client) editClient(client);
      });
    });
  }

  function wireAddClient(){ /* handled by global click delegation in initUI */ }

  async function addClient(){
    if (!isLive()) { toast('Sign in with your real account to add clients.', 'error'); return; }
    const result = await openModal({
      title: 'Add Client',
      submitLabel: 'Add client',
      body:
        fField('Company name', 'name', { required: true, placeholder: 'Bloom & Co.' }) +
        fField('Industry', 'industry', { placeholder: 'Beauty · DTC' }) +
        fField('Website', 'website', { placeholder: 'https://...' }) +
        fField('Primary contact name', 'primary_contact_name', { placeholder: 'Jess B.' }) +
        fField('Primary contact email', 'primary_contact_email', { type: 'email', placeholder: 'jess@bloomco.com' }) +
        fSelect('Status', 'status', [
          { value: 'new', label: 'New' },
          { value: 'active', label: 'Active' },
          { value: 'at_risk', label: 'At risk' },
          { value: 'churned', label: 'Churned' }
        ], { value: 'new' }) +
        fTextarea('Notes', 'notes', { rows: 2 }),
      onSubmit: async function(d){
        const res = await Data.addClient({
          name: d.name,
          industry: d.industry || null,
          website: d.website || null,
          primary_contact_name: d.primary_contact_name || null,
          primary_contact_email: d.primary_contact_email || null,
          status: d.status || 'new',
          notes: d.notes || null
        });
        if (res.error) throw res.error;
        Data.logActivity('client.added', 'Client added: ' + d.name);
      }
    });
    if (result) { toast('Client added.', 'success'); renderClients(); }
  }

  async function editClient(client){
    const result = await openModal({
      title: 'Edit Client',
      submitLabel: 'Save',
      body:
        fField('Company name', 'name', { required: true, value: client.name }) +
        fField('Industry', 'industry', { value: client.industry || '' }) +
        fField('Website', 'website', { value: client.website || '' }) +
        fField('Primary contact name', 'primary_contact_name', { value: client.primary_contact_name || '' }) +
        fField('Primary contact email', 'primary_contact_email', { type: 'email', value: client.primary_contact_email || '' }) +
        fSelect('Status', 'status', ['new','active','at_risk','churned'].map(function(s){
          return { value: s, label: s === 'at_risk' ? 'At risk' : s.charAt(0).toUpperCase()+s.slice(1) };
        }), { value: client.status }) +
        fTextarea('Notes', 'notes', { rows: 2, value: client.notes || '' }),
      onSubmit: async function(d){
        const res = await Data.updateClient(client.id, {
          name: d.name,
          industry: d.industry || null,
          website: d.website || null,
          primary_contact_name: d.primary_contact_name || null,
          primary_contact_email: d.primary_contact_email || null,
          status: d.status,
          notes: d.notes || null
        });
        if (res.error) throw res.error;
      }
    });
    if (result) { toast('Client updated.', 'success'); renderClients(); }
  }

  // ----- Campaigns / Deals (kanban) -----
  async function renderCampaigns(){
    const cols = document.querySelectorAll('.kan-col');
    if (cols.length === 0) return;

    if (!isLive()) {
      cols.forEach(function(col){
        const cnt = col.querySelector('.kan-col-head .count'); if (cnt) cnt.textContent = '0';
        col.querySelectorAll('.kan-card').forEach(function(c){ c.remove(); });
      });
      const first = document.querySelector('.kan-col');
      if (first && !first.querySelector('.empty-msg')) {
        const empty = document.createElement('div');
        empty.className = 'empty-msg';
        empty.style.cssText = 'padding:30px 8px;text-align:center;color:var(--ink-4);font-size:0.78rem;border:1px dashed var(--line-3);border-radius:var(--radius-sm);margin-top:6px;';
        empty.innerHTML = 'Sign in to your real workspace.';
        first.appendChild(empty);
      }
      wireAddDeal();
      return;
    }

    const { data, error } = await Data.listDeals();
    if (error) { toast('Load failed: ' + error.message, 'error'); return; }
    const deals = data || [];

    // Tag columns with stage
    const stageNames = ['Pitched','Negotiating','Signed','Delivered','Paid'];
    cols.forEach(function(col, i){
      const stageKey = STAGES[i] && STAGES[i].key;
      if (stageKey) col.dataset.stage = stageKey;
      const cnt = col.querySelector('.kan-col-head .count');
      const inStage = deals.filter(function(d){ return d.stage === stageKey; });
      if (cnt) cnt.textContent = inStage.length;
      col.querySelectorAll('.kan-card, .empty-msg').forEach(function(c){ c.remove(); });
      if (inStage.length === 0 && i === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-msg';
        empty.style.cssText = 'padding:24px 8px;text-align:center;color:var(--ink-4);font-size:0.78rem;border:1px dashed var(--line-3);border-radius:var(--radius-sm);margin-top:6px;';
        empty.innerHTML = 'No deals yet.<br>Click + above to add.';
        col.appendChild(empty);
      }
      inStage.forEach(function(d){
        const card = document.createElement('div');
        card.className = 'kan-card';
        card.dataset.id = d.id;
        card.draggable = true;
        const niche = ((d.creator && d.creator.niches) || [])[0] || 'lifestyle';
        card.innerHTML =
          '<div class="b">' + escapeHtml((d.client ? d.client.name : 'Client') + ' × ' + (d.creator ? d.creator.name : 'Creator')) + '</div>' +
          '<span class="tag ' + niche + '">' + escapeHtml(d.title) + '</span>' +
          '<div class="meta"><span>' + fmtDateRel(d.created_at) + '</span><span class="amt">' + fmtMoneyCents(d.value_cents) + '</span></div>';
        col.appendChild(card);
      });
    });

    wireKanbanDrag();
    wireAddDeal();
  }

  function wireAddDeal(){ /* handled by global click delegation in initUI */ }

  function wireKanbanDrag(){
    document.querySelectorAll('.kan-card[draggable="true"]').forEach(function(card){
      card.addEventListener('dragstart', function(e){
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', function(){ card.classList.remove('dragging'); });
    });
    document.querySelectorAll('.kan-col').forEach(function(col){
      col.addEventListener('dragover', function(e){ e.preventDefault(); col.classList.add('drop-over'); });
      col.addEventListener('dragleave', function(){ col.classList.remove('drop-over'); });
      col.addEventListener('drop', async function(e){
        e.preventDefault();
        col.classList.remove('drop-over');
        const id = e.dataTransfer.getData('text/plain');
        const stage = col.dataset.stage;
        if (!id || !stage) return;
        const res = await Data.moveDeal(id, stage);
        if (res.error) toast('Move failed: ' + res.error.message, 'error');
        else { Data.logActivity('deal.moved', 'Deal moved to ' + stage); renderCampaigns(); }
      });
    });
  }

  async function addDeal(){
    if (!isLive()) { toast('Sign in to your real workspace to add deals.', 'error'); return; }
    // Pre-load creators + clients
    const [crRes, clRes] = await Promise.all([Data.listCreators(), Data.listClients()]);
    const creators = (crRes.data || []).filter(function(c){ return c.status !== 'archived'; });
    const clients  = (clRes.data || []).filter(function(c){ return c.status !== 'churned'; });

    if (creators.length === 0 || clients.length === 0) {
      toast('Add at least one creator and one client first.', 'error');
      return;
    }

    const result = await openModal({
      title: 'New Deal',
      submitLabel: 'Create deal',
      body:
        fField('Title / brief', 'title', { required: true, placeholder: 'Summer hydration UGC · 3 videos' }) +
        '<div class="os-form-row">' +
          fSelect('Client', 'client_id', clients.map(function(c){ return { value: c.id, label: c.name }; })) +
          fSelect('Creator', 'creator_id', creators.map(function(c){ return { value: c.id, label: c.name }; })) +
        '</div>' +
        '<div class="os-form-row">' +
          fSelect('Stage', 'stage', STAGES.map(function(s){ return { value: s.key, label: s.label }; }), { value: 'pitched' }) +
          fField('Value ($)', 'value', { type: 'number', placeholder: '1800' }) +
        '</div>' +
        fField('Due date', 'due_date', { type: 'date' }) +
        fTextarea('Notes', 'notes', { rows: 2 }),
      onSubmit: async function(d){
        const res = await Data.addDeal({
          title: d.title,
          client_id: d.client_id,
          creator_id: d.creator_id,
          stage: d.stage,
          value_cents: Math.round((parseFloat(d.value) || 0) * 100),
          due_date: d.due_date || null,
          notes: d.notes || null
        });
        if (res.error) throw res.error;
        Data.logActivity('deal.created', 'Deal created: ' + d.title);
      }
    });
    if (result) { toast('Deal created.', 'success'); renderCampaigns(); }
  }

  // ----- Inbox -----
  const TOPICS = [
    { key: 'all',     label: 'All' },
    { key: 'brand',   label: 'Brand' },
    { key: 'creator', label: 'Creator' },
    { key: 'careers', label: 'Careers' },
    { key: 'press',   label: 'Press' },
    { key: 'bug',     label: 'Bug' },
    { key: 'general', label: 'General' }
  ];
  let inboxState = { topic: 'all', query: '', items: [], selectedId: null };

  function topicPill(t){
    const map = { 'brand':'new', 'creator':'pending', 'press':'review', 'careers':'draft', 'bug':'declined', 'general':'closed' };
    return map[t] || 'closed';
  }

  async function renderInbox(){
    const list = document.querySelector('.inbox-list');
    const detail = document.querySelector('.inbox-detail');
    if (!list) return;

    if (!isLive()) {
      list.innerHTML = emptyState({ icon:'✉', title:'No messages yet', body:'Sign in with your real account to see real submissions.' });
      if (detail) detail.innerHTML = emptyDetailPane();
      return;
    }

    // Wipe any stale (demo) HTML before the async fetch — prevents mock data from flashing in real workspace.
    list.innerHTML = '<div style="padding:40px 20px; text-align:center; color:var(--ink-4); font-size:0.86rem;">Loading inbox…</div>';
    if (detail) detail.innerHTML = '';

    const { data, error } = await Data.listInquiries();
    if (error) {
      console.error('[Inbox] listInquiries error:', error);
      list.innerHTML = emptyState({ title: 'Could not load inbox', body: error.message + ' — Open the browser console for details.' });
      return;
    }
    inboxState.items = data || [];

    // Wire filter chips + search (once per page load)
    const filters = document.querySelector('.os-filters');
    if (filters && !filters.dataset.osWired) {
      filters.dataset.osWired = '1';
      filters.querySelectorAll('.filter-chip').forEach(function(chip){
        chip.addEventListener('click', function(){
          filters.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('on'); });
          chip.classList.add('on');
          inboxState.topic = chip.dataset.topic || 'all';
          renderInboxList();
        });
      });
      const search = filters.querySelector('input.search-inline');
      if (search) {
        search.addEventListener('input', function(){
          inboxState.query = search.value.toLowerCase();
          renderInboxList();
        });
      }
    }

    // Refresh topic chips with counts + tag with data-topic
    if (filters) {
      const counts = {};
      inboxState.items.forEach(function(i){ counts[i.topic] = (counts[i.topic] || 0) + 1; });
      const chips = filters.querySelectorAll('.filter-chip');
      TOPICS.forEach(function(t, i){
        const chip = chips[i];
        if (!chip) return;
        chip.dataset.topic = t.key;
        const total = t.key === 'all' ? inboxState.items.length : (counts[t.key] || 0);
        chip.innerHTML = escapeHtml(t.label) +
          ' <small style="color:var(--ink-4); margin-left:4px">' + total + '</small>';
        chip.classList.toggle('on', inboxState.topic === t.key);
      });
    }

    // Sync sidebar badge from in-memory data
    syncInboxBadge();

    renderInboxList();
  }

  function syncInboxBadge(){
    const inboxBadge = document.querySelector('.os-nav a[href="inbox.html"] .badge');
    if (!inboxBadge) return;
    const count = (inboxState.items || []).filter(function(i){ return i.status === 'new'; }).length;
    inboxBadge.textContent = count;
    inboxBadge.style.display = count > 0 ? '' : 'none';
  }

  function renderInboxList(){
    const list = document.querySelector('.inbox-list');
    const detail = document.querySelector('.inbox-detail');
    if (!list) return;

    let items = inboxState.items;
    if (inboxState.topic !== 'all') items = items.filter(function(i){ return i.topic === inboxState.topic; });
    if (inboxState.query) {
      const q = inboxState.query;
      items = items.filter(function(i){
        return (i.from_name||'').toLowerCase().indexOf(q) >= 0 ||
               (i.from_email||'').toLowerCase().indexOf(q) >= 0 ||
               (i.subject||'').toLowerCase().indexOf(q) >= 0 ||
               (i.message||'').toLowerCase().indexOf(q) >= 0 ||
               (i.topic||'').toLowerCase().indexOf(q) >= 0;
      });
    }

    if (items.length === 0) {
      const isFiltered = inboxState.query || inboxState.topic !== 'all';
      list.innerHTML = isFiltered
        ? emptyState({ icon:'⌕', title:'No matches', body:'Try a different filter or search.' })
        : emptyState({ icon:'✉', title:'Inbox empty', body:'Submissions from your /contact form land here when visitors get in touch.' });
      if (detail) detail.innerHTML = emptyDetailPane();
      return;
    }

    // Pick item to show (current selection if still in filtered set, else first)
    const selectedExists = inboxState.selectedId && items.find(function(i){ return i.id === inboxState.selectedId; });
    const showItem = selectedExists || items[0];
    inboxState.selectedId = showItem.id;

    list.innerHTML = items.map(function(i){
      const isUnread = i.status === 'new';
      const isReplied = i.status === 'replied';
      const isClosed = i.status === 'closed';
      const isActive = i.id === showItem.id;
      const closedStyle = isClosed ? 'opacity:0.55;' : '';
      return '<div class="inbox-row ' + (isUnread ? 'unread ' : '') + (isActive ? 'active' : '') + '" data-id="' + i.id + '" style="' + closedStyle + '">' +
        '<div class="from">' + escapeHtml(i.from_name || i.from_email || 'Anonymous') +
          '<span style="float:right; color:var(--ink-4); font-size:0.7rem">' + fmtDateRel(i.created_at) + '</span></div>' +
        '<div class="subject">' + (isReplied ? '<span style="color:var(--success); font-weight:600;">↩ </span>' : '') +
          escapeHtml(i.subject || '(no subject)') + '</div>' +
        '<div class="preview">' + escapeHtml((i.message || '').slice(0, 90)) + '</div>' +
        '<div class="meta"><span class="pill ' + topicPill(i.topic) + '">' + escapeHtml(i.topic) + '</span>' +
          '<span>' + escapeHtml(i.from_email || '') + '</span></div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.inbox-row').forEach(function(row){
      row.addEventListener('click', function(){
        list.querySelectorAll('.inbox-row').forEach(function(r){ r.classList.remove('active'); });
        row.classList.add('active');
        const id = row.dataset.id;
        const msg = inboxState.items.find(function(i){ return i.id === id; });
        if (msg) {
          inboxState.selectedId = id;
          renderInboxDetail(msg);
          if (msg.status === 'new') {
            Data.updateInquiry(id, { status: 'read' }).then(function(){
              row.classList.remove('unread');
              msg.status = 'read';
              syncInboxBadge();
            });
          }
        }
      });
    });

    if (showItem) renderInboxDetail(showItem);
  }

  function emptyDetailPane(){
    return '<div style="display:grid; place-items:center; height:100%; padding:40px; color:var(--ink-4); text-align:center;">' +
      '<div>' +
        '<div style="font-size:2rem; margin-bottom:14px; opacity:0.5;">✉</div>' +
        '<h4 style="font-family:var(--font-display); margin:0 0 6px; color:var(--ink); font-size:1rem;">Pick a message</h4>' +
        '<p style="margin:0; font-size:0.86rem; max-width:30ch;">Select an inquiry on the left to read it, reply, or convert it into a deal.</p>' +
      '</div></div>';
  }

  function renderReplyLog(replies){
    if (!replies || replies.length === 0) return '';
    return '<div style="margin-bottom: 18px;">' +
      '<div style="font-size:0.7rem; color:var(--ink-4); font-weight:600; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px;">' +
        'Reply Log · ' + replies.length + '</div>' +
      replies.map(function(r){
        return '<div style="background:var(--bg-alt); border-left:3px solid var(--mint); border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:6px; font-size:0.86rem;">' +
          '<div style="font-size:0.72rem; color:var(--ink-4); margin-bottom:4px;">' +
            escapeHtml(r.by || 'You') + ' · ' + fmtDateRel(r.at) +
          '</div>' +
          '<div style="white-space:pre-wrap; line-height:1.5;">' + escapeHtml(r.text) + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderInboxDetail(msg){
    const detail = document.querySelector('.inbox-detail');
    if (!detail) return;

    const replies = (msg.meta && msg.meta.replies) || [];
    const company = msg.meta && msg.meta.company;
    const niches  = (msg.niches || []).map(function(n){
      return '<span class="tag ' + escapeHtml(n) + '">' + escapeHtml(n) + '</span>';
    }).join(' ');
    const isClosed = msg.status === 'closed';

    detail.innerHTML =
      '<h3>' + escapeHtml(msg.subject || '(no subject)') + '</h3>' +
      '<div class="meta-row">' +
        '<div class="os-avatar">' + Workspace.initials(msg.from_name || msg.from_email || '?') + '</div>' +
        '<div><strong>' + escapeHtml(msg.from_name || msg.from_email || 'Anonymous') + '</strong>' +
          (msg.from_email ? ' &lt;' + escapeHtml(msg.from_email) + '&gt;' : '') + '<br>' +
          '<small style="color:var(--ink-4)">' +
            fmtDateRel(msg.created_at) + ' · <span class="pill ' + topicPill(msg.topic) + '">' + escapeHtml(msg.topic) + '</span>' +
            (company ? ' · ' + escapeHtml(company) : '') +
            ' · status: <strong>' + escapeHtml(msg.status) + '</strong>' +
          '</small></div>' +
        '<div style="margin-left:auto; display:flex; gap:6px; flex-wrap:wrap;">' +
          (msg.topic === 'brand' && !isClosed ? '<button class="btn btn-pink btn-sm" data-inbox-convert="' + msg.id + '">Convert to deal</button>' : '') +
          (!isClosed ? '<button class="btn btn-ghost btn-sm" data-inbox-archive="' + msg.id + '">Archive</button>'
                     : '<button class="btn btn-ghost btn-sm" data-inbox-reopen="' + msg.id + '">Reopen</button>') +
        '</div>' +
      '</div>' +
      (niches ? '<div style="margin-bottom:14px;">' + niches + '</div>' : '') +
      '<div class="body-text" style="border-bottom:1px solid var(--line); padding-bottom:18px; margin-bottom:18px;">' +
        escapeHtml(msg.message || '').replace(/\n/g, '<br>') +
      '</div>' +
      renderReplyLog(replies) +
      (isClosed ? '<div style="padding:14px; background:var(--bg-alt); border-radius:var(--radius-sm); color:var(--ink-3); font-size:0.86rem; text-align:center;">This inquiry is archived. Reopen above to reply.</div>'
                : '<div class="panel" style="margin-top:8px;">' +
        '<div class="panel-head"><h3>Reply</h3>' +
          (replies.length > 0 ? '<span class="meta">Last reply ' + fmtDateRel(replies[replies.length-1].at) + '</span>' : '') +
        '</div>' +
        '<div class="panel-body padded">' +
          '<textarea data-inbox-reply-text rows="4" placeholder="Type your reply… The text is logged on this inquiry and the status flips to Replied." style="width:100%; border:1px solid var(--line-2); border-radius:var(--radius-sm); padding:10px 12px; font:inherit; font-size:0.86rem; resize:vertical; outline:none; box-sizing:border-box;"></textarea>' +
          '<div style="display:flex; gap:8px; margin-top:10px; align-items:center; flex-wrap:wrap;">' +
            '<button class="btn btn-primary btn-sm" data-inbox-reply-send="' + msg.id + '">Save reply</button>' +
            (msg.from_email ? '<button class="btn btn-ghost btn-sm" data-inbox-reply-mailto="' + msg.id + '">Open in email client</button>' : '') +
          '</div>' +
        '</div>' +
      '</div>');

    // Wire actions
    detail.querySelectorAll('[data-inbox-archive]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        const res = await Data.updateInquiry(msg.id, { status: 'closed' });
        if (res.error) toast('Archive failed: ' + res.error.message, 'error');
        else { toast('Archived.', 'success'); renderInbox(); }
      });
    });
    detail.querySelectorAll('[data-inbox-reopen]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        const res = await Data.updateInquiry(msg.id, { status: 'read' });
        if (res.error) toast('Reopen failed: ' + res.error.message, 'error');
        else { toast('Reopened.', 'success'); renderInbox(); }
      });
    });
    detail.querySelectorAll('[data-inbox-convert]').forEach(function(btn){
      btn.addEventListener('click', function(){ convertInquiryToDeal(msg); });
    });
    detail.querySelectorAll('[data-inbox-reply-send]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        const ta = detail.querySelector('[data-inbox-reply-text]');
        if (!ta || !ta.value.trim()) { toast('Type a reply first.', 'error'); return; }
        try {
          await sendInquiryReply(msg, ta.value.trim());
          toast('Reply saved · status: Replied.', 'success');
          ta.value = '';
          renderInbox();
        } catch (err) { toast('Save failed: ' + (err && err.message), 'error'); }
      });
    });
    detail.querySelectorAll('[data-inbox-reply-mailto]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const ta = detail.querySelector('[data-inbox-reply-text]');
        const text = ta ? ta.value.trim() : '';
        const subject = 'Re: ' + (msg.subject || msg.topic);
        const body = text + (text ? '\n\n' : '') + '— ' + (CTX.info ? CTX.info.studio : 'Socio Space Studios');
        window.location.href = 'mailto:' + msg.from_email +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(body);
      });
    });
  }

  async function sendInquiryReply(inquiry, replyText){
    const replies = (inquiry.meta && inquiry.meta.replies) || [];
    replies.push({
      text: replyText,
      by: SESSION ? SESSION.user.email : 'You',
      at: new Date().toISOString()
    });
    const newMeta = Object.assign({}, inquiry.meta || {}, { replies: replies });
    const res = await SB.from('inquiries').update({ status: 'replied', meta: newMeta }).eq('id', inquiry.id);
    if (res.error) throw res.error;
    await Data.logActivity('inquiry.replied', 'Replied to ' + (inquiry.from_name || inquiry.from_email || inquiry.topic));
  }

  async function convertInquiryToDeal(inquiry){
    if (!isLive()) { toast('Sign in to your real workspace.', 'error'); return; }
    const [crRes, clRes] = await Promise.all([Data.listCreators(), Data.listClients()]);
    const creators = (crRes.data || []).filter(function(c){ return c.status !== 'archived'; });
    const clients  = (clRes.data || []).filter(function(c){ return c.status !== 'churned'; });

    if (creators.length === 0) { toast('Add at least one creator first.', 'error'); return; }

    const company = inquiry.meta && inquiry.meta.company;
    const matched = clients.find(function(c){ return company && c.name.toLowerCase() === String(company).toLowerCase(); })
                || clients.find(function(c){ return c.primary_contact_email && c.primary_contact_email === inquiry.from_email; });

    const newClientLabel = '+ Create from inquiry: ' + (company || inquiry.from_name || inquiry.from_email || 'New Client');
    const clientOptions = [{ value: '_new_', label: newClientLabel }]
      .concat(clients.map(function(c){ return { value: c.id, label: c.name }; }));

    const result = await openModal({
      title: 'Convert Inquiry → Deal',
      submitLabel: 'Create deal',
      body:
        fField('Deal title', 'title', { required: true, value: inquiry.subject || ('Inquiry from ' + (inquiry.from_name || inquiry.from_email || 'website')) }) +
        '<div class="os-form-row">' +
          fSelect('Client', 'client_id', clientOptions, { value: matched ? matched.id : '_new_' }) +
          fSelect('Creator', 'creator_id', creators.map(function(c){ return { value: c.id, label: c.name }; })) +
        '</div>' +
        '<div class="os-form-row">' +
          fSelect('Stage', 'stage', STAGES.map(function(s){ return { value: s.key, label: s.label }; }), { value: 'pitched' }) +
          fField('Value ($)', 'value', { type: 'number', placeholder: '1800' }) +
        '</div>' +
        fTextarea('Brief', 'brief', { rows: 3, value: inquiry.message || '' }),
      onSubmit: async function(d){
        let clientId = d.client_id;
        if (clientId === '_new_') {
          const newName = company || inquiry.from_name || (inquiry.from_email || '').split('@')[0] || 'New Client';
          const ins = await Data.addClient({
            name: newName,
            primary_contact_name: inquiry.from_name || null,
            primary_contact_email: inquiry.from_email || null,
            status: 'new'
          });
          if (ins.error) throw ins.error;
          clientId = ins.data.id;
        }
        const dealRes = await Data.addDeal({
          title: d.title,
          client_id: clientId,
          creator_id: d.creator_id,
          stage: d.stage,
          value_cents: Math.round((parseFloat(d.value) || 0) * 100),
          brief: d.brief || null,
          notes: 'Converted from inquiry: ' + (inquiry.subject || inquiry.topic)
        });
        if (dealRes.error) throw dealRes.error;
        // Mark inquiry as closed + record the link
        await SB.from('inquiries').update({
          status: 'closed',
          meta: Object.assign({}, inquiry.meta || {}, { converted_to_deal: dealRes.data.id })
        }).eq('id', inquiry.id);
        await Data.logActivity('inquiry.converted', 'Converted inquiry to deal: ' + d.title);
      }
    });
    if (result) { toast('Deal created · inquiry closed.', 'success'); renderInbox(); }
  }

  // ----- Applications -----
  const APP_STATUSES = [
    { key: 'all',      label: 'All' },
    { key: 'new',      label: 'New' },
    { key: 'review',   label: 'In review' },
    { key: 'approved', label: 'Approved' },
    { key: 'declined', label: 'Declined' }
  ];
  let appsState = { status: 'all', query: '', items: [] };

  async function renderApplications(){
    if (!isLive()) {
      clearStats(['0','0','0','—']);
      const panel = document.querySelector('.os-body .panel');
      if (panel) {
        const tb = panel.querySelector('tbody');
        if (tb) tb.innerHTML = '<tr><td colspan="7" style="padding:0;border:none;">' +
          emptyState({ icon:'⌗', title:'No applications yet', body:'Sign in to your real workspace.' }) + '</td></tr>';
      }
      return;
    }

    // Wipe stale (demo) rows before the async fetch.
    clearStats(['0','0','0','—']);
    const _panel = document.querySelector('.os-body .panel');
    const _tb    = _panel ? _panel.querySelector('tbody') : null;
    if (_tb) _tb.innerHTML = '<tr><td colspan="7" style="padding:40px 20px; text-align:center; color:var(--ink-4); font-size:0.86rem; border:none;">Loading applications…</td></tr>';

    const { data, error } = await Data.listApplications();
    if (error) {
      console.error('[Applications] listApplications error:', error);
      if (_tb) _tb.innerHTML = '<tr><td colspan="7" style="padding:0; border:none;">' +
        emptyState({ title: 'Could not load applications', body: error.message + ' — Open the browser console for details.' }) + '</td></tr>';
      return;
    }
    appsState.items = data || [];

    // KPIs
    const newCount    = appsState.items.filter(function(a){ return a.status === 'new'; }).length;
    const reviewCount = appsState.items.filter(function(a){ return a.status === 'review'; }).length;
    const monthStart  = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const approvedMtd = appsState.items.filter(function(a){ return a.status === 'approved' && new Date(a.created_at) >= monthStart; }).length;

    // Average response: time between created_at and (today) for resolved apps, in days
    const resolved = appsState.items.filter(function(a){ return a.status === 'approved' || a.status === 'declined'; });
    const avgDays = resolved.length > 0
      ? (resolved.reduce(function(s, a){
          const days = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
          return s + days;
        }, 0) / resolved.length).toFixed(1) + 'd'
      : '—';

    clearStats([String(newCount), String(reviewCount), String(approvedMtd), avgDays]);

    // Wire filter chips + search (once)
    const filters = document.querySelector('.os-filters');
    if (filters && !filters.dataset.osWired) {
      filters.dataset.osWired = '1';
      filters.querySelectorAll('.filter-chip').forEach(function(chip){
        chip.addEventListener('click', function(){
          filters.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('on'); });
          chip.classList.add('on');
          appsState.status = chip.dataset.status || 'all';
          renderAppsTable();
        });
      });
      const search = filters.querySelector('input.search-inline');
      if (search) {
        search.addEventListener('input', function(){
          appsState.query = search.value.toLowerCase();
          renderAppsTable();
        });
      }
    }

    // Refresh chips with status counts
    if (filters) {
      const chips = filters.querySelectorAll('.filter-chip');
      APP_STATUSES.forEach(function(s, i){
        const chip = chips[i];
        if (!chip) return;
        chip.dataset.status = s.key;
        const count = s.key === 'all' ? appsState.items.length :
          appsState.items.filter(function(a){ return a.status === s.key; }).length;
        chip.innerHTML = escapeHtml(s.label) +
          ' <small style="color:var(--ink-4); margin-left:4px">' + count + '</small>';
        chip.classList.toggle('on', appsState.status === s.key);
      });
    }

    // Sync sidebar badge from in-memory data
    syncAppsBadge();

    renderAppsTable();
  }

  function syncAppsBadge(){
    const appsBadge = document.querySelector('.os-nav a[href="applications.html"] .badge');
    if (!appsBadge) return;
    const count = (appsState.items || []).filter(function(a){ return a.status === 'new' || a.status === 'review'; }).length;
    appsBadge.textContent = count;
    appsBadge.style.display = count > 0 ? '' : 'none';
  }

  function renderAppsTable(){
    const panel = document.querySelector('.os-body .panel');
    if (!panel) return;
    const tbody = panel.querySelector('tbody');
    if (!tbody) return;

    let items = appsState.items;
    if (appsState.status !== 'all') items = items.filter(function(a){ return a.status === appsState.status; });
    if (appsState.query) {
      const q = appsState.query;
      items = items.filter(function(a){
        return (a.name||'').toLowerCase().indexOf(q) >= 0 ||
               (a.handle||'').toLowerCase().indexOf(q) >= 0 ||
               (a.email||'').toLowerCase().indexOf(q) >= 0 ||
               (a.city||'').toLowerCase().indexOf(q) >= 0 ||
               ((a.niches||[]).join(' ')).toLowerCase().indexOf(q) >= 0 ||
               (a.pitch||'').toLowerCase().indexOf(q) >= 0;
      });
    }

    if (items.length === 0) {
      const isFiltered = appsState.query || appsState.status !== 'all';
      tbody.innerHTML = '<tr><td colspan="7" style="padding:0;border:none;">' +
        (isFiltered
          ? emptyState({ icon:'⌕', title:'No matches', body:'Try a different filter or search.' })
          : emptyState({ icon:'⌗', title:'No applications yet', body:'Share your /apply page link with creators. Submissions show here for review.' })
        ) + '</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function(a){
      const niche = (a.niches || [])[0] || '—';
      const dim = a.status === 'declined' ? 'opacity:0.6' : a.status === 'approved' ? 'opacity:0.7' : '';
      const hasNotes = a.reviewer_notes && a.reviewer_notes.trim().length > 0;
      return '<tr data-id="' + a.id + '" style="' + dim + '">' +
        '<td><div class="who"><div class="av ' + pickAv(a.name) + '">' + Workspace.initials(a.name) + '</div>' +
          '<div class="nm">' + escapeHtml(a.name) +
            (hasNotes ? ' <span title="Reviewer notes" style="color:var(--lilac); font-size:0.7rem;">●</span>' : '') +
            '<small>' + escapeHtml(a.handle || '') + (a.city ? ' · ' + escapeHtml(a.city) : '') + '</small></div></div></td>' +
        '<td>' + (niche !== '—' ? '<span class="tag ' + escapeHtml(niche) + '">' + escapeHtml(niche) + '</span>' : '—') + '</td>' +
        '<td>' + (a.followers ? (a.followers >= 1000 ? (a.followers/1000).toFixed(1) + 'k' : a.followers) : '—') + '</td>' +
        '<td>' + (a.engagement_rate ? a.engagement_rate + '%' : '—') + '</td>' +
        '<td>' + fmtDateRel(a.created_at) + '</td>' +
        '<td><span class="pill ' + (a.status === 'new' ? 'new' : a.status === 'review' ? 'review' : a.status === 'approved' ? 'active' : 'declined') + '">' +
          (a.status === 'new' ? 'New' : a.status === 'review' ? 'In review' : a.status === 'approved' ? 'Approved' : 'Declined') + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-app-view="' + a.id + '">View</button>' +
          (a.status === 'new' || a.status === 'review' ?
            '<button class="btn btn-pink btn-sm" data-app-approve="' + a.id + '">Approve</button>' +
            '<button class="btn btn-ghost btn-sm" data-app-decline="' + a.id + '">Decline</button>' : '') +
        '</div></td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-app-view]').forEach(function(btn){
      btn.addEventListener('click', function(){
        const a = appsState.items.find(function(x){ return x.id === btn.dataset.appView; });
        if (a) viewApplication(a);
      });
    });
    tbody.querySelectorAll('[data-app-approve]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        const a = appsState.items.find(function(x){ return x.id === btn.dataset.appApprove; });
        if (!a) return;
        if (!confirm('Approve ' + a.name + '? This adds them to your roster as Onboarding.')) return;
        try {
          await Data.approveApplication(a);
          await Data.logActivity('application.approved', 'Approved ' + a.name);
          toast('Added to roster.', 'success');
          renderApplications();
        } catch (err) { toast('Approve failed: ' + err.message, 'error'); }
      });
    });
    tbody.querySelectorAll('[data-app-decline]').forEach(function(btn){
      btn.addEventListener('click', async function(){
        const a = appsState.items.find(function(x){ return x.id === btn.dataset.appDecline; });
        if (!a) return;
        if (!confirm('Decline ' + a.name + '?')) return;
        const res = await Data.declineApplication(a.id);
        if (res.error) toast('Decline failed: ' + res.error.message, 'error');
        else {
          await Data.logActivity('application.declined', 'Declined ' + a.name);
          toast('Declined.', 'success');
          renderApplications();
        }
      });
    });
  }

  async function viewApplication(a){
    // Auto-promote 'new' → 'review' on first view (and claim for this studio)
    if (a.status === 'new' && SESSION) {
      const upd = await SB.from('admin_applications').update({
        status: 'review',
        reviewer_id: SESSION.user.id,
        studio_id: studioId()
      }).eq('id', a.id);
      if (!upd.error) a.status = 'review';
    }

    const links     = a.links || {};
    const urls      = Array.isArray(links.urls) ? links.urls : [];
    const samples   = links.samples || '';
    const platform  = links.platform || '';
    const rate      = links.rate || '';

    const followersText = a.followers
      ? (a.followers >= 1000 ? (a.followers/1000).toFixed(1) + 'k' : String(a.followers))
      : '—';

    const niches = (a.niches || []).map(function(n){
      return '<span class="tag ' + escapeHtml(n) + '">' + escapeHtml(n) + '</span>';
    }).join(' ');

    const linksHtml = urls.length > 0 ?
      urls.map(function(u){
        return '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener" style="display:block; word-break:break-all; color:var(--pink); margin-bottom:4px; text-decoration:underline; text-underline-offset:2px;">' +
          escapeHtml(u) + ' ↗</a>';
      }).join('') :
      (samples
        ? '<div style="color:var(--ink-3); white-space:pre-wrap; font-size:0.84rem; line-height:1.5;">' + escapeHtml(samples) + '</div>'
        : '<span style="color:var(--ink-4)">No links provided</span>');

    function metaCell(label, value){
      return '<div>' +
        '<div style="font-size:0.68rem; color:var(--ink-4); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:2px; font-weight:600;">' + label + '</div>' +
        '<div>' + value + '</div>' +
      '</div>';
    }

    const isResolved = a.status === 'approved' || a.status === 'declined';

    const result = await openModal({
      title: 'Application · ' + a.name,
      wide: true,
      submitLabel: 'Save notes',
      body:
        '<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--line);">' +
          metaCell('Handle', '<strong>' + escapeHtml(a.handle || '—') + '</strong>') +
          metaCell('Email', a.email
            ? '<a href="mailto:' + escapeHtml(a.email) + '" style="color:var(--ink); text-decoration:underline; text-underline-offset:2px; font-weight:600;">' + escapeHtml(a.email) + '</a>'
            : '<strong>—</strong>') +
          metaCell('City', '<strong>' + escapeHtml(a.city || '—') + '</strong>') +
          metaCell('Followers', '<strong>' + followersText + '</strong>') +
          metaCell('Engagement', '<strong>' + (a.engagement_rate ? a.engagement_rate + '%' : '—') + '</strong>') +
          metaCell('Submitted', '<strong>' + fmtDateRel(a.created_at) + '</strong>') +
          metaCell('Platform', '<strong>' + escapeHtml(platform || '—') + '</strong>') +
          metaCell('Rate band', '<strong>' + escapeHtml(rate || '—') + '</strong>') +
          metaCell('Status', '<span class="pill ' + (a.status === 'new' ? 'new' : a.status === 'review' ? 'review' : a.status === 'approved' ? 'active' : 'declined') + '">' +
            (a.status === 'new' ? 'New' : a.status === 'review' ? 'In review' : a.status === 'approved' ? 'Approved' : 'Declined') + '</span>') +
        '</div>' +
        (niches ? '<div style="margin-bottom:14px;">' +
          '<div style="font-size:0.68rem; color:var(--ink-4); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; font-weight:600;">Niches</div>' +
          niches + '</div>' : '') +
        (a.pitch ? '<div style="margin-bottom:16px;">' +
          '<div style="font-size:0.68rem; color:var(--ink-4); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; font-weight:600;">Why Socio Space</div>' +
          '<div style="color:var(--ink-2); white-space:pre-wrap; font-size:0.92rem; line-height:1.6; padding:12px 14px; background:var(--bg-alt); border-radius:var(--radius-sm);">' +
            escapeHtml(a.pitch) + '</div></div>' : '') +
        '<div style="margin-bottom:18px;">' +
          '<div style="font-size:0.68rem; color:var(--ink-4); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; font-weight:600;">Sample Links</div>' +
          linksHtml + '</div>' +
        fTextarea('Reviewer Notes (private)', 'reviewer_notes', {
          rows: 3,
          value: a.reviewer_notes || '',
          placeholder: 'Why is this a fit / not? Save notes for later or for teammates.'
        }) +
        (!isResolved ? '<div style="display:flex; gap:8px; margin-top:14px; padding-top:14px; border-top:1px solid var(--line); justify-content:flex-end;">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-modal-decline>Decline applicant</button>' +
          '<button type="button" class="btn btn-pink btn-sm" data-modal-approve>Approve &amp; add to roster</button>' +
          '</div>' : ''),
      onMount: function(wrap, close){
        const errEl = wrap.querySelector('.os-modal-error');
        function showErr(m){ errEl.textContent = m; errEl.classList.add('show'); }

        const approveBtn = wrap.querySelector('[data-modal-approve]');
        if (approveBtn) {
          approveBtn.addEventListener('click', async function(){
            // Save notes before approving
            const ta = wrap.querySelector('textarea[name="reviewer_notes"]');
            const notes = ta ? ta.value : '';
            try {
              if (notes !== (a.reviewer_notes || '')) {
                await SB.from('admin_applications').update({ reviewer_notes: notes }).eq('id', a.id);
              }
              await Data.approveApplication(a);
              await Data.logActivity('application.approved', 'Approved ' + a.name);
              toast('Added to roster.', 'success');
              close({ approved: true });
              renderApplications();
            } catch (err) { showErr((err && err.message) || 'Approval failed'); }
          });
        }
        const declineBtn = wrap.querySelector('[data-modal-decline]');
        if (declineBtn) {
          declineBtn.addEventListener('click', async function(){
            const ta = wrap.querySelector('textarea[name="reviewer_notes"]');
            const notes = ta ? ta.value : '';
            try {
              if (notes !== (a.reviewer_notes || '')) {
                await SB.from('admin_applications').update({ reviewer_notes: notes }).eq('id', a.id);
              }
              const res = await Data.declineApplication(a.id);
              if (res.error) throw res.error;
              await Data.logActivity('application.declined', 'Declined ' + a.name);
              toast('Declined.', 'success');
              close({ declined: true });
              renderApplications();
            } catch (err) { showErr((err && err.message) || 'Decline failed'); }
          });
        }
      },
      onSubmit: async function(d){
        const upd = await SB.from('admin_applications').update({
          reviewer_notes: d.reviewer_notes || null,
          reviewer_id:    SESSION ? SESSION.user.id : null
        }).eq('id', a.id);
        if (upd.error) throw upd.error;
      }
    });

    if (result && !result.approved && !result.declined) {
      toast('Notes saved.', 'success');
      renderApplications();
    }
  }

  // ----- Bookings -----
  async function renderBookings(){
    if (!isLive()) {
      document.querySelectorAll('.cal-event').forEach(function(e){ e.remove(); });
      wireAddBooking();
      return;
    }
    const { data, error } = await Data.listBookings();
    if (error) { toast('Load failed: ' + error.message, 'error'); return; }
    const events = data || [];

    document.querySelectorAll('.cal-event').forEach(function(e){ e.remove(); });
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    document.querySelectorAll('.cal-cell:not(.dim)').forEach(function(cell){
      const dEl = cell.querySelector('.d');
      if (!dEl) return;
      const day = parseInt(dEl.textContent, 10);
      if (!day) return;
      const cellDate = new Date(today.getFullYear(), today.getMonth(), day);
      events.forEach(function(ev){
        if (!ev.starts_at) return;
        const evDate = new Date(ev.starts_at);
        if (evDate.getDate() === cellDate.getDate() && evDate.getMonth() === cellDate.getMonth() && evDate.getFullYear() === cellDate.getFullYear()) {
          const span = document.createElement('span');
          span.className = 'cal-event ' + (ev.type === 'live' ? 'live' : ev.type === 'shoot' ? 'shoot' : ev.type === 'deadline' ? 'deadline' : '');
          span.textContent = evDate.toLocaleTimeString(undefined, { hour: 'numeric' }).replace(/\s/g, '').toLowerCase() + ' · ' + ev.title;
          cell.appendChild(span);
        }
      });
    });
    wireAddBooking();
  }

  function wireAddBooking(){ /* handled by global click delegation in initUI */ }

  async function addBooking(){
    if (!isLive()) { toast('Sign in to your real workspace.', 'error'); return; }
    const [crRes, clRes] = await Promise.all([Data.listCreators(), Data.listClients()]);
    const creators = crRes.data || [];
    const clients  = clRes.data || [];

    const result = await openModal({
      title: 'New Booking',
      submitLabel: 'Create booking',
      body:
        fField('Title', 'title', { required: true, placeholder: 'TikTok Live · Vital Proteins' }) +
        '<div class="os-form-row">' +
          fSelect('Type', 'type', [
            { value: 'live', label: 'TikTok Live' },
            { value: 'shoot', label: 'Shoot day' },
            { value: 'deadline', label: 'Deadline' },
            { value: 'call', label: 'Discovery call' }
          ], { value: 'live' }) +
          fSelect('Status', 'status', [
            { value: 'pending', label: 'Pending' },
            { value: 'confirmed', label: 'Confirmed' }
          ], { value: 'confirmed' }) +
        '</div>' +
        '<div class="os-form-row">' +
          fSelect('Creator', 'creator_id',
            [{ value: '', label: '(none)' }].concat(creators.map(function(c){ return { value: c.id, label: c.name }; }))) +
          fSelect('Client', 'client_id',
            [{ value: '', label: '(none)' }].concat(clients.map(function(c){ return { value: c.id, label: c.name }; }))) +
        '</div>' +
        '<div class="os-form-row">' +
          fField('Starts at', 'starts_at', { type: 'datetime-local', required: true }) +
          fField('Ends at', 'ends_at', { type: 'datetime-local' }) +
        '</div>' +
        fTextarea('Notes', 'notes', { rows: 2 }),
      onSubmit: async function(d){
        const res = await Data.addBooking({
          title: d.title,
          type: d.type,
          status: d.status,
          creator_id: d.creator_id || null,
          client_id: d.client_id || null,
          starts_at: d.starts_at ? new Date(d.starts_at).toISOString() : null,
          ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
          notes: d.notes || null
        });
        if (res.error) throw res.error;
        Data.logActivity('booking.created', 'Booking: ' + d.title);
      }
    });
    if (result) { toast('Booking created.', 'success'); renderBookings(); }
  }

  // ----- Payments -----
  async function renderPayments(){
    if (!isLive()) {
      clearStats(['$0','$0','$0','$0']);
      const panels = document.querySelectorAll('.os-grid.cols-2 .panel');
      [0,1].forEach(function(i){
        if (panels[i]) {
          const tb = panels[i].querySelector('tbody');
          if (tb) tb.innerHTML = '<tr><td colspan="4" style="padding:0;border:none;">' +
            emptyState({ icon: i === 0 ? '$' : '↗', title: i === 0 ? 'No invoices yet' : 'No payouts yet', body:'Sign in to your real workspace.' }) + '</td></tr>';
        }
      });
      wireAddInvoice();
      return;
    }

    const [invRes, payRes] = await Promise.all([Data.listInvoices(), Data.listPayouts()]);
    const invoices = invRes.data || [];
    const payouts  = payRes.data || [];

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const cashIn = invoices.filter(function(i){ return i.status === 'paid' && i.paid_at && new Date(i.paid_at) >= monthStart; })
      .reduce(function(s,i){ return s + (i.amount_cents || 0); }, 0);
    const outstanding = invoices.filter(function(i){ return i.status === 'sent' || i.status === 'overdue'; })
      .reduce(function(s,i){ return s + (i.amount_cents || 0); }, 0);
    const payoutsPending = payouts.filter(function(p){ return p.status === 'pending'; })
      .reduce(function(s,p){ return s + (p.amount_cents || 0); }, 0);
    const commission = Math.round(cashIn * 0.20);
    clearStats([fmtMoneyCents(cashIn), fmtMoneyCents(outstanding), fmtMoneyCents(payoutsPending), fmtMoneyCents(commission)]);

    const panels = document.querySelectorAll('.os-grid.cols-2 .panel');
    if (panels[0]) {
      const tb = panels[0].querySelector('tbody');
      if (tb) {
        if (invoices.length === 0) {
          tb.innerHTML = '<tr><td colspan="4" style="padding:0;border:none;">' +
            emptyState({ icon:'$', title:'No invoices yet', body:'Send your first invoice to a client.', cta:'+ New invoice', action:'add-invoice' }) + '</td></tr>';
        } else {
          tb.innerHTML = invoices.map(function(i){
            return '<tr><td><strong>' + escapeHtml(i.invoice_number || '#' + i.id.slice(0,6)) + '</strong>' +
              '<br><small style="color:var(--ink-4)">' + fmtDateRel(i.created_at) + '</small></td>' +
              '<td>' + escapeHtml(i.client ? i.client.name : '—') + '</td>' +
              '<td><strong>' + fmtMoneyCents(i.amount_cents) + '</strong></td>' +
              '<td><span class="pill ' + (i.status === 'paid' ? 'paid' : i.status === 'overdue' ? 'declined' : i.status === 'sent' ? 'pending' : 'draft') + '">' +
              i.status.charAt(0).toUpperCase() + i.status.slice(1) + '</span></td></tr>';
          }).join('');
        }
      }
    }
    if (panels[1]) {
      const tb = panels[1].querySelector('tbody');
      if (tb) {
        if (payouts.length === 0) {
          tb.innerHTML = '<tr><td colspan="4" style="padding:0;border:none;">' +
            emptyState({ icon:'↗', title:'No payouts yet', body:'Creator payouts settle here as deliveries are paid.' }) + '</td></tr>';
        } else {
          tb.innerHTML = payouts.map(function(p){
            return '<tr><td><div class="who"><div class="av">' + Workspace.initials(p.creator ? p.creator.name : '?') + '</div>' +
              '<div class="nm">' + escapeHtml(p.creator ? p.creator.name : '—') + '</div></div></td>' +
              '<td>' + escapeHtml(p.deal ? p.deal.title : '—') + '</td>' +
              '<td><strong>' + fmtMoneyCents(p.amount_cents) + '</strong></td>' +
              '<td><span class="pill ' + (p.status === 'paid' ? 'paid' : 'pending') + '">' +
              p.status.charAt(0).toUpperCase() + p.status.slice(1) + '</span></td></tr>';
          }).join('');
        }
      }
    }
    wireAddInvoice();
  }

  function wireAddInvoice(){ /* handled by global click delegation in initUI */ }

  async function addInvoice(){
    if (!isLive()) { toast('Sign in to your real workspace.', 'error'); return; }
    const [clRes, dlRes] = await Promise.all([Data.listClients(), Data.listDeals()]);
    const clients = clRes.data || [];
    const deals = dlRes.data || [];

    const result = await openModal({
      title: 'New Invoice',
      submitLabel: 'Create invoice',
      body:
        '<div class="os-form-row">' +
          fField('Invoice number', 'invoice_number', { placeholder: '#0049' }) +
          fField('Amount ($)', 'amount', { type: 'number', required: true, placeholder: '1800' }) +
        '</div>' +
        fSelect('Client', 'client_id',
          [{ value: '', label: '(none)' }].concat(clients.map(function(c){ return { value: c.id, label: c.name }; }))) +
        fSelect('Deal (optional)', 'deal_id',
          [{ value: '', label: '(none)' }].concat(deals.map(function(d){ return { value: d.id, label: d.title }; }))) +
        '<div class="os-form-row">' +
          fSelect('Status', 'status', [
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'paid', label: 'Paid' }
          ], { value: 'sent' }) +
          fField('Due date', 'due_date', { type: 'date' }) +
        '</div>',
      onSubmit: async function(d){
        const res = await Data.addInvoice({
          invoice_number: d.invoice_number || null,
          amount_cents: Math.round((parseFloat(d.amount) || 0) * 100),
          client_id: d.client_id || null,
          deal_id: d.deal_id || null,
          status: d.status,
          due_date: d.due_date || null,
          sent_at: d.status === 'sent' || d.status === 'paid' ? new Date().toISOString() : null,
          paid_at: d.status === 'paid' ? new Date().toISOString() : null
        });
        if (res.error) throw res.error;
        Data.logActivity('invoice.created', 'Invoice: ' + (d.invoice_number || ''));
      }
    });
    if (result) { toast('Invoice created.', 'success'); renderPayments(); }
  }

  // ----- Settings -----
  async function renderSettings(){
    const info = CTX.info;
    if (!info) return;
    const studioBlock = document.querySelector('#studio');
    if (studioBlock) {
      const t = studioBlock.querySelector('input[type="text"]');
      const e = studioBlock.querySelector('input[type="email"]');
      if (t) t.value = info.studio;
      if (e) e.value = info.email || '';
    }
    const account = document.querySelector('#account');
    if (account) {
      const t = account.querySelector('input[type="text"]');
      const e = account.querySelector('input[type="email"]');
      if (t) t.value = info.name;
      if (e) e.value = info.email || '';
    }

    if (!isLive()) return;

    // Wire studio Save button
    if (studioBlock) {
      const saveBtn = studioBlock.querySelector('.btn-primary');
      if (saveBtn) {
        saveBtn.addEventListener('click', async function(){
          const t = studioBlock.querySelector('input[type="text"]');
          if (!t || !t.value.trim()) return;
          const res = await Data.updateStudio({ name: t.value.trim() });
          if (res.error) toast('Save failed: ' + res.error.message, 'error');
          else {
            CTX.info.studio = t.value.trim();
            toast('Studio updated.', 'success');
            const brand = document.querySelector('.os-side-head .brand');
            if (brand) brand.innerHTML = escapeHtml(CTX.info.studio) + '<small>' + escapeHtml(CTX.info.plan || 'Studio') + ' plan</small>';
          }
        });
      }
    }
  }

  // ----- Other (lighter) -----
  async function renderContent(){
    const grid = document.querySelector('.lib-grid');
    if (grid) grid.innerHTML = emptyState({ icon:'▶', title:'Library empty', body:'Asset uploads coming next. For now, deliverables are tracked on the deal record.' });
  }
  async function renderAnalytics(){
    if (!isLive()) {
      clearStats(['$0','0','—','$0']);
      document.querySelectorAll('.panel').forEach(function(p){
        const head = p.querySelector('.panel-head h3');
        if (!head || head.textContent.trim() === 'Studio Analytics') return;
        const body = p.querySelector('.panel-body');
        if (body) body.innerHTML = emptyState({ icon:'⌁', title:'Not enough data yet', body:'Once you book deals and track deliveries, charts populate here.' });
      });
      return;
    }
    const stats = await Data.dashboardStats();
    const tiles = document.querySelectorAll('.os-stats .stat-tile');
    if (tiles[0]) tiles[0].querySelector('.num').textContent = fmtMoneyCents(stats.mtdRevenue);
    if (tiles[1]) tiles[1].querySelector('.num').textContent = stats.activeCampaigns;
    if (tiles[2]) tiles[2].querySelector('.num').textContent = '—';
    if (tiles[3]) tiles[3].querySelector('.num').textContent = '$0';

    document.querySelectorAll('.panel').forEach(function(p){
      const head = p.querySelector('.panel-head h3');
      if (!head || head.textContent.trim() === 'Studio Analytics') return;
      const body = p.querySelector('.panel-body');
      if (body) body.innerHTML = emptyState({ icon:'⌁', title:'Not enough data yet', body:'Once you book deals and track deliveries, charts will compute from your real numbers.' });
    });
  }
  async function renderTeam(){
    const tbody = document.querySelector('.os-table tbody');
    if (tbody && CTX.info) {
      tbody.innerHTML =
        '<tr><td><div class="who"><div class="os-avatar" style="background:var(--ink);color:#fff;width:30px;height:30px;font-size:0.7rem">' +
          CTX.info.initials + '</div><div class="nm">' + escapeHtml(CTX.info.name) +
          '<small>' + escapeHtml(CTX.info.email || '') + '</small></div></div></td>' +
        '<td><span class="tag" style="background:var(--ink); color:#fff; border-color:var(--ink)">Owner</span></td>' +
        '<td>Just now</td><td><span class="pill active">Active</span></td>' +
        '<td><div class="row-actions"><button class="btn btn-ghost btn-sm">Edit</button></div></td></tr>';
    }
    const activity = findPanel('Activity');
    if (activity) {
      const body = activity.querySelector('.panel-body');
      if (body) body.innerHTML = emptyState({ icon:'◉', title:'No team activity yet', body:'Team invites coming next pass.' });
    }
  }
  async function renderContracts(){
    if (!isLive()) {
      clearStats(['0','0','5','0']);
      const activity = findPanel('Recent Activity');
      if (activity) {
        const tb = activity.querySelector('tbody');
        if (tb) tb.innerHTML = '<tr><td colspan="3" style="padding:0;border:none;">' +
          emptyState({ icon:'§', title:'No contracts sent', body:'Sign in to your real workspace.' }) + '</td></tr>';
      }
      return;
    }
    clearStats(['0','0','5','0']);
    const activity = findPanel('Recent Activity');
    if (activity) {
      const tb = activity.querySelector('tbody');
      if (tb) tb.innerHTML = '<tr><td colspan="3" style="padding:0;border:none;">' +
        emptyState({ icon:'§', title:'No contracts sent yet', body:'Templates are saved on the left. Contract sending is coming next pass.' }) + '</td></tr>';
    }
  }

  const renderers = {
    'index.html':         renderDashboard,
    'creators.html':      renderCreators,
    'clients.html':       renderClients,
    'campaigns.html':     renderCampaigns,
    'inbox.html':         renderInbox,
    'applications.html':  renderApplications,
    'bookings.html':      renderBookings,
    'payments.html':      renderPayments,
    'content.html':       renderContent,
    'analytics.html':     renderAnalytics,
    'team.html':          renderTeam,
    'contracts.html':     renderContracts,
    'settings.html':      renderSettings
  };

  function renderWorkspace(){
    const r = renderers[ROUTE];
    if (r) r();
  }

  // ====================================================================
  //  initUI
  // ====================================================================
  function initUI(){
    const toggle = document.querySelector('.os-menu-toggle');
    const side = document.querySelector('.os-side');
    if (toggle && side) {
      toggle.addEventListener('click', function(e){ e.stopPropagation(); side.classList.toggle('open'); });
      document.addEventListener('click', function(e){
        if (side.classList.contains('open') && !side.contains(e.target) && e.target !== toggle) side.classList.remove('open');
      });
    }

    document.querySelectorAll('[data-signout]').forEach(function(btn){ btn.addEventListener('click', handleSignout); });
    document.querySelectorAll('[data-exit-admin]').forEach(function(btn){ btn.addEventListener('click', handleSignout); });

    document.querySelectorAll('[data-filters]').forEach(function(group){
      const multi = group.dataset.filters === 'multi';
      group.querySelectorAll('.filter-chip').forEach(function(chip){
        chip.addEventListener('click', function(){
          if (!multi) group.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('on'); });
          chip.classList.toggle('on');
        });
      });
    });

    // Global event delegation for "+ Add" buttons (page-head + empty-state CTAs)
    document.body.addEventListener('click', function(e){
      const da = e.target.closest('[data-action]');
      if (da) {
        const a = da.dataset.action;
        if      (a === 'add-creator') { e.preventDefault(); addCreator(); }
        else if (a === 'add-client')  { e.preventDefault(); addClient(); }
        else if (a === 'add-deal')    { e.preventDefault(); addDeal(); }
        else if (a === 'add-invoice') { e.preventDefault(); addInvoice(); }
        else if (a === 'add-booking') { e.preventDefault(); addBooking(); }
        return;
      }
      // Page-head and kanban-col buttons matched by text
      const btn = e.target.closest('.os-page-head .actions .btn, .kan-col-head .add');
      if (!btn) return;
      const t = btn.textContent;
      if      (/^\+\s*Add creator/i.test(t))   { e.preventDefault(); addCreator(); }
      else if (/^\+\s*Add client/i.test(t))    { e.preventDefault(); addClient(); }
      else if (/^\+\s*(New deal|New campaign)/i.test(t) || btn.classList.contains('add')) { e.preventDefault(); addDeal(); }
      else if (/^\+\s*New invoice/i.test(t))   { e.preventDefault(); addInvoice(); }
      else if (/^\+\s*New booking/i.test(t))   { e.preventDefault(); addBooking(); }
    });

    if (!isPublic) {
      injectModeBanner();
      updateSidebarBadges();
      renderWorkspace();
    }

    if (isLogin)  wireLoginForm();
    if (isSignup) wireSignupForm();
  }

  // ====================================================================
  //  AUTH HANDLERS
  // ====================================================================
  async function handleSignout(){
    try { if (SB) await SB.auth.signOut(); } catch(_){}
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ADMIN_KEY);
    location.href = 'login.html';
  }

  function setMsg(id, text, color){
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '';
    el.style.color = color || '#E64A4A';
  }

  function wireLoginForm(){
    const form = document.getElementById('login-form');
    if (form) {
      form.addEventListener('submit', async function(e){
        e.preventDefault();
        const email = form.email.value.trim();
        const pw = form.password.value;
        if (!email || !pw) { setMsg('login-msg','Enter email and password to continue.'); return; }
        if (!SB) { setMsg('login-msg','Auth service unavailable. Refresh and try again.'); return; }
        setMsg('login-msg','Signing you in…','#5A5A5A');
        const { error } = await SB.auth.signInWithPassword({ email: email, password: pw });
        if (error) { setMsg('login-msg', error.message); return; }
        localStorage.setItem(AUTH_KEY,'1');
        localStorage.removeItem(ADMIN_KEY);
        Mode.set(Mode.WORKSPACE);
        location.href = 'index.html';
      });
    }
  }

  function wireSignupForm(){
    const form = document.getElementById('signup-form');
    if (!form) return;
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const studio = form.studio.value.trim();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const pw = form.password.value;
      if (!studio || !name || !email || !pw) { setMsg('signup-msg','Please fill in every field to continue.'); return; }
      if (pw.length < 8) { setMsg('signup-msg','Password must be at least 8 characters.'); return; }
      if (!SB) { setMsg('signup-msg','Auth service unavailable.'); return; }
      setMsg('signup-msg','Creating your account…','#5A5A5A');
      const { data, error } = await SB.auth.signUp({
        email: email, password: pw,
        options: { data: { name: name, studio: studio } }
      });
      if (error) { setMsg('signup-msg', error.message); return; }
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ studio:studio, name:name, email:email, at: Date.now() })); } catch(_){}
      if (!data.session) {
        setMsg('signup-msg','Check your email to confirm, then come back to pick a plan.','#2D9F6E');
        setTimeout(function(){ location.href = '../pricing.html?from=signup'; }, 1800);
        return;
      }
      location.href = '../pricing.html?from=signup';
    });
  }

  // Expose
  window.SocioOS = { Mode, Workspace, AUTH_KEY, MODE_KEY, WORKSPACE_KEY, PENDING_KEY };

  bootstrap();
})();
