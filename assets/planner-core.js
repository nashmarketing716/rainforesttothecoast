/* Rainforest to the Coast trip-plan builder. Shared by the website (trip planner + thank-you page)
   and the Netlify function that emails the plan, so all three always match. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RTCPlan = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var U = 'https://visitgraysharbor.com/wp-content/uploads/';
  var R = {
    east: { name: 'East County', towns: 'Elma · McCleary · Montesano', stop: 'Montesano, WA',
      img: U + '2025/03/VGH-CSR-2024-WYNOOCHEE-9.webp', link: 'https://visitgraysharbor.com/eastern-county/',
      acts: { rainforest: ['Hike the riverside trails at Friends Landing near Montesano', 'Detour north of Montesano to the falls at Lake Wynoochee'],
              river: ['Fish for salmon and steelhead on the Satsop and Wynoochee rivers', 'Cast from the banks of the Chehalis River at Friends Landing'],
              lakes: ['Paddle and swim at Lake Sylvia State Park near Montesano', 'Launch a boat or kayak on the reservoir at Lake Wynoochee'],
              biking: ['Ride the forest singletrack at Lake Sylvia State Park'],
              museums: ['See the historic Grays Harbor County Courthouse in Montesano, the county seat'],
              food: ['Grab lunch in downtown Montesano or Elma'],
              family: ['Picnic and fish at Friends Landing'],
              any: ['Stretch your legs in Montesano, the gateway from I-5'] },
      season: { summer: 'Summer events: the McCleary Bear Festival (July) and the Grays Harbor County Fair in Elma (August).' } },
    port: { name: 'Port Cities', towns: 'Aberdeen · Hoquiam · Cosmopolis', stop: 'Aberdeen, WA',
      img: U + '2024/08/Historic-Homes-5.webp', link: 'https://visitgraysharbor.com/port-cities/',
      acts: { museums: ['Visit the Kurt Cobain Museum and Kurt Cobain Memorial Park in Aberdeen', 'Tour the Polson Museum in Hoquiam', 'Walk past the downtown murals and timber-baron homes in Aberdeen', 'Catch a show in the historic 7th Street Theatre district in Hoquiam'],
              wildlife: ['Walk the boardwalk at Grays Harbor National Wildlife Refuge'],
              river: ['Fish for salmon where the Wishkah and Chehalis rivers meet the harbor'],
              food: ['Find a local cafe, brewery or distillery downtown'],
              family: ['Picnic at Kurt Cobain Memorial Park on the Wishkah River'],
              any: ['Grab coffee in Aberdeen before heading north on US-101'] },
      season: { spring: 'Spring: hundreds of thousands of shorebirds stop at the refuge during migration.', fall: 'Fall: shorebirds pass through the refuge again on their southbound migration.' } },
    quin: { name: 'Quinault Rain Forest', towns: 'Lake Quinault', stop: 'Lake Quinault, WA',
      img: U + '2024/08/Drone_Lake-Quinault_Family-Canoe.webp', link: 'https://visitgraysharbor.com/quinault/',
      acts: { rainforest: ['Hike the mossy rainforest trails around Lake Quinault', 'Drive the 30-mile loop around the lake'],
              lakes: ['Paddle, canoe or take a boat out on Lake Quinault', 'Swim off the lakeshore on a summer afternoon'],
              river: ['Fish the Humptulips River on the drive north'],
              biking: ['Mountain bike the forest roads of Olympic National Forest'],
              wildlife: ['Watch for Roosevelt elk and bald eagles along the loop drive'],
              museums: ['Visit the Lake Quinault Museum'],
              family: ['Picnic, swim or paddle at the lake'],
              any: ['Take in the "Valley of the Giants," home to the world\'s largest Sitka spruce'] },
      season: { winter: 'Winter: the rainforest lives up to its name. Pack rain gear and enjoy the empty trails.', summer: 'Summer: paddle and swim in the lake.' } },
    north: { name: 'Northern Beaches', towns: 'Seabrook · Pacific Beach · Ocean Shores', stop: 'Ocean Shores, WA', via: 'Seabrook, WA',
      img: U + '2024/09/Washington-Coast-Tide-Pooling-Sea-Stars-Damon-Point-Ocean-Shores.webp', link: 'https://visitgraysharbor.com/northern-beaches/',
      acts: { beaches: ['Explore the tide pools at Damon Point in Ocean Shores', 'Watch the sunset over the Pacific with a beach campfire'],
              clams: ['Dig razor clams if a WDFW dig is open (license required)'],
              food: ['Eat fresh-caught seafood in Ocean Shores'],
              charter: ['Try surf fishing from the beach'],
              lakes: ['Boat or paddle Duck Lake and the canals of Ocean Shores'],
              biking: ['Ride a fat-tire bike on the hard-packed sand'],
              museums: ['Visit the Coastal Interpretive Center in Ocean Shores'],
              river: ['Fish the Copalis River near the beach'],
              family: ['Bike on the hard-packed sand, fly kites and build sandcastles'],
              wildlife: ['Watch shorebirds at Damon Point'],
              any: ['Stroll Seabrook\'s town center and the beach trails'] },
      season: { winter: 'Winter: storm-watching season. Book a cozy cottage with an ocean view.', spring: 'Spring: razor clam digs are often open. Check the WDFW schedule.' } },
    south: { name: 'Southern Beaches', towns: 'Westport · Grayland', stop: 'Westport, WA', via: 'Grayland, WA',
      img: U + '2024/09/DJI_0012.webp', link: 'https://visitgraysharbor.com/southern-beaches/',
      acts: { charter: ['Book a charter fishing trip out of Westport', 'Watch the charter boats come in at the Westport marina'],
              food: ['Order fresh crab and fish at the Westport docks'],
              clams: ['Dig razor clams on the Twin Harbors beaches when a dig is open'],
              beaches: ['Surf, beachcomb and fly kites along the Westport and Grayland beaches'],
              biking: ['Ride the paved Dune Trail to the Westport lighthouse'],
              river: ['Fish the Johns River near Markham'],
              wildlife: ['Go whale watching out of Westport'],
              museums: ['Visit the Westport Maritime Museum'],
              lakes: ['Launch a boat from the Westport marina into Grays Harbor'],
              family: ['Climb the dunes and watch the waves from the Westport observation tower'],
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

  // Interests from the "Get free trip ideas" form, mapped to planner interests
  var LEAD_MAP = { 'Rainforest & hiking': 'rainforest', 'Beaches & surfing': 'beaches', 'Charter & ocean fishing': 'charter',
    'River fishing': 'river', 'Clam digging': 'clams', 'Fresh seafood & local food': 'food', 'Lakes & paddling': 'lakes',
    'Mountain biking': 'biking', 'Lakes, boating & paddling': 'lakes', 'Museums & history': 'museums', 'Wildlife & birding': 'wildlife', 'Kids & dogs': 'family',
    // older form labels
    'Rainforest hiking': 'rainforest', 'Beaches': 'beaches', 'Fishing & clamming': 'charter', 'Food & drink': 'food', 'Events': null, 'History & arts': 'museums' };
  var OLD = { seafood: ['charter', 'clams', 'food'], history: ['museums'] };
  function seasonFor(d) { var m = (d || new Date()).getMonth(); return m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'fall'; }

  function build(o) {
    var start = o.start || 'Seattle, WA', days = Math.min(5, Math.max(1, +o.days || 3)), season = o.season || seasonFor();
    var likes = [];
    (o.likes || []).forEach(function (l) { (OLD[l] || [l]).forEach(function (x) { if (x && likes.indexOf(x) === -1) likes.push(x); }); });
    if (!likes.length) likes = ['rainforest', 'beaches'];
    var plan = PLANS[days];
    if ((likes.indexOf('charter') > -1 || likes.indexOf('food') > -1) && likes.indexOf('beaches') === -1 && days >= 2 && days <= 3) {
      plan = plan.map(function (d) { return d.map(function (r) { return r === 'north' ? 'south' : r; }); });
    }
    var seen = {}, used = {}, out = [], text = [];
    plan.forEach(function (regions, i) {
      var acts = [], tips = [];
      var quota = regions.length > 1 ? 2 : 3;
      regions.forEach(function (k) {
        var r = R[k], repeat = seen[k]; seen[k] = true;
        var mine = [], ok = function (x) { return mine.indexOf(x) === -1 && acts.indexOf(x) === -1 && !used[x]; };
        // take the liked activities in turn, one from each interest, so every pick shows up
        var pools = likes.map(function (l) { return (r.acts[l] || []).filter(ok); });
        for (var n = 0; pools.some(function (q) { return q.length > n; }); n++) pools.forEach(function (q) { if (q[n] && ok(q[n])) mine.push(q[n]); });
        ['any'].concat(Object.keys(r.acts).filter(function (c) { return likes.indexOf(c) === -1 && c !== 'any'; }))
          .forEach(function (l) { (r.acts[l] || []).forEach(function (x) { if (ok(x)) mine.push(x); }); });
        acts = acts.concat(mine.slice(0, quota));
        if (r.season[season] && tips.indexOf(r.season[season]) === -1 && !repeat) tips.push(r.season[season]);
        var CLAM = 'Razor clam digs open only on set dates. Check the WDFW schedule and get a shellfish license before you go.';
        if (likes.indexOf('clams') > -1 && (k === 'north' || k === 'south') && !seen.clamTip) { seen.clamTip = true; tips.push(CLAM); }
      });
      acts.forEach(function (a) { used[a] = true; });
      var main = R[regions[regions.length - 1]];
      var uniq = function (v, j, a) { return a.indexOf(v) === j; };
      var title = 'Day ' + (i + 1) + ' · ' + regions.map(function (k) { return R[k].name; }).filter(uniq).join(' → ');
      out.push({ title: title, towns: regions.map(function (k) { return R[k].towns; }).filter(uniq).join(' · '),
        acts: acts, tips: tips, img: main.img, link: main.link, name: main.name });
      text.push(title + ': ' + acts.join('; '));
    });
    var order = ['east', 'port', 'quin', 'north', 'south'], wps = [];
    order.forEach(function (k) { if (seen[k]) { if (R[k].via) wps.push(R[k].via); wps.push(R[k].stop); } });
    var url = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(start) +
      '&destination=' + encodeURIComponent(start) + '&waypoints=' + encodeURIComponent(wps.join('|'));
    return { title: DAYTITLE[days] || 'Your ' + days + '-day Rainforest to the Coast road trip', days: out, mapsUrl: url,
      start: start, nDays: days, season: season, likes: likes,
      summary: days + ' days from ' + start + ' (' + season + ', likes: ' + likes.join(', ') + ') | ' + text.join(' | ') };
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function imgUrl(src, site) { return (site || '') + '/.netlify/images?url=' + encodeURIComponent(src) + '&w=600&q=72'; }

  // Same markup the website planner shows
  function toHTML(p) {
    var h = '<h3 class="plan-title">' + esc(p.title) + '</h3>';
    p.days.forEach(function (d) {
      h += '<article class="plan-day"><img src="' + imgUrl(d.img) + '" alt="" loading="lazy" decoding="async"><div><h4>' + esc(d.title) + '</h4>' +
        '<p class="muted" style="margin:0 0 .3rem">' + esc(d.towns) + '</p><ul>' + d.acts.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
        d.tips.map(function (t) { return '<p class="tip">' + esc(t) + '</p>'; }).join('') +
        '<a class="more" href="' + d.link + '" target="_blank" rel="noopener">More about ' + esc(d.name) + '</a></div></article>';
    });
    return h;
  }

  // Email version (inline styles, table layout for email clients)
  function toEmail(p, name, site) {
    site = site || 'https://www.rainforesttothecoast.com';
    var B = '#0D4D6D', T = '#0D6863', G = '#65BC7B';
    var h = '<!doctype html><html><body style="margin:0;background:#eef5f4;font-family:Arial,Helvetica,sans-serif;color:#22333b">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef5f4"><tr><td align="center" style="padding:24px 12px">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">' +
      '<tr><td style="background:' + B + ';padding:22px 28px;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px">RAINFOREST <span style="color:' + G + ';font-style:italic;font-weight:normal">to the</span> COAST</td></tr>' +
      '<tr><td style="padding:26px 28px 8px"><p style="margin:0 0 10px;font-size:17px">Hi ' + esc(name || 'there') + ',</p>' +
      '<p style="margin:0 0 6px;font-size:16px;line-height:1.5">Thanks for reaching out! Here\'s your road trip guide, built around what you told us you love. Grays Harbor is about 2 hours from Seattle and 2½ hours from Portland.</p>' +
      '<h2 style="margin:18px 0 4px;color:' + B + ';font-size:24px">' + esc(p.title) + '</h2></td></tr>';
    p.days.forEach(function (d) {
      h += '<tr><td style="padding:12px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dde8e7;border-radius:12px;overflow:hidden">' +
        '<tr><td><img src="' + imgUrl(d.img, site) + '" width="544" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>' +
        '<tr><td style="padding:16px 18px"><h3 style="margin:0 0 4px;color:' + B + ';font-size:19px">' + esc(d.title) + '</h3>' +
        '<p style="margin:0 0 8px;color:#5b6b73;font-size:14px">' + esc(d.towns) + '</p><ul style="margin:0 0 8px;padding-left:20px;font-size:15px;line-height:1.5">' +
        d.acts.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
        d.tips.map(function (t) { return '<p style="margin:0 0 8px;color:' + T + ';font-size:14px;font-weight:bold">' + esc(t) + '</p>'; }).join('') +
        '<a href="' + d.link + '" style="color:' + B + ';font-weight:bold;font-size:15px">More about ' + esc(d.name) + ' &rarr;</a></td></tr></table></td></tr>';
    });
    h += '<tr><td align="center" style="padding:18px 28px 6px"><a href="' + p.mapsUrl + '" style="display:inline-block;background:' + T + ';color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:10px;font-size:16px">Open my route in Google Maps</a></td></tr>' +
      '<tr><td align="center" style="padding:6px 28px 22px"><a href="' + site + '/#planner" style="color:' + B + ';font-size:14px">Change the days or interests on the trip planner</a></td></tr>' +
      '<tr><td style="padding:16px 28px 24px;border-top:1px solid #e5eeed;color:#5b6b73;font-size:12px;line-height:1.5">Google Maps shows live drive times. Check road conditions and trailhead rules before you go.<br>' +
      'Rainforest to the Coast is a partnership of Grays Harbor Tourism, Ocean Shores and Westport. Questions? Reply to this email or write to info@visitgraysharbor.com.</td></tr>' +
      '</table></td></tr></table></body></html>';
    return h;
  }

  function toText(p, name) {
    var t = 'Hi ' + (name || 'there') + ',\n\nThanks for reaching out! Here\'s your road trip guide.\n\n' + p.title + '\n\n';
    p.days.forEach(function (d) { t += d.title + ' (' + d.towns + ')\n' + d.acts.map(function (a) { return '- ' + a; }).join('\n') + '\n' + d.tips.join('\n') + (d.tips.length ? '\n' : '') + 'More: ' + d.link + '\n\n'; });
    return t + 'Your route in Google Maps: ' + p.mapsUrl + '\n\nQuestions? Reply to this email or write to info@visitgraysharbor.com.\n';
  }

  return { R: R, build: build, toHTML: toHTML, toEmail: toEmail, toText: toText, LEAD_MAP: LEAD_MAP, seasonFor: seasonFor };
});
