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
  var plan = document.getElementById('plan');
  if (sticky && plan && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sticky.classList.toggle('hide', entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(plan);
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

// ---------- Road trip planner ----------
(function () {
  var form = document.getElementById('planner-form');
  var out = document.getElementById('plan-out');
  if (!form || !out) return;
  var U = 'https://visitgraysharbor.com/wp-content/uploads/';

  // Regions in loop order. Only public places, parks, towns and nonprofits; no private businesses.
  var R = {
    east: { name: 'East County', towns: 'Elma · McCleary · Montesano', stop: 'Montesano, WA',
      img: U + '2025/03/VGH-CSR-2024-WYNOOCHEE-9.webp', link: 'https://visitgraysharbor.com/eastern-county/',
      acts: { rainforest: ['Hike the riverside trails at Friends Landing near Montesano', 'Detour north of Montesano to the falls at Lake Wynoochee'],
              family: ['Picnic and fish at Friends Landing'], history: ['See the historic Grays Harbor County Courthouse in Montesano, the county seat'],
              any: ['Stretch your legs in Montesano, the gateway from I-5'] },
      season: { summer: 'Summer events: the McCleary Bear Festival (July) and the Grays Harbor County Fair in Elma (August).' } },
    port: { name: 'Port Cities', towns: 'Aberdeen · Hoquiam · Cosmopolis', stop: 'Aberdeen, WA',
      img: U + '2024/08/Historic-Homes-5.webp', link: 'https://visitgraysharbor.com/port-cities/',
      acts: { history: ['Walk past the downtown murals and timber-baron homes in Aberdeen', 'Catch a show in the historic 7th Street Theatre district in Hoquiam'],
              wildlife: ['Walk the boardwalk at Grays Harbor National Wildlife Refuge'],
              seafood: ['Find a local cafe, brewery or distillery downtown'],
              any: ['Grab coffee in Aberdeen before heading north on US-101'] },
      season: { spring: 'Spring: hundreds of thousands of shorebirds stop at the refuge during migration.', fall: 'Fall: shorebirds pass through the refuge again on their southbound migration.' } },
    quin: { name: 'Quinault Rain Forest', towns: 'Lake Quinault', stop: 'Lake Quinault, WA',
      img: U + '2024/08/Drone_Lake-Quinault_Family-Canoe.webp', link: 'https://visitgraysharbor.com/quinault/',
      acts: { rainforest: ['Hike the mossy rainforest trails around Lake Quinault', 'Drive the 30-mile loop around the lake'],
              wildlife: ['Watch for Roosevelt elk and bald eagles along the loop drive'],
              family: ['Picnic, swim or paddle at the lake'],
              history: ['Visit the Lake Quinault Museum'],
              any: ['Take in the "Valley of the Giants," home to the world\'s largest Sitka spruce'] },
      season: { winter: 'Winter: the rainforest lives up to its name. Pack rain gear and enjoy the empty trails.', summer: 'Summer: paddle and swim in the lake.' } },
    north: { name: 'Northern Beaches', towns: 'Seabrook · Pacific Beach · Ocean Shores', stop: 'Ocean Shores, WA', via: 'Seabrook, WA',
      img: U + '2024/09/Washington-Coast-Tide-Pooling-Sea-Stars-Damon-Point-Ocean-Shores.webp', link: 'https://visitgraysharbor.com/northern-beaches/',
      acts: { beaches: ['Explore the tide pools at Damon Point in Ocean Shores', 'Watch the sunset over the Pacific with a beach campfire'],
              seafood: ['Dig razor clams if a WDFW dig is open (license required)', 'Try surf fishing from the beach'],
              family: ['Bike on the hard-packed sand, fly kites and build sandcastles'],
              wildlife: ['Watch shorebirds at Damon Point'],
              any: ['Stroll Seabrook\'s town center and the beach trails'] },
      season: { winter: 'Winter: storm-watching season. Book a cozy cottage with an ocean view.', spring: 'Spring: razor clam digs are often open. Check the WDFW schedule.' } },
    south: { name: 'Southern Beaches', towns: 'Westport · Grayland', stop: 'Westport, WA', via: 'Grayland, WA',
      img: U + '2024/09/DJI_0012.webp', link: 'https://visitgraysharbor.com/southern-beaches/',
      acts: { seafood: ['Watch the charter boats come in at the Westport marina', 'Book a charter fishing trip out of Westport'],
              beaches: ['Surf, beachcomb and fly kites along the Westport and Grayland beaches'],
              wildlife: ['Go whale watching out of Westport'],
              history: ['Visit the Westport Maritime Museum'],
              any: ['Drive the Cranberry Coast through Grayland'] },
      season: { summer: 'Late June: the cranberry bogs blossom along the Cranberry Coast.', fall: 'Fall: watch the cranberry harvest on the Cranberry Coast.', winter: 'Winter: king tides and big surf in Westport.' } }
  };

  // Which regions each trip length covers, in driving order
  var PLANS = {
    1: [['quin', 'north']],
    2: [['port', 'quin'], ['north']],
    3: [['port'], ['quin'], ['north']],
    4: [['port', 'quin'], ['quin', 'north'], ['north'], ['south']],
    5: [['east', 'port'], ['port'], ['quin'], ['north'], ['south']]
  };
  var DAYTITLE = { 1: 'Rainforest to the Coast in a day' };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    var start = fd.get('start'), days = +fd.get('days'), season = fd.get('season');
    var likes = fd.getAll('i'); if (!likes.length) likes = ['rainforest', 'beaches'];
    var plan = PLANS[days];
    // swap in the Southern Beaches when seafood is the priority and the trip is short
    if (likes.indexOf('seafood') > -1 && likes.indexOf('beaches') === -1 && days >= 2 && days <= 3) {
      plan = plan.map(function (d) { return d.map(function (r) { return r === 'north' ? 'south' : r; }); });
    }
    var seen = {}, used = {}, html = '', text = [];
    html += '<h3 class="plan-title">' + (DAYTITLE[days] || 'Your ' + days + '-day Rainforest to the Coast road trip') + '</h3>';
    plan.forEach(function (regions, i) {
      var acts = [], tips = [];
      var quota = regions.length > 1 ? 2 : 3;
      regions.forEach(function (k) {
        var r = R[k], repeat = seen[k]; seen[k] = true;
        // the traveler's interests first, then everything else this region offers; never repeat an earlier day
        var cats = likes.concat(['any']).concat(Object.keys(r.acts).filter(function (c) { return likes.indexOf(c) === -1 && c !== 'any'; }));
        var mine = [];
        cats.forEach(function (l) {
          (r.acts[l] || []).forEach(function (x) { if (mine.indexOf(x) === -1 && acts.indexOf(x) === -1 && !used[x]) mine.push(x); });
        });
        acts = acts.concat(mine.slice(0, quota));
        if (r.season[season] && tips.indexOf(r.season[season]) === -1 && !repeat) tips.push(r.season[season]);
      });
      acts.forEach(function (a) { used[a] = true; });
      var main = R[regions[regions.length - 1]];
      var title = 'Day ' + (i + 1) + ' · ' + regions.map(function (k) { return R[k].name; }).filter(function (v, j, a) { return a.indexOf(v) === j; }).join(' → ');
      html += '<article class="plan-day"><img src="/.netlify/images?url=' + encodeURIComponent(main.img) + '&w=600&q=72" alt="" loading="lazy" decoding="async"><div><h4>' + title + '</h4>' +
        '<p class="muted" style="margin:0 0 .3rem">' + regions.map(function (k) { return R[k].towns; }).filter(function (v, j, a) { return a.indexOf(v) === j; }).join(' · ') + '</p>' +
        '<ul>' + acts.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ul>' +
        tips.map(function (t) { return '<p class="tip">' + t + '</p>'; }).join('') +
        '<a class="more" href="' + main.link + '" target="_blank" rel="noopener">More about ' + main.name + '</a></div></article>';
      text.push(title + ': ' + acts.join('; '));
    });

    // Google Maps route: start → stops in loop order → back to start
    var order = ['east', 'port', 'quin', 'north', 'south'], wps = [];
    order.forEach(function (k) { if (seen[k]) { if (R[k].via) wps.push(R[k].via); wps.push(R[k].stop); } });
    var url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(start) +
      '&destination=' + encodeURIComponent(start) + '&waypoints=' + encodeURIComponent(wps.join('|'));
    html += '<div class="plan-actions"><a class="btn" href="' + url + '" target="_blank" rel="noopener">Open my route in Google Maps</a>' +
      '<a class="btn btn-ghost" href="#plan" id="plan-email">Email me this plan</a>' +
      '<button class="btn btn-ghost" type="button" onclick="window.print()">Print</button></div>' +
      '<p class="plan-note">Google Maps shows live drive times. Check road conditions and trailhead rules before you go.</p>';
    out.innerHTML = html; out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });

    var summary = days + ' days from ' + start + ' (' + season + ', likes: ' + likes.join(', ') + ') | ' + text.join(' | ');
    var hid = document.querySelector('input[name=itinerary]'); if (hid) hid.value = summary;
    if (window.dataLayer) window.dataLayer.push({ event: 'trip_planned', days: days, start: start, season: season, interests: likes.join(',') });
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
      sessionStorage.setItem('rtc-lead', JSON.stringify({ name: (f.first_name.value || '').trim(), interests: ints }));
    } catch (e) {}
  });
})();
