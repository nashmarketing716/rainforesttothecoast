// Rainforest to the Coast: menu, itinerary tabs, live events, UTM capture
(function () {
  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Itinerary tabs
  var tabs = document.querySelectorAll('[role=tab]');
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next); next.focus();
      }
    });
  });
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }

  // Hide sticky CTA when the form is on screen
  var sticky = document.querySelector('.sticky-cta');
  var hideFor = ['planner', 'plan'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  if (sticky && hideFor.length && 'IntersectionObserver' in window) {
    var vis = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { vis[e.target.id] = e.isIntersecting; });
      sticky.classList.toggle('hide', Object.keys(vis).some(function (k) { return vis[k]; }));
    }, { threshold: 0.15 });
    hideFor.forEach(function (el) { io.observe(el); });
  }

  // UTM + landing page capture into the lead form
  try {
    var params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
      var v = params.get(k) || sessionStorage.getItem(k);
      if (params.get(k)) sessionStorage.setItem(k, params.get(k));
      var f = document.querySelector('input[name=' + k + ']');
      if (f && v) f.value = v;
    });
    var lp = document.querySelector('input[name=landing_page]');
    if (lp) lp.value = location.href;
  } catch (e) {}

  // Live events from visitgraysharbor.com (proxied through Netlify at /api/events),
  // falling back to the bundled snapshot in /data/events.json
  var list = document.getElementById('events-list');
  if (list) {
    var t0 = new Date(); var today = t0.getFullYear() + '-' + String(t0.getMonth() + 1).padStart(2, '0') + '-' + String(t0.getDate()).padStart(2, '0');
    var q = '?per_page=12&start_date=' + today;
    function feed(url, label) {
      return fetchJSON(url).then(function (d) { return ((d && d.events) || []).map(function (e) { e._src = label; return e; }); })
        .catch(function () { return null; });
    }
    Promise.all([feed('/api/events' + q, 'Grays Harbor'), feed('/api/events-os' + q, 'Ocean Shores')]).then(function (r) {
      if (r[0] === null && r[1] === null) {
        return fetchJSON('/data/events.json').then(function (d) { return (d && d.events) || []; }).catch(function () { return []; });
      }
      return (r[0] || []).concat(r[1] || []);
    }).then(render);
  }
  function fetchJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function render(events) {
    var now = new Date().toISOString().slice(0, 10);
    // visitor-facing events only: drop civic meetings and set-up days, collapse multi-day repeats, soonest first
    var civic = /council|hearing|commission|town hall|board meeting|move[- ]?in|move[- ]?out|cancel+ed/i, seenT = {};
    events = events.filter(function (e) {
      var t = decode(e.title).replace(/,?\s*\d{4}$/, '').trim().toLowerCase();
      if (civic.test(e.title) || seenT[t]) return false;
      seenT[t] = true;
      return (e.end_date || e.start_date || '').slice(0, 10) >= now;
    }).sort(function (a, b) { return (a.start_date || '').localeCompare(b.start_date || ''); }).slice(0, 6);
    if (!events.length) {
      list.innerHTML = '<p class="muted center">There\'s always something happening. Browse the full calendar for festivals, markets and seasonal events.</p>';
      return;
    }
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    list.innerHTML = '';
    events.forEach(function (e) {
      var d = new Date((e.start_date || '').replace(' ', 'T'));
      var a = document.createElement('a');
      a.className = 'event';
      a.href = e.url; a.target = '_blank'; a.rel = 'noopener';
      var place = [e.venue && e.venue.venue, e.venue && e.venue.city].filter(Boolean);
      place = place.filter(function (v, i) { return place.indexOf(v) === i; }).join(', ');
      a.innerHTML = '<div class="date"><small>' + months[d.getMonth()] + '</small><b>' + d.getDate() + '</b></div>' +
        '<div><h3></h3><p></p></div>';
      a.querySelector('h3').textContent = decode(e.title);
      a.querySelector('p').textContent = (place || 'Grays Harbor') + (e._src ? ' · via ' + e._src : '');
      list.appendChild(a);
    });
  }
  function decode(s) { var t = document.createElement('textarea'); t.innerHTML = s || ''; return t.value; }

  var yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();
})();

// ---------- Road trip planner (plan logic lives in planner-core.js) ----------
(function () {
  var form = document.getElementById('planner-form');
  var out = document.getElementById('plan-out');
  if (!form || !out || !window.RTCPlan) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var p = RTCPlan.build({ start: fd.get('start'), days: +fd.get('days'), season: fd.get('season'), likes: fd.getAll('i') });
    var html = RTCPlan.toHTML(p);
    html += '<div class="plan-actions"><a class="btn" href="' + p.mapsUrl + '" target="_blank" rel="noopener">Open my route in Google Maps</a>' +
      '<a class="btn btn-ghost" href="#plan" id="plan-email">Email me this plan</a>' +
      '<button class="btn btn-ghost" type="button" onclick="window.print()">Print</button></div>' +
      '<p class="plan-note">Google Maps shows live drive times. Check road conditions and trailhead rules before you go.</p>';
    out.innerHTML = html; out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var set = function (n, v) { var el = document.querySelector('form.lead input[name=' + n + ']'); if (el) el.value = v; };
    window.RTC_LAST_PLAN = p;
    set('itinerary', p.summary);
    var dr = document.querySelector('form.lead input[name=trip_days][value="' + Math.max(2, p.nDays) + '"]'); if (dr) dr.checked = true; set('plan_start', p.start); set('plan_days', p.nDays); set('plan_season', p.season); set('plan_likes', p.likes.join(','));
    if (window.dataLayer) window.dataLayer.push({ event: 'trip_planned', days: p.nDays, start: p.start, season: p.season, interests: p.likes.join(',') });
  });
})();

// ---------- Hidden Gems map popup (Highway 1 style): 50% scroll, once a day, only if the map PDF exists ----------
(function () {
  var dlg = document.getElementById('map-pop');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  var KEY = 'rtc_map_pop', DAY = 864e5;
  try { if (Date.now() - (+localStorage.getItem(KEY) || 0) < DAY) return; } catch (e) {}
  fetch('/assets/rainforest-to-coast-map.pdf', { method: 'HEAD' }).then(function (r) {
    if (!r.ok || !/pdf/.test(r.headers.get('content-type') || '')) return;
    var fired = false;
    window.addEventListener('scroll', function onScroll() {
      var pct = (scrollY + innerHeight) / document.documentElement.scrollHeight;
      if (!fired && pct > 0.5) { fired = true; window.removeEventListener('scroll', onScroll); dlg.showModal(); }
    }, { passive: true });
  }).catch(function () {});
  function close() { dlg.close(); try { localStorage.setItem(KEY, Date.now()); } catch (e) {} }
  dlg.querySelector('.pop-close').addEventListener('click', close);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', function () { try { localStorage.setItem(KEY, Date.now()); } catch (e) {} });
  // copy UTM values into the popup form too
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) {
    var v = null; try { v = new URLSearchParams(location.search).get(k) || sessionStorage.getItem(k); } catch (e) {}
    var f = dlg.querySelector('input[name=' + k + ']'); if (f && v) f.value = v;
  });
  var lp = dlg.querySelector('input[name=landing_page]'); if (lp) lp.value = location.href;
})();

// ---------- Menu: underline the section you clicked / are viewing ----------
(function () {
  var links = [].slice.call(document.querySelectorAll('.main-nav a[href^="#"]:not(.btn)'));
  if (!links.length) return;
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  function setActive(id) { links.forEach(function (a) { a.classList.toggle('active', a === byId[id]); }); }
  links.forEach(function (a) { a.addEventListener('click', function () { setActive(a.getAttribute('href').slice(1)); }); });
  if (!('IntersectionObserver' in window)) return;
  var sections = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(function (s) { obs.observe(s); });
})();

// ---------- Lead form: remember name + interests for the thank-you page ----------
(function () {
  var f = document.querySelector('form.lead');
  if (!f) return;
  f.addEventListener('submit', function () {
    try {
      var ints = [].map.call(f.querySelectorAll('input[name="interests"]:checked'), function (i) { return i.value; });
      sessionStorage.setItem('rtc-lead', JSON.stringify({ name: (f.first_name.value || '').trim(), interests: ints,
        start: f.plan_start.value, days: (f.plan_likes.value && f.plan_days.value) || (f.querySelector('input[name=trip_days]:checked') || {}).value, season: f.plan_season.value, likes: f.plan_likes.value }));
    } catch (e) {}
  });
})();

// ---------- Video: big play button ----------
(function () {
  var v = document.getElementById('gh-video'); if (!v) return;
  var frame = v.parentNode, btn = frame.querySelector('.video-play');
  btn.addEventListener('click', function () { v.controls = true; v.play(); });
  v.addEventListener('play', function () { frame.classList.add('playing'); if (window.dataLayer) window.dataLayer.push({ event: 'video_play', video: 'gh-30' }); });
  v.addEventListener('ended', function () { frame.classList.remove('playing'); });
})();

// ---------- Menu video link: scroll to the video and start it ----------
(function () {
  var link = document.querySelector('.nav-video'), v = document.getElementById('gh-video');
  if (!link || !v) return;
  link.addEventListener('click', function () { v.controls = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); });
})();

// ---------- Hero: Rainforest "to the" Coast reveal slider ----------
(function () {
  var box = document.getElementById('rtc-reveal'); if (!box) return;
  var rng = box.querySelector('input'), l = box.querySelector('.rv-l'), r = box.querySelector('.rv-r'), touched = false, drag = false;
  function set(p) { p = Math.max(4, Math.min(96, p)); box.style.setProperty('--pos', p + '%'); rng.value = p; l.style.opacity = p < 24 ? 0 : 1; r.style.opacity = p > 76 ? 0 : 1; }
  function fromX(x) { var b = box.getBoundingClientRect(); return (x - b.left) / b.width * 100; }
  var handle = box.querySelector('.rv-handle');
  function nearLine(e) {
    var hb = handle.getBoundingClientRect();
    if (e.clientX >= hb.left - 6 && e.clientX <= hb.right + 6 && e.clientY >= hb.top - 6 && e.clientY <= hb.bottom + 6) return true;
    var b = box.getBoundingClientRect(), lineX = b.left + b.width * (+rng.value) / 100;
    return Math.abs(e.clientX - lineX) <= 28;
  }
  box.addEventListener('pointerdown', function (e) { if (!nearLine(e)) return; drag = true; touched = true; e.preventDefault(); });
  window.addEventListener('pointermove', function (e) { if (drag) set(fromX(e.clientX)); });
  window.addEventListener('pointerup', function () { drag = false; });
  window.addEventListener('pointercancel', function () { drag = false; });
  box.addEventListener('touchmove', function (e) { if (drag && e.touches[0]) set(fromX(e.touches[0].clientX)); }, { passive: true });
  rng.addEventListener('input', function () { touched = true; set(+rng.value); });
  set(50);
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  var seq = [[50, 0], [36, 700], [64, 1500], [50, 2200]];
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return; io.disconnect();
    var s = performance.now();
    (function step(n) {
      if (touched) return;
      var t = n - s, i = 1; while (i < seq.length && seq[i][1] < t) i++;
      if (i >= seq.length) { set(50); return; }
      var a = seq[i - 1], b = seq[i], k = (t - a[1]) / (b[1] - a[1]); k = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      set(a[0] + (b[0] - a[0]) * k); requestAnimationFrame(step);
    })(s);
  }, { threshold: .6 });
  setTimeout(function () { io.observe(box); }, 500);
})();

// ---------- Looping video strip: play only while on screen ----------
(function () {
  var vids = document.querySelectorAll('.loop-video'); if (!vids.length) return;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (still || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') { v.preload = 'auto'; v.load(); } var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { rootMargin: '200px 0px', threshold: 0.01 });
  vids.forEach(function (v) { io.observe(v); });
})();

// ---------- Vimeo: skip outdated parts of a segment (data-skip-from / data-skip-to, in seconds) ----------
(function () {
  var frames = document.querySelectorAll('iframe[data-skip-from]'); if (!frames.length) return;
  var loaded = false;
  function init() {
    frames.forEach(function (f) {
      var from = +f.getAttribute('data-skip-from'), to = +f.getAttribute('data-skip-to');
      var p = new Vimeo.Player(f), busy = false;
      p.on('timeupdate', function (d) {
        if (!busy && d.seconds >= from && d.seconds < to - 0.5) { busy = true; p.setCurrentTime(to).then(function () { busy = false; }, function () { busy = false; }); }
      });
    });
  }
  function load() {
    if (loaded) return; loaded = true;
    var s = document.createElement('script'); s.src = 'https://player.vimeo.com/api/player.js'; s.onload = init; document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); } }, { rootMargin: '400px 0px' });
    frames.forEach(function (f) { io.observe(f); });
  } else load();
})();

// ---------- TV videos with a custom thumbnail: tap to hide it and play ----------
(function () {
  var posters = document.querySelectorAll('.tv-poster'); if (!posters.length) return;
  function withApi(cb) {
    if (window.Vimeo && Vimeo.Player) return cb();
    var s = document.querySelector('script[src*="player.vimeo.com/api/player.js"]');
    if (!s) { s = document.createElement('script'); s.src = 'https://player.vimeo.com/api/player.js'; document.head.appendChild(s); }
    s.addEventListener('load', cb);
  }
  posters.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.parentNode.querySelector('iframe'); b.classList.add('gone');
      if (/youtube/.test(f.src)) { f.src += (f.src.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1'; return; }
      withApi(function () { try { new Vimeo.Player(f).play().catch(function () {}); } catch (e) {} });
    });
  });
})();

// ---------- "Email me this plan": carry the planner's choices into the form ----------
(function () {
  var f = document.querySelector('form.lead'); if (!f) return;
  var box = document.getElementById('plan-summary'), detail = document.getElementById('ps-detail');
  var days = f.querySelector('.days-pick'), ints = f.querySelector('input[name=interests]').closest('fieldset');
  var btn = f.querySelector('button[type=submit]'), btnText = btn.textContent;
  var LABEL = {}; [].forEach.call(document.querySelectorAll('#planner-form input[name=i]'), function (c) { LABEL[c.value] = c.nextElementSibling.textContent; });
  var TO_LEAD = {}; Object.keys(LABEL).forEach(function (k) { TO_LEAD[k] = [LABEL[k]]; });
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function exit() { f.classList.remove('plan-mode'); box.hidden = true; days.hidden = false; ints.hidden = false; btn.textContent = btnText; f.plan_likes.value = ''; }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#plan-email')) return;
    var p = window.RTC_LAST_PLAN; if (!p) return;
    var r = f.querySelector('input[name=trip_days][value="' + Math.max(2, p.nDays) + '"]'); if (r) r.checked = true;
    f.querySelectorAll('input[name=interests]').forEach(function (c) { c.checked = false; });
    p.likes.forEach(function (l) { (TO_LEAD[l] || []).forEach(function (v) { var c = f.querySelector('input[name=interests][value="' + v + '"]'); if (c) c.checked = true; }); });
    detail.textContent = p.nDays + (p.nDays === 1 ? ' day' : ' days') + ' from ' + p.start + ' · ' + cap(p.season) + ' · ' + p.likes.map(function (l) { return LABEL[l] || l; }).join(', ');
    f.classList.add('plan-mode'); box.hidden = false; days.hidden = true; ints.hidden = true; btn.textContent = 'Email me my plan';
    setTimeout(function () { try { f.first_name.focus({ preventScroll: true }); } catch (x) {} }, 600);
  });
  document.getElementById('ps-change').addEventListener('click', exit);
})();
