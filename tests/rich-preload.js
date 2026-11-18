// Test-only preload (node -r ./tests/rich-preload.js server.js): every new player starts with plenty of gold, so shop flows can be tested end to end.
const eco = require('../economy'), view = eco.view;
eco.view = (p, now) => { eco.ensure(p, now); if (!p.eco.rich) { p.eco.rich = 1; p.eco.gold = 60000; } return view(p, now); };
