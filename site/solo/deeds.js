/* Sacrament RPG solo: deeds and each hero's record, read from the Chronicle (the finished roads kept in this browser).
   Nothing here changes a rule or a hero: a deed is a mark of something done on the road, for the player to chase on another run (the owner's ask, 2026-11-07:
   "some form of progression ... makes you keep coming back"). Pure: no DOM, no storage. */
(function (root) {
  'use strict';
  /* A Chronicle entry: { hero, to, end ('won' | 'dead' | 'fled'), at, of, peak, date, places: [scene ids], beaten: [foe names], met: [friend ids], used: [names], escapes, hard, ending (the name of how the last place ended, since 2026-11-10) } */
  function won(e) { return e.end === 'won'; }
  function n(l) { return (l || []).length; }
  var DEEDS = [
    { id: 'home', name: 'Came home', hint: 'Finish a road alive.', test: function (l) { return l.some(won); } },
    { id: 'fell', name: 'Buried by the road', hint: 'Fall on the road. Everyone does, once.', test: function (l) { return l.some(function (e) { return e.end === 'dead'; }); } },
    { id: 'steady', name: 'Steady hands', hint: 'Finish a road with the Horror never reaching 7.', test: function (l) { return l.some(function (e) { return won(e) && e.peak < 7; }); } },
    { id: 'arrived', name: 'Looked it in the eye', hint: 'Reach Horror 21 and still come home.', test: function (l) { return l.some(function (e) { return won(e) && e.peak >= 21; }); } },
    { id: 'slayer', name: 'Five in the ground', hint: 'Beat five foes on one road.', test: function (l) { return l.some(function (e) { return n(e.beaten) >= 5; }); } },
    { id: 'runner', name: 'Lived to tell it', hint: 'Get away from a scene and still come home.', test: function (l) { return l.some(function (e) { return won(e) && e.escapes > 0; }); } },
    { id: 'tools', name: 'Every tool to hand', hint: 'Put three different spells or items to use on one road.', test: function (l) { return l.some(function (e) { return n(e.used) >= 3; }); } },
    { id: 'company', name: 'Good company', hint: 'Spend time with three friends of the road on one road.', test: function (l) { return l.some(function (e) { return n(e.met) >= 3; }); } },
    { id: 'friends', name: 'Known on every road', hint: 'Over your roads, spend time with every friend of the road.', test: function (l, w) { var met = {}; l.forEach(function (e) { (e.met || []).forEach(function (id) { met[id] = true; }); }); return w.friends.length > 0 && w.friends.every(function (id) { return met[id]; }); } },
    { id: 'ends', name: 'Every end of the road', hint: 'Come home from each of the three last places.', test: function (l, w) { var done = {}; l.forEach(function (e) { if (won(e)) (e.places || []).forEach(function (id) { done[id] = true; }); }); return w.finales.length > 0 && w.finales.every(function (id) { return done[id]; }); } },
    { id: 'endings', name: 'Many ends', hint: 'Come home by five different endings.', test: function (l) { var seen = {}; l.forEach(function (e) { if (won(e) && e.ending) seen[e.ending] = true; }); return Object.keys(seen).length >= 5; } },
    { id: 'walked', name: 'Walked it all', hint: 'Over your roads, see every place on the pilgrim road.', test: function (l, w) { var seen = {}; l.forEach(function (e) { (e.places || []).forEach(function (id) { seen[id] = true; }); }); return w.places.length > 0 && w.places.every(function (id) { return seen[id]; }); } },
    { id: 'hard', name: 'The Hard Road home', hint: 'Come home by the Hard Road.', test: function (l) { return l.some(function (e) { return won(e) && e.hard; }); } },
    { id: 'ten', name: 'Ten roads', hint: 'Walk the road ten times, whatever the end.', test: function (l) { return l.length >= 10; } }
  ];
  /* w = the world the deeds are measured against: { friends: [ids], finales: [scene ids], places: [scene ids] } */
  function earned(list, w) { w = w || { friends: [], finales: [], places: [] }; return DEEDS.filter(function (d) { return d.test(list || [], w); }).map(function (d) { return d.id; }); }
  /* the deeds a just-finished road brought: earned now, and not before it */
  function fresh(list, w) { var before = earned((list || []).slice(1), w); return earned(list, w).filter(function (id) { return before.indexOf(id) < 0; }); }
  /* each hero's record, by name: roads walked, came home, foes beaten, highest Horror */
  function record(list) {
    var by = {}, order = [];
    (list || []).forEach(function (e) {
      var r = by[e.hero]; if (!r) { r = by[e.hero] = { hero: e.hero, roads: 0, home: 0, beaten: 0, peak: 0 }; order.push(e.hero); }
      r.roads++; if (won(e)) r.home++; r.beaten += n(e.beaten); r.peak = Math.max(r.peak, e.peak || 0);
    });
    return order.map(function (h) { return by[h]; });
  }
  function byId(id) { return DEEDS.filter(function (d) { return d.id === id; })[0] || null; }
  root.SacramentSoloDeeds = { DEEDS: DEEDS, earned: earned, fresh: fresh, record: record, byId: byId };
})(typeof window !== 'undefined' ? window : globalThis);
