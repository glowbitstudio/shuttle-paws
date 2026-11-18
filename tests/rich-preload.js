// Test-only preload (node -r ./tests/rich-preload.js server.js): every new player starts with plenty of gold, so shop flows can be tested end to end.
const eco = require('../economy'), view = eco.view;
eco.view = (p, now) => { eco.ensure(p, now); if (!p.eco.rich) { p.eco.rich = 1; p.eco.gold = 60000; p.eco.gems = 2000; p.eco.shards = 500; if (process.env.RICH_XP) { p.eco.xp = +process.env.RICH_XP; p.eco.free = { c0: 2, c1: 1 }; } } return view(p, now); };   // RICH_XP: start at that experience with free chests waiting
