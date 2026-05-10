/* /demo/demo.js — read-only demo workspace
   No auth required. Reads from demo_* tables. All write actions show a
   "demo mode" toast and link to signup. Completely isolated from /os/.
*/

(function () {
  // ====================================================================
  //  CONFIG
  // ====================================================================
  const SUPABASE_URL      = 'https://bjfvmclkpmqarvnrlttk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZnZtY2xrcG1xYXJ2bnJsdHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODgyOTUsImV4cCI6MjA5Mzg2NDI5NX0.NLYvFG97OZCm8nASXWaywD7uNzSJ_-G7CxVwWKbQsUY';
  const SDK_URL           = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45';

  const ROUTE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  const STAGES = [
    { key: 'pitched',     label: 'Pitched' },
    { key: 'negotiating', label: 'Negotiating' },
    { key: 'signed',      label: 'Signed' },
    { key: 'delivered',   label: 'Delivered' },
    { key: 'paid',        label: 'Paid' }
  ];

  // Hardcoded demo studio identity (no auth, so no real account)
  const INFO = {
    studio:   'Sample Studio',
    plan:     'Demo',
    name:     'Studio Owner',
    email:    'demo@sociospace.studio',
    initials: 'SS'
  };
  window.OSContext = { info: INFO };

  // ====================================================================
  //  SUPABASE LOAD
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

  let SB = null;

  async function bootstrap(){
    try {
      await loadSupabase();
      SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.SBClient = SB;
    } catch (err) {
      console.error('[DEMO] Supabase load failed:', err);
    }
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
    const diff = Date.now() - dt.getTime();
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
  function initials(name){
    if (!name) return '?';
    const p = String(name).trim().split(/\s+/);
    if (p.length === 1) return p[0].slice(0,2).toUpperCase();
    return (p[0][0] + p[p.length-1][0]).toUpperCase();
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
    setTimeout(function(){ t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; }, 2400);
    setTimeout(function(){ t.remove(); }, 2800);
  }
  function demoBlock(action){
    const a = action || 'do that';
    toast('Demo is read-only — sign up to ' + a + ' for real.', 'success');
  }

  // ====================================================================
  //  DEMO BANNER + SIDEBAR PERSONALIZATION
  // ====================================================================
  function injectDemoBanner(){
    const main = document.querySelector('.os-main');
    if (!main) return;
    const top = main.querySelector('.os-top');
    if (!top) return;

    if (!main.querySelector('.os-demo-banner')) {
      const banner = document.createElement('div');
      banner.className = 'os-demo-banner';
      banner.innerHTML =
        '<strong>Demo</strong>' +
        '<span>You\'re browsing a sample studio with placeholder data — read-only, no signup needed.</span>' +
        '<a href="../os/signup.html" class="cta">Start your real workspace →</a>';
      top.insertAdjacentElement('afterend', banner);
    }

    // Sidebar branding
    const brand = document.querySelector('.os-side-head .brand');
    if (brand) brand.innerHTML = escapeHtml(INFO.studio) + '<small>' + escapeHtml(INFO.plan) + ' workspace</small>';
    const foot = document.querySelector('.os-side-foot');
    if (foot) {
      const av  = foot.querySelector('.os-avatar');
      const who = foot.querySelector('.who');
      if (av)  av.textContent  = INFO.initials;
      if (who) who.innerHTML   = escapeHtml(INFO.name) + '<small>' + escapeHtml(INFO.email) + '</small>';
    }

    // DEMO badge in page title
    const h1 = top.querySelector('h1');
    if (h1 && !h1.querySelector('.workspace-badge')) {
      const badge = document.createElement('span');
      badge.className = 'workspace-badge';
      badge.style.background = 'var(--ink)';
      badge.style.color = '#FBF6E6';
      badge.textContent = 'Demo';
      h1.appendChild(badge);
    }
  }

  async function updateSidebarBadges(){
    const inboxBadge = document.querySelector('.os-nav a[href="inbox.html"] .badge');
    const appsBadge  = document.querySelector('.os-nav a[href="applications.html"] .badge');
    if (inboxBadge) { inboxBadge.textContent = '0'; inboxBadge.style.display = 'none'; }
    if (appsBadge)  { appsBadge.textContent  = '0'; appsBadge.style.display  = 'none'; }
    if (!SB) return;
    try {
      const [inboxRes, appsRes] = await Promise.all([
        Data.countUnreadInquiries(),
        Data.countOpenApplications()
      ]);
      const inboxCount = inboxRes.count || 0;
      const appsCount  = appsRes.count  || 0;
      if (inboxBadge) {
        inboxBadge.textContent = inboxCount;
        inboxBadge.style.display = inboxCount > 0 ? '' : 'none';
      }
      if (appsBadge) {
        appsBadge.textContent = appsCount;
        appsBadge.style.display = appsCount > 0 ? '' : 'none';
      }
    } catch (err) { console.warn('[DEMO] badge fetch failed', err); }
  }

  // ====================================================================
  //  DATA LAYER (read-only, demo_ prefix)
  // ====================================================================
  const Data = {
    listCreators(){
      return SB.from('demo_creators').select('*').order('created_at', { ascending: false });
    },
    listClients(){
      return SB.from('demo_clients').select('*').order('created_at', { ascending: false });
    },
    listDeals(){
      return SB.from('demo_deals')
        .select('*, creator:demo_creators(id,name,niches), client:demo_clients(id,name)')
        .order('created_at', { ascending: false });
    },
    listInquiries(){
      return SB.from('demo_inquiries').select('*').order('created_at', { ascending: false });
    },
    listApplications(){
      return SB.from('demo_applications').select('*').order('created_at', { ascending: false });
    },
    listBookings(){
      return SB.from('demo_bookings')
        .select('*, creator:demo_creators(id,name)')
        .order('starts_at', { ascending: true });
    },
    listInvoices(){
      return SB.from('demo_invoices')
        .select('*, client:demo_clients(id,name)')
        .order('created_at', { ascending: false });
    },
    listPayouts(){
      return SB.from('demo_payouts')
        .select('*, creator:demo_creators(id,name), deal:demo_deals(id,title)')
        .order('created_at', { ascending: false });
    },
    listAssets(){
      return SB.from('demo_assets')
        .select('*, creator:demo_creators(id,name)')
        .order('created_at', { ascending: false });
    },
    listActivity(limit){
      return SB.from('demo_activity').select('*').order('created_at', { ascending: false }).limit(limit || 20);
    },
    countUnreadInquiries(){
      return SB.from('demo_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new');
    },
    countOpenApplications(){
      return SB.from('demo_applications').select('id', { count: 'exact', head: true }).in('status', ['new','review']);
    },
    async dashboardStats(){
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [active, apps, paid, unread] = await Promise.all([
        SB.from('demo_deals').select('id', { count: 'exact', head: true }).neq('stage', 'paid'),
        SB.from('demo_applications').select('id', { count: 'exact', head: true }).eq('status', 'new'),
        SB.from('demo_invoices').select('amount_cents').eq('status','paid').gte('paid_at', monthStart.toISOString()),
        SB.from('demo_inquiries').select('id', { count: 'exact', head: true }).eq('status','new')
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
  //  RENDER HELPERS
  // ====================================================================
  function emptyState(opts){
    return '<div class="os-workspace-empty">' +
      '<div class="icon">' + (opts.icon || '◇') + '</div>' +
      '<h4>' + escapeHtml(opts.title) + '</h4>' +
      '<p>' + escapeHtml(opts.body) + '</p>' +
      '</div>';
  }
  function clearStats(zeros){
    document.querySelectorAll('.os-stats .stat-tile').forEach(function(tile, i){
      const num = tile.querySelector('.num');
      if (num) num.textContent = zeros[i] != null ? zeros[i] : '0';
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
  function topicPill(t){
    const map = { 'brand':'new', 'creator':'pending', 'press':'review', 'careers':'draft', 'bug':'declined', 'general':'closed' };
    return map[t] || 'closed';
  }

  // ====================================================================
  //  RENDERERS
  // ====================================================================

  // ----- Dashboard -----
  async function renderDashboard(){
    const head = document.querySelector('.os-page-head h2');
    const sub  = document.querySelector('.os-page-head p');
    if (head) head.textContent = 'Welcome to the Sample Studio.';
    if (sub) sub.textContent = "Click around — every page is wired to live demo data. Sign up to spin up your own.";

    if (!SB) return;
    try {
      const [stats, deals, activity, apps, inboxes, bookings] = await Promise.all([
        Data.dashboardStats(), Data.listDeals(), Data.listActivity(8),
        Data.listApplications(), Data.listInquiries(), Data.listBookings()
      ]);

      const tiles = document.querySelectorAll('.os-stats .stat-tile');
      if (tiles[0]) { tiles[0].querySelector('.num').textContent = stats.activeCampaigns; tiles[0].querySelector('.delta').innerHTML = '<span style="color:var(--ink-4)">Open deals</span>'; }
      if (tiles[1]) { tiles[1].querySelector('.num').textContent = stats.pendingApplications; tiles[1].querySelector('.delta').innerHTML = stats.pendingApplications > 0 ? 'Awaiting review' : 'All caught up'; }
      if (tiles[2]) { tiles[2].querySelector('.num').textContent = fmtMoneyCents(stats.mtdRevenue); tiles[2].querySelector('.delta').innerHTML = '<span style="color:var(--ink-4)">Paid this month</span>'; }
      if (tiles[3]) { tiles[3].querySelector('.num').textContent = stats.unreadInquiries; tiles[3].querySelector('.delta').innerHTML = stats.unreadInquiries > 0 ? 'New messages' : 'Inbox at zero'; }

      const panels = document.querySelectorAll('.os-grid.cols-2 .panel');
      if (panels[0]) {
        const tbody = panels[0].querySelector('tbody');
        if (tbody) {
          const rows = (deals.data || []).slice(0, 5);
          if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding:0;border:none;">' + emptyState({ icon:'◎', title:'No deals', body:'Pipeline is empty in this demo snapshot.' }) + '</td></tr>';
          } else {
            tbody.innerHTML = rows.map(function(d){
              return '<tr>' +
                '<td><strong>' + escapeHtml(d.client ? d.client.name : '—') + '</strong>' +
                  '<br><small style="color:var(--ink-4)">' + escapeHtml(d.title) + '</small></td>' +
                '<td><div class="who"><div class="av ' + pickAv(d.creator ? d.creator.name : '') + '">' + initials(d.creator ? d.creator.name : '?') + '</div>' +
                  '<div class="nm">' + escapeHtml(d.creator ? d.creator.name : 'Unassigned') + '</div></div></td>' +
                '<td><span class="pill ' + d.stage + '">' + (STAGES.find(function(s){return s.key===d.stage;})||{label:d.stage}).label + '</span></td>' +
                '<td style="text-align:right"><strong>' + fmtMoneyCents(d.value_cents) + '</strong></td>' +
              '</tr>';
            }).join('');
          }
        }
      }

      const actPanel = findPanel('Activity');
      if (actPanel) {
        const body = actPanel.querySelector('.panel-body');
        const items = activity.data || [];
        if (body) body.innerHTML = items.length === 0
          ? emptyState({ icon:'✦', title:'Nothing yet', body:'Activity feed is empty.' })
          : items.map(function(a){
              return '<div class="feed-item"><span class="dot"></span>' +
                '<div class="body">' + escapeHtml(a.body || a.type) + '</div>' +
                '<span class="when">' + fmtDateRel(a.created_at) + '</span></div>';
            }).join('');
      }

      const appsPanel = findPanel('New Applications');
      if (appsPanel) {
        const body = appsPanel.querySelector('.panel-body');
        const items = (apps.data || []).filter(function(a){ return a.status === 'new' || a.status === 'review'; }).slice(0, 4);
        if (body) body.innerHTML = items.length === 0
          ? emptyState({ icon:'⌗', title:'No new applications', body:'Empty in demo.' })
          : items.map(function(a){
              return '<div class="feed-item"><div class="body"><strong>' + escapeHtml(a.name) + '</strong>' +
                (a.followers ? ' · ' + (a.followers >= 1000 ? (a.followers/1000).toFixed(1)+'k' : a.followers) : '') +
                ' · ' + escapeHtml((a.niches || [])[0] || '—') +
                '<br><small style="color:var(--ink-4)">' + fmtDateRel(a.created_at) + '</small></div>' +
                '<span class="when"><span class="pill ' + (a.status === 'review' ? 'review' : 'new') + '">' +
                (a.status === 'review' ? 'Review' : 'New') + '</span></span></div>';
            }).join('');
      }

      const inboxPanel = findPanel('Inbox · Recent');
      if (inboxPanel) {
        const body = inboxPanel.querySelector('.panel-body');
        const items = (inboxes.data || []).slice(0, 4);
        if (body) body.innerHTML = items.length === 0
          ? emptyState({ icon:'✉', title:'Inbox empty', body:'Empty in demo.' })
          : items.map(function(i){
              return '<div class="feed-item ' + (i.status === 'new' ? 'pink' : '') + '"><span class="dot"></span>' +
                '<div class="body"><strong>' + escapeHtml(i.from_name || i.from_email || 'Anon') + '</strong>' +
                ' — ' + escapeHtml(i.topic) + '<br>' +
                '<small style="color:var(--ink-4)">"' + escapeHtml((i.message || '').slice(0, 60)) + '..."</small></div>' +
                '<span class="when">' + fmtDateRel(i.created_at) + '</span></div>';
            }).join('');
      }

      const bkPanel = findPanel("This Week's Bookings");
      if (bkPanel) {
        const body = bkPanel.querySelector('.panel-body');
        const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 14);
        const items = (bookings.data || []).filter(function(b){
          if (!b.starts_at) return false;
          const t = new Date(b.starts_at);
          return t <= weekEnd;
        }).slice(0, 4);
        if (body) body.innerHTML = items.length === 0
          ? emptyState({ icon:'◷', title:'Nothing booked', body:'Empty in demo.' })
          : items.map(function(b){
              const dt = new Date(b.starts_at);
              return '<div class="feed-item"><div class="body"><strong>' +
                dt.toLocaleDateString(undefined, { weekday: 'short' }) + ' · ' +
                dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + '</strong>' +
                '<br><small style="color:var(--ink-4)">' + escapeHtml(b.title) + '</small></div>' +
                '<span class="when"><span class="pill ' + (b.status === 'pending' ? 'pending' : 'active') + '">' +
                (b.status === 'pending' ? 'Pending' : 'Confirmed') + '</span></span></div>';
            }).join('');
      }
    } catch (err) {
      console.error('[DEMO/Dashboard]', err);
    }
  }

  // ----- Creators -----
  async function renderCreators(){
    const grid = document.querySelector('.creator-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="padding:40px; text-align:center; color:var(--ink-4); font-size:0.86rem;">Loading roster…</div>';
    if (!SB) return;
    const { data, error } = await Data.listCreators();
    if (error) { grid.innerHTML = emptyState({ title:'Could not load', body: error.message }); return; }
    const items = data || [];
    if (items.length === 0) { grid.innerHTML = emptyState({ icon:'★', title:'Roster empty', body:'No creators in demo.' }); return; }
    grid.innerHTML = items.map(function(c){
      const ini = initials(c.name);
      const niches = (c.niches || []).slice(0,2).map(function(n){ return '<span class="tag ' + n + '">' + escapeHtml(n) + '</span>'; }).join('');
      return '<div class="creator-tile" data-id="' + c.id + '">' +
        '<div class="head"><div class="av">' + ini + '</div>' +
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
          '<button class="btn btn-ghost btn-sm" data-demo-block="view profile">View</button>' +
          '<button class="btn btn-primary btn-sm" data-demo-block="book a creator">Book</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ----- Clients -----
  async function renderClients(){
    const panel = document.querySelector('.os-body .panel');
    const tb = panel ? panel.querySelector('tbody') : null;
    if (tb) tb.innerHTML = '<tr><td colspan="7" style="padding:40px 20px; text-align:center; color:var(--ink-4); border:none;">Loading clients…</td></tr>';

    clearStats(['0','$0','0','0']);
    if (!SB) return;
    const { data, error } = await Data.listClients();
    if (error) { if (tb) tb.innerHTML = '<tr><td colspan="7">' + emptyState({ title:'Load failed', body: error.message }) + '</td></tr>'; return; }
    const items = data || [];

    const lifetime = items.reduce(function(s, c){ return s + (c.lifetime_spend_cents || 0); }, 0);
    const newCount = items.filter(function(c){
      const cd = new Date(c.created_at); const now = new Date();
      return cd.getMonth() === now.getMonth() && cd.getFullYear() === now.getFullYear();
    }).length;
    const atRisk = items.filter(function(c){ return c.status === 'at_risk'; }).length;
    clearStats([String(items.length), fmtMoneyCents(lifetime), String(newCount), String(atRisk)]);

    if (!tb) return;
    if (items.length === 0) {
      tb.innerHTML = '<tr><td colspan="7" style="padding:0;border:none;">' + emptyState({ icon:'▣', title:'No clients', body:'Empty in demo.' }) + '</td></tr>';
      return;
    }
    tb.innerHTML = items.map(function(c){
      return '<tr data-id="' + c.id + '">' +
        '<td><strong>' + escapeHtml(c.name) + '</strong>' + (c.industry ? '<br><small style="color:var(--ink-4)">' + escapeHtml(c.industry) + '</small>' : '') + '</td>' +
        '<td>' + escapeHtml(c.primary_contact_name || '—') + (c.primary_contact_email ? '<br><small style="color:var(--ink-4)">' + escapeHtml(c.primary_contact_email) + '</small>' : '') + '</td>' +
        '<td>—</td><td>' + fmtDateRel(c.created_at) + '</td>' +
        '<td><strong>' + fmtMoneyCents(c.lifetime_spend_cents) + '</strong></td>' +
        '<td><span class="pill ' + (c.status === 'active' ? 'active' : c.status === 'new' ? 'new' : c.status === 'at_risk' ? 'pending' : 'closed') + '">' +
          (c.status === 'at_risk' ? 'At risk' : c.status.charAt(0).toUpperCase() + c.status.slice(1)) + '</span></td>' +
        '<td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-demo-block="open client">Open</button></div></td>' +
      '</tr>';
    }).join('');
  }

  // ----- Campaigns / Deals (kanban) -----
  async function renderCampaigns(){
    const cols = document.querySelectorAll('.kan-col');
    if (cols.length === 0) return;
    cols.forEach(function(c){ c.querySelectorAll('.kan-card, .empty-msg').forEach(function(x){ x.remove(); }); });

    if (!SB) return;
    const { data, error } = await Data.listDeals();
    if (error) { toast('Load failed: ' + error.message, 'error'); return; }
    const deals = data || [];

    cols.forEach(function(col, i){
      const stageKey = STAGES[i] && STAGES[i].key;
      if (stageKey) col.dataset.stage = stageKey;
      const cnt = col.querySelector('.kan-col-head .count');
      const inStage = deals.filter(function(d){ return d.stage === stageKey; });
      if (cnt) cnt.textContent = inStage.length;
      inStage.forEach(function(d){
        const card = document.createElement('div');
        card.className = 'kan-card';
        card.dataset.id = d.id;
        const niche = ((d.creator && d.creator.niches) || [])[0] || 'lifestyle';
        card.innerHTML =
          '<div class="b">' + escapeHtml((d.client ? d.client.name : 'Client') + ' × ' + (d.creator ? d.creator.name : 'Creator')) + '</div>' +
          '<span class="tag ' + niche + '">' + escapeHtml(d.title) + '</span>' +
          '<div class="meta"><span>' + fmtDateRel(d.created_at) + '</span><span class="amt">' + fmtMoneyCents(d.value_cents) + '</span></div>';
        col.appendChild(card);
      });
    });
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

  async function renderInbox(){
    const list = document.querySelector('.inbox-list');
    const detail = document.querySelector('.inbox-detail');
    if (!list) return;
    list.innerHTML = '<div style="padding:40px 20px; text-align:center; color:var(--ink-4); font-size:0.86rem;">Loading inbox…</div>';
    if (detail) detail.innerHTML = '';
    if (!SB) return;

    const { data, error } = await Data.listInquiries();
    if (error) { list.innerHTML = emptyState({ title:'Load failed', body: error.message }); return; }
    inboxState.items = data || [];

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
    if (filters) {
      const counts = {};
      inboxState.items.forEach(function(i){ counts[i.topic] = (counts[i.topic] || 0) + 1; });
      const chips = filters.querySelectorAll('.filter-chip');
      TOPICS.forEach(function(t, i){
        const chip = chips[i];
        if (!chip) return;
        chip.dataset.topic = t.key;
        const total = t.key === 'all' ? inboxState.items.length : (counts[t.key] || 0);
        chip.innerHTML = escapeHtml(t.label) + ' <small style="color:var(--ink-4); margin-left:4px">' + total + '</small>';
        chip.classList.toggle('on', inboxState.topic === t.key);
      });
    }

    renderInboxList();
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
               (i.message||'').toLowerCase().indexOf(q) >= 0;
      });
    }
    if (items.length === 0) {
      list.innerHTML = emptyState({ icon:'⌕', title:'No matches', body:'Try a different filter.' });
      if (detail) detail.innerHTML = '';
      return;
    }
    const showItem = (inboxState.selectedId && items.find(function(i){ return i.id === inboxState.selectedId; })) || items[0];
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
        if (msg) { inboxState.selectedId = id; renderInboxDetail(msg); }
      });
    });
    if (showItem) renderInboxDetail(showItem);
  }

  function renderInboxDetail(msg){
    const detail = document.querySelector('.inbox-detail');
    if (!detail) return;
    const replies = (msg.meta && msg.meta.replies) || [];
    const company = msg.meta && msg.meta.company;
    detail.innerHTML =
      '<h3>' + escapeHtml(msg.subject || '(no subject)') + '</h3>' +
      '<div class="meta-row">' +
        '<div class="os-avatar">' + initials(msg.from_name || msg.from_email || '?') + '</div>' +
        '<div><strong>' + escapeHtml(msg.from_name || msg.from_email || 'Anonymous') + '</strong>' +
          (msg.from_email ? ' &lt;' + escapeHtml(msg.from_email) + '&gt;' : '') + '<br>' +
          '<small style="color:var(--ink-4)">' + fmtDateRel(msg.created_at) + ' · <span class="pill ' + topicPill(msg.topic) + '">' + escapeHtml(msg.topic) + '</span>' +
            (company ? ' · ' + escapeHtml(company) : '') + '</small></div>' +
        '<div style="margin-left:auto; display:flex; gap:6px;">' +
          (msg.topic === 'brand' ? '<button class="btn btn-pink btn-sm" data-demo-block="convert inquiries to deals">Convert to deal</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-demo-block="archive inquiries">Archive</button>' +
        '</div>' +
      '</div>' +
      '<div class="body-text" style="border-bottom:1px solid var(--line); padding-bottom:18px; margin-bottom:18px;">' +
        escapeHtml(msg.message || '').replace(/\n/g, '<br>') +
      '</div>' +
      (replies.length > 0
        ? '<div style="margin-bottom: 18px;"><div style="font-size:0.7rem; color:var(--ink-4); font-weight:600; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px;">Reply Log · ' + replies.length + '</div>' +
          replies.map(function(r){
            return '<div style="background:var(--bg-alt); border-left:3px solid var(--mint); border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:6px; font-size:0.86rem;">' +
              '<div style="font-size:0.72rem; color:var(--ink-4); margin-bottom:4px;">' + escapeHtml(r.by || 'You') + ' · ' + fmtDateRel(r.at) + '</div>' +
              '<div style="white-space:pre-wrap; line-height:1.5;">' + escapeHtml(r.text) + '</div></div>';
          }).join('') + '</div>'
        : '') +
      '<div class="panel" style="margin-top:8px;">' +
        '<div class="panel-head"><h3>Reply</h3></div>' +
        '<div class="panel-body padded">' +
          '<textarea rows="3" placeholder="Type your reply…" style="width:100%; border:1px solid var(--line-2); border-radius:var(--radius-sm); padding:10px 12px; font:inherit; font-size:0.86rem; resize:vertical; outline:none; box-sizing:border-box;"></textarea>' +
          '<div style="display:flex; gap:8px; margin-top:10px; align-items:center;">' +
            '<button class="btn btn-primary btn-sm" data-demo-block="reply to inquiries">Save reply</button>' +
            '<small style="color:var(--ink-4); margin-left:auto;">Demo · sign up to save replies</small>' +
          '</div>' +
        '</div>' +
      '</div>';
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
    clearStats(['0','0','0','—']);
    const _panel = document.querySelector('.os-body .panel');
    const _tb = _panel ? _panel.querySelector('tbody') : null;
    if (_tb) _tb.innerHTML = '<tr><td colspan="7" style="padding:40px 20px; text-align:center; color:var(--ink-4); font-size:0.86rem; border:none;">Loading…</td></tr>';
    if (!SB) return;

    const { data, error } = await Data.listApplications();
    if (error) { if (_tb) _tb.innerHTML = '<tr><td colspan="7">' + emptyState({ title:'Load failed', body: error.message }) + '</td></tr>'; return; }
    appsState.items = data || [];

    const newCount    = appsState.items.filter(function(a){ return a.status === 'new'; }).length;
    const reviewCount = appsState.items.filter(function(a){ return a.status === 'review'; }).length;
    const monthStart  = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const approvedMtd = appsState.items.filter(function(a){ return a.status === 'approved' && new Date(a.created_at) >= monthStart; }).length;
    const resolved = appsState.items.filter(function(a){ return a.status === 'approved' || a.status === 'declined'; });
    const avgDays = resolved.length > 0
      ? (resolved.reduce(function(s, a){ return s + (Date.now() - new Date(a.created_at).getTime())/86400000; }, 0) / resolved.length).toFixed(1) + 'd'
      : '—';
    clearStats([String(newCount), String(reviewCount), String(approvedMtd), avgDays]);

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
      if (search) search.addEventListener('input', function(){ appsState.query = search.value.toLowerCase(); renderAppsTable(); });
    }
    if (filters) {
      const chips = filters.querySelectorAll('.filter-chip');
      APP_STATUSES.forEach(function(s, i){
        const chip = chips[i];
        if (!chip) return;
        chip.dataset.status = s.key;
        const count = s.key === 'all' ? appsState.items.length : appsState.items.filter(function(a){ return a.status === s.key; }).length;
        chip.innerHTML = escapeHtml(s.label) + ' <small style="color:var(--ink-4); margin-left:4px">' + count + '</small>';
        chip.classList.toggle('on', appsState.status === s.key);
      });
    }
    renderAppsTable();
  }

  function renderAppsTable(){
    const panel = document.querySelector('.os-body .panel');
    const tbody = panel ? panel.querySelector('tbody') : null;
    if (!tbody) return;

    let items = appsState.items;
    if (appsState.status !== 'all') items = items.filter(function(a){ return a.status === appsState.status; });
    if (appsState.query) {
      const q = appsState.query;
      items = items.filter(function(a){
        return (a.name||'').toLowerCase().indexOf(q) >= 0 ||
               (a.handle||'').toLowerCase().indexOf(q) >= 0 ||
               (a.email||'').toLowerCase().indexOf(q) >= 0 ||
               ((a.niches||[]).join(' ')).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:0;border:none;">' + emptyState({ icon:'⌕', title:'No matches', body:'Try a different filter.' }) + '</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function(a){
      const niche = (a.niches || [])[0] || '—';
      const dim = a.status === 'declined' ? 'opacity:0.6' : a.status === 'approved' ? 'opacity:0.7' : '';
      return '<tr data-id="' + a.id + '" style="' + dim + '">' +
        '<td><div class="who"><div class="av ' + pickAv(a.name) + '">' + initials(a.name) + '</div>' +
          '<div class="nm">' + escapeHtml(a.name) +
            '<small>' + escapeHtml(a.handle || '') + (a.city ? ' · ' + escapeHtml(a.city) : '') + '</small></div></div></td>' +
        '<td>' + (niche !== '—' ? '<span class="tag ' + escapeHtml(niche) + '">' + escapeHtml(niche) + '</span>' : '—') + '</td>' +
        '<td>' + (a.followers ? (a.followers >= 1000 ? (a.followers/1000).toFixed(1) + 'k' : a.followers) : '—') + '</td>' +
        '<td>' + (a.engagement_rate ? a.engagement_rate + '%' : '—') + '</td>' +
        '<td>' + fmtDateRel(a.created_at) + '</td>' +
        '<td><span class="pill ' + (a.status === 'new' ? 'new' : a.status === 'review' ? 'review' : a.status === 'approved' ? 'active' : 'declined') + '">' +
          (a.status === 'new' ? 'New' : a.status === 'review' ? 'In review' : a.status === 'approved' ? 'Approved' : 'Declined') + '</span></td>' +
        '<td><div class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-demo-block="view applications">View</button>' +
          (a.status === 'new' || a.status === 'review' ?
            '<button class="btn btn-pink btn-sm" data-demo-block="approve applicants">Approve</button>' +
            '<button class="btn btn-ghost btn-sm" data-demo-block="decline applicants">Decline</button>' : '') +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  // ----- Bookings -----
  async function renderBookings(){
    document.querySelectorAll('.cal-event').forEach(function(e){ e.remove(); });
    if (!SB) return;
    const { data, error } = await Data.listBookings();
    if (error) { toast('Load failed', 'error'); return; }
    const events = data || [];
    const today = new Date();
    document.querySelectorAll('.cal-cell:not(.dim)').forEach(function(cell){
      const dEl = cell.querySelector('.d');
      if (!dEl) return;
      const day = parseInt(dEl.textContent, 10);
      if (!day) return;
      events.forEach(function(ev){
        if (!ev.starts_at) return;
        const evDate = new Date(ev.starts_at);
        if (evDate.getDate() === day && evDate.getMonth() === today.getMonth() && evDate.getFullYear() === today.getFullYear()) {
          const span = document.createElement('span');
          span.className = 'cal-event ' + (ev.type === 'live' ? 'live' : ev.type === 'shoot' ? 'shoot' : ev.type === 'deadline' ? 'deadline' : '');
          span.textContent = evDate.toLocaleTimeString(undefined, { hour: 'numeric' }).replace(/\s/g, '').toLowerCase() + ' · ' + ev.title;
          cell.appendChild(span);
        }
      });
    });
  }

  // ----- Payments -----
  async function renderPayments(){
    clearStats(['$0','$0','$0','$0']);
    const panels = document.querySelectorAll('.os-grid.cols-2 .panel');
    [0,1].forEach(function(i){
      if (panels[i]) {
        const tb = panels[i].querySelector('tbody');
        if (tb) tb.innerHTML = '<tr><td colspan="4" style="padding:40px; text-align:center; color:var(--ink-4); font-size:0.86rem; border:none;">Loading…</td></tr>';
      }
    });
    if (!SB) return;
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
    clearStats([fmtMoneyCents(cashIn), fmtMoneyCents(outstanding), fmtMoneyCents(payoutsPending), fmtMoneyCents(Math.round(cashIn * 0.20))]);

    if (panels[0]) {
      const tb = panels[0].querySelector('tbody');
      if (tb) tb.innerHTML = invoices.length === 0
        ? '<tr><td colspan="4">' + emptyState({ icon:'$', title:'No invoices', body:'Empty in demo.' }) + '</td></tr>'
        : invoices.map(function(i){
            return '<tr><td><strong>' + escapeHtml(i.invoice_number || '#' + i.id.slice(0,6)) + '</strong>' +
              '<br><small style="color:var(--ink-4)">' + fmtDateRel(i.created_at) + '</small></td>' +
              '<td>' + escapeHtml(i.client ? i.client.name : '—') + '</td>' +
              '<td><strong>' + fmtMoneyCents(i.amount_cents) + '</strong></td>' +
              '<td><span class="pill ' + (i.status === 'paid' ? 'paid' : i.status === 'overdue' ? 'declined' : i.status === 'sent' ? 'pending' : 'draft') + '">' +
              i.status.charAt(0).toUpperCase() + i.status.slice(1) + '</span></td></tr>';
          }).join('');
    }
    if (panels[1]) {
      const tb = panels[1].querySelector('tbody');
      if (tb) tb.innerHTML = payouts.length === 0
        ? '<tr><td colspan="4">' + emptyState({ icon:'↗', title:'No payouts', body:'Empty in demo.' }) + '</td></tr>'
        : payouts.map(function(p){
            return '<tr><td><div class="who"><div class="av">' + initials(p.creator ? p.creator.name : '?') + '</div>' +
              '<div class="nm">' + escapeHtml(p.creator ? p.creator.name : '—') + '</div></div></td>' +
              '<td>' + escapeHtml(p.deal ? p.deal.title : '—') + '</td>' +
              '<td><strong>' + fmtMoneyCents(p.amount_cents) + '</strong></td>' +
              '<td><span class="pill ' + (p.status === 'paid' ? 'paid' : 'pending') + '">' +
              p.status.charAt(0).toUpperCase() + p.status.slice(1) + '</span></td></tr>';
          }).join('');
    }
  }

  // ----- Content -----
  async function renderContent(){
    const grid = document.querySelector('.lib-grid');
    if (grid) grid.innerHTML = '<div style="padding:40px; text-align:center; color:var(--ink-4); grid-column:1/-1;">Loading library…</div>';
    if (!SB) return;
    const { data } = await Data.listAssets();
    const items = data || [];
    if (!grid) return;
    if (items.length === 0) { grid.innerHTML = emptyState({ icon:'▶', title:'Library empty', body:'Empty in demo.' }); return; }
    grid.innerHTML = items.map(function(a, i){
      const cls = ['', 'b', 'c', 'd'][i % 4];
      const ini = initials((a.creator && a.creator.name) || '?');
      return '<div class="asset"><div class="thumb ' + cls + '">' + ini + '<div class="play">▶</div></div>' +
        '<div class="meta"><div class="ttl">' + escapeHtml(a.title || 'Untitled') + '</div>' +
        '<div class="sub"><span>' + (a.duration_seconds ? '0:' + (a.duration_seconds < 10 ? '0' : '') + a.duration_seconds : '—') + ' · v' + (a.version || 1) + '</span>' +
        '<span class="pill ' + (a.status === 'approved' ? 'active' : a.status === 'whitelisted' ? 'paid' : a.status === 'review' ? 'review' : 'draft') + '" style="font-size:0.64rem">' +
        a.status.charAt(0).toUpperCase() + a.status.slice(1) + '</span></div></div></div>';
    }).join('');
  }

  // ----- Analytics -----
  async function renderAnalytics(){
    if (!SB) return;
    const stats = await Data.dashboardStats();
    const tiles = document.querySelectorAll('.os-stats .stat-tile');
    if (tiles[0]) tiles[0].querySelector('.num').textContent = fmtMoneyCents(stats.mtdRevenue);
    if (tiles[1]) tiles[1].querySelector('.num').textContent = stats.activeCampaigns;
    if (tiles[2]) tiles[2].querySelector('.num').textContent = '62%';
    if (tiles[3]) tiles[3].querySelector('.num').textContent = '$1,720';
    // The chart bars + niche rows in the HTML are static demo visuals — leave them in place.
  }

  // ----- Team -----
  async function renderTeam(){
    const tbody = document.querySelector('.os-table tbody');
    if (tbody) {
      tbody.innerHTML =
        '<tr><td><div class="who"><div class="os-avatar" style="background:var(--ink);color:#fff;width:30px;height:30px;font-size:0.7rem">' +
          INFO.initials + '</div><div class="nm">' + escapeHtml(INFO.name) +
          '<small>' + escapeHtml(INFO.email) + '</small></div></div></td>' +
        '<td><span class="tag" style="background:var(--ink); color:#fff; border-color:var(--ink)">Owner</span></td>' +
        '<td>Just now</td><td><span class="pill active">Active</span></td>' +
        '<td><div class="row-actions"><button class="btn btn-ghost btn-sm" data-demo-block="edit teammates">Edit</button></div></td></tr>';
    }
    const activity = findPanel('Activity');
    if (activity) {
      const body = activity.querySelector('.panel-body');
      if (body) body.innerHTML = emptyState({ icon:'◉', title:'No team activity', body:'Empty in demo.' });
    }
  }

  // ----- Contracts -----
  async function renderContracts(){
    clearStats(['—','—','5','—']);
    if (!SB) return;
    const activity = findPanel('Recent Activity');
    if (!activity) return;
    const { data } = await SB.from('demo_contracts').select('*').order('created_at', { ascending: false });
    const items = data || [];
    const tb = activity.querySelector('tbody');
    if (!tb) return;
    if (items.length === 0) {
      tb.innerHTML = '<tr><td colspan="3">' + emptyState({ icon:'§', title:'No contracts', body:'Empty in demo.' }) + '</td></tr>';
      return;
    }
    tb.innerHTML = items.map(function(c){
      const parties = c.parties || {};
      return '<tr><td><strong>' + escapeHtml(c.template || 'contract') + '</strong>' +
        '<br><small style="color:var(--ink-4)">' + fmtDateRel(c.created_at) + '</small></td>' +
        '<td><small>' + escapeHtml((parties.creator || '—') + ' ↔ ' + (parties.client || '—')) + '</small></td>' +
        '<td><span class="pill ' + (c.status === 'signed' ? 'signed' : c.status === 'sent' ? 'pending' : 'draft') + '">' +
        c.status.charAt(0).toUpperCase() + c.status.slice(1) + '</span></td></tr>';
    }).join('');
  }

  // ----- Settings -----
  async function renderSettings(){
    const studio = document.querySelector('#studio');
    if (studio) {
      const t = studio.querySelector('input[type="text"]');
      const e = studio.querySelector('input[type="email"]');
      if (t) { t.value = INFO.studio; t.disabled = true; }
      if (e) { e.value = INFO.email; e.disabled = true; }
    }
    const account = document.querySelector('#account');
    if (account) {
      const t = account.querySelector('input[type="text"]');
      const e = account.querySelector('input[type="email"]');
      if (t) { t.value = INFO.name; t.disabled = true; }
      if (e) { e.value = INFO.email; e.disabled = true; }
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

  // ====================================================================
  //  initUI
  // ====================================================================
  function initUI(){
    // Mobile menu
    const toggle = document.querySelector('.os-menu-toggle');
    const side = document.querySelector('.os-side');
    if (toggle && side) {
      toggle.addEventListener('click', function(e){ e.stopPropagation(); side.classList.toggle('open'); });
      document.addEventListener('click', function(e){
        if (side.classList.contains('open') && !side.contains(e.target) && e.target !== toggle) side.classList.remove('open');
      });
    }

    // Sign-out → public marketing site
    document.querySelectorAll('[data-signout]').forEach(function(btn){
      btn.addEventListener('click', function(){ location.href = '../index.html'; });
    });

    // Visual filter chips (per-page logic above also handles its own filters)
    document.querySelectorAll('[data-filters]').forEach(function(group){
      const multi = group.dataset.filters === 'multi';
      group.querySelectorAll('.filter-chip').forEach(function(chip){
        chip.addEventListener('click', function(){
          if (!multi) group.querySelectorAll('.filter-chip').forEach(function(c){ c.classList.remove('on'); });
          chip.classList.toggle('on');
        });
      });
    });

    // Block all write/edit/add actions with a "demo, sign up" toast
    document.body.addEventListener('click', function(e){
      const explicit = e.target.closest('[data-demo-block]');
      if (explicit) {
        e.preventDefault();
        demoBlock(explicit.dataset.demoBlock);
        return;
      }
      const btn = e.target.closest('.os-page-head .actions .btn, .kan-col-head .add');
      if (!btn) return;
      const t = btn.textContent;
      if (/^\+\s*(Add creator|Add client|New deal|New invoice|New booking|New campaign|Send for|Compose|New template|Invite member|Upload|Update card|Change plan|Update password|Enable 2FA|Export|Refresh|Manage|Save changes|Update profile)/i.test(t) || btn.classList.contains('add')) {
        e.preventDefault();
        demoBlock('do that');
      }
    });

    injectDemoBanner();
    updateSidebarBadges();

    const r = renderers[ROUTE];
    if (r) r();
  }

  bootstrap();
})();
