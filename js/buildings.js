'use strict';
/* METROPOLIS – static game data: roads, zones, buildings, tiers, policies, achievements, scenarios */
(function () {
  // ---- roads ----
  M.ROADS = [null,
    { id: 1, key: 'dirt', name: 'Dirt Road', cost: 8, upkeep: 0.15, speed: 0.55, cap: 160, w: 0.34, tier: 0, desc: 'Cheap and slow. Fine for a village; cannot bridge water.' },
    { id: 2, key: 'street', name: 'Two-Lane Street', cost: 20, upkeep: 0.6, speed: 1, cap: 520, w: 0.5, tier: 0, desc: 'The standard neighbourhood street.' },
    { id: 3, key: 'avenue', name: 'Four-Lane Avenue', cost: 45, upkeep: 1.3, speed: 1.3, cap: 1250, w: 0.74, tier: 1, lights: true, desc: 'Carries more than twice the traffic of a street. Signalised intersections.' },
    { id: 4, key: 'boulevard', name: 'Boulevard', cost: 70, upkeep: 1.9, speed: 1.4, cap: 1900, w: 0.88, tier: 2, lights: true, desc: 'Tree-lined median, high capacity, and it raises nearby land value.' },
    { id: 5, key: 'oneway', name: 'One-Way Street', cost: 24, upkeep: 0.6, speed: 1.2, cap: 820, w: 0.5, tier: 1, desc: 'Traffic flows in the direction you drag. More capacity than a street.' },
    { id: 6, key: 'highway', name: 'Highway', cost: 120, upkeep: 3.2, speed: 2.4, cap: 4200, w: 0.8, tier: 3, noAccess: true, desc: 'Fast, loud, and buildings cannot front onto it.' },
    { id: 7, key: 'path', name: 'Pedestrian Path', cost: 6, upkeep: 0.05, speed: 0.2, cap: 0, w: 0.22, tier: 0, ped: true, desc: 'For walking only. Pleasant paths raise land value a little.' }
  ];
  M.BRIDGE_COST = 5; M.BRIDGE_UPKEEP = 3;

  // ---- zones ----
  M.Z = { R: 1, C: 2, I: 3 };
  M.ZNAME = ['', 'Residential', 'Commercial', 'Industrial'];
  M.ZCOL = ['', '#4caf50', '#3d8bfd', '#e0a526'];
  M.ZCOST = [0, 2, 5, 10];
  M.DENS_TIER = [0, 0, 1, 3];
  M.DENS_NAME = ['', 'Low density', 'Medium density', 'High density'];
  // per zone type: indexed by level 1..5
  M.ZB = [null,
    { names: ['', 'House', 'Townhouses', 'Apartment Block', 'Apartment Complex', 'Residential Tower'], cap: [0, 8, 22, 64, 230, 620], size: [0, 1, 1, 1, 2, 2], dens: [0, 1, 1, 2, 3, 3], des: [0, 0.12, 0.24, 0.36, 0.48, 0.6] },
    { names: ['', 'Corner Shop', 'Shops & Restaurant', 'Office Building', 'Shopping Centre', 'Office Tower'], cap: [0, 6, 14, 42, 150, 430], size: [0, 1, 1, 1, 2, 2], dens: [0, 1, 1, 2, 3, 3], des: [0, 0.12, 0.24, 0.36, 0.48, 0.6], noise: [0, 3, 5, 6, 12, 8] },
    { names: ['', 'Workshop', 'Warehouse', 'Factory', 'Heavy Industry', 'High-Tech Campus'], cap: [0, 8, 20, 70, 160, 200], size: [0, 1, 1, 2, 2, 2], dens: [0, 1, 1, 2, 3, 3], des: [0, 0.1, 0.18, 0.26, 0.3, 0.42], air: [0, 4, 6, 20, 46, 3], gnd: [0, 2, 3, 12, 30, 1], noise: [0, 6, 8, 16, 26, 5] }
  ];
  M.USE = { // per resident / per job
    power: [0, 0.005, 0.009, 0.016], water: [0, 0.15, 0.08, 0.2], garbage: [0, 0.03, 0.035, 0.05]
  };

  // ---- placeable buildings ----
  const D = M.DEFS = {};
  function def(id, o) { o.id = id; o.size = o.size || 1; o.tier = o.tier || 0; D[id] = o; }
  // electricity
  def('coal', { name: 'Coal Power Plant', cat: 'power', dept: 'power', size: 3, cost: 9000, upkeep: 420, power: 120, jobs: 30, air: 70, gnd: 25, noise: 30, lv: -18, lvr: 8, up: 1, desc: 'Cheap, dependable and filthy. 120 MW.' });
  def('wind', { name: 'Wind Turbine', cat: 'power', dept: 'power', cost: 2400, upkeep: 60, power: 8, noise: 8, wind: true, desc: 'Clean power, 3–8 MW depending on the weather.' });
  def('gas', { name: 'Gas Power Plant', cat: 'power', dept: 'power', size: 2, cost: 14000, upkeep: 640, tier: 1, power: 90, jobs: 20, air: 22, noise: 20, lv: -10, lvr: 6, up: 1, desc: 'Much cleaner than coal, but costly to run. 90 MW.' });
  def('solar', { name: 'Solar Farm', cat: 'power', dept: 'power', size: 2, cost: 8500, upkeep: 140, tier: 2, power: 24, solar: true, desc: 'Silent and clean. Up to 24 MW; less under cloud and rain.' });
  def('nuclear', { name: 'Nuclear Power Plant', cat: 'power', dept: 'power', size: 3, cost: 95000, upkeep: 3400, tier: 4, power: 900, jobs: 80, noise: 15, lv: -12, lvr: 10, useWater: 60, desc: 'Enormous clean output: 900 MW. Very expensive and needs water.' });
  def('pline', { name: 'Power Line', cat: 'power', dept: 'power', cost: 10, upkeep: 0.2, line: true, desc: 'Carries electricity across open land. Roads carry power too.' });
  // water & waste
  def('pump', { name: 'Water Pump', cat: 'water', dept: 'water', cost: 1500, upkeep: 70, water: 700, usePower: 0.4, nearWater: true, up: 1, desc: 'Must stand within 2 tiles of water. Polluted water cuts its output.' });
  def('wtower', { name: 'Water Tower', cat: 'water', dept: 'water', cost: 1100, upkeep: 50, water: 260, up: 1, desc: 'Draws groundwater anywhere on land. Small capacity.' });
  def('wtreat', { name: 'Water Treatment Plant', cat: 'water', dept: 'water', size: 2, cost: 8500, upkeep: 340, tier: 2, water: 1600, treat: true, usePower: 1.5, jobs: 15, up: 1, desc: 'Large supply and it neutralises water pollution for the whole network.' });
  def('sewage', { name: 'Sewage Treatment Plant', cat: 'water', dept: 'water', size: 2, cost: 7000, upkeep: 320, tier: 2, sewage: 3000, usePower: 1.2, jobs: 15, air: 8, noise: 6, lv: -8, lvr: 5, up: 1, desc: 'Treats 3,000 units of sewage. Untreated sewage pollutes the water.' });
  def('landfill', { name: 'Landfill', cat: 'water', dept: 'waste', size: 2, cost: 2500, upkeep: 160, tier: 1, garbage: 160, store: 22000, jobs: 10, air: 14, gnd: 40, noise: 8, lv: -20, lvr: 7, desc: 'Collects 160 t of garbage a month until it is full.' });
  def('recycle', { name: 'Recycling Centre', cat: 'water', dept: 'waste', size: 2, cost: 9000, upkeep: 380, tier: 2, garbage: 140, usePower: 1, jobs: 25, noise: 12, lv: -5, lvr: 4, up: 1, desc: 'Processes 140 t a month and never fills up.' });
  // public services
  def('fire', { name: 'Fire Station', cat: 'service', dept: 'fire', size: 2, cost: 3200, upkeep: 230, tier: 1, jobs: 20, cover: { k: 'fire', r: 15, s: 1 }, trucks: 2, usePower: 0.3, lv: 3, lvr: 6, up: 1, desc: 'Cuts fire risk nearby and sends trucks along your roads to put fires out.' });
  def('police', { name: 'Police Station', cat: 'service', dept: 'police', size: 2, cost: 3500, upkeep: 260, tier: 1, jobs: 25, cover: { k: 'police', r: 15, s: 1 }, usePower: 0.3, lv: 3, lvr: 6, up: 1, desc: 'Suppresses crime in its patrol area.' });
  def('clinic', { name: 'Clinic', cat: 'service', dept: 'health', cost: 1800, upkeep: 180, tier: 1, jobs: 12, cover: { k: 'health', r: 11, s: 0.8 }, cap: 3000, usePower: 0.2, lv: 3, lvr: 5, up: 1, desc: 'Basic healthcare for 3,000 residents.' });
  def('hospital', { name: 'Hospital', cat: 'service', dept: 'health', size: 3, cost: 16000, upkeep: 1150, tier: 3, jobs: 120, cover: { k: 'health', r: 22, s: 1 }, cap: 16000, usePower: 2, useWater: 20, noise: 6, lv: 5, lvr: 8, up: 1, desc: 'Full healthcare for 16,000 residents over a wide area.' });
  def('elem', { name: 'Elementary School', cat: 'service', dept: 'edu', size: 2, cost: 2600, upkeep: 250, tier: 1, jobs: 18, cover: { k: 'edu', r: 12, s: 1 }, seats: 320, usePower: 0.3, lv: 5, lvr: 6, up: 1, desc: '320 seats. The first step out of an uneducated workforce.' });
  def('high', { name: 'High School', cat: 'service', dept: 'edu', size: 2, cost: 5200, upkeep: 430, tier: 2, jobs: 30, cover: { k: 'edu2', r: 18, s: 1 }, seats2: 520, usePower: 0.5, lv: 5, lvr: 6, up: 1, desc: '520 seats. Needed for offices and skilled industry.' });
  def('uni', { name: 'University', cat: 'service', dept: 'edu', size: 3, cost: 22000, upkeep: 1500, tier: 3, jobs: 140, seats3: 1500, usePower: 2, lv: 8, lvr: 9, up: 1, desc: '1,500 students city-wide. Unlocks high-tech industry and tall offices.' });
  def('library', { name: 'Library', cat: 'service', dept: 'edu', size: 2, cost: 3000, upkeep: 180, tier: 2, jobs: 8, cover: { k: 'edu', r: 9, s: 0.4 }, lib: true, usePower: 0.2, lv: 6, lvr: 6, desc: 'Adults keep learning, and neighbours love it.' });
  def('cemetery', { name: 'Cemetery', cat: 'service', dept: 'health', size: 2, cost: 2200, upkeep: 80, tier: 2, graves: 2600, lv: 2, lvr: 4, desc: 'Room for 2,600 graves. Plots are slowly reused.' });
  // transport
  def('busstop', { name: 'Bus Stop', cat: 'transit', dept: 'transit', cost: 250, upkeep: 12, tier: 2, bus: true, nearRoad: true, desc: 'Serves homes and jobs within 5 tiles. Needs a depot on the same road network.' });
  def('busdepot', { name: 'Bus Depot', cat: 'transit', dept: 'transit', size: 2, cost: 4500, upkeep: 320, tier: 2, jobs: 30, buses: 6, noise: 10, lv: -3, lvr: 4, usePower: 0.5, up: 1, desc: 'Runs 6 buses between the stops on its road network.' });
  def('train', { name: 'Train Station', cat: 'transit', dept: 'transit', size: 2, cost: 14000, upkeep: 650, tier: 3, jobs: 30, noise: 18, lv: 4, lvr: 6, usePower: 1, regional: 0.08, desc: 'A regional rail link: more people and customers want to come.' });
  def('cargo', { name: 'Cargo Terminal', cat: 'transit', dept: 'transit', size: 3, cost: 20000, upkeep: 850, tier: 3, jobs: 90, noise: 26, air: 10, lv: -10, lvr: 7, usePower: 2, cargo: true, desc: 'Industry exports through here: more industrial demand and income.' });
  def('airport', { name: 'Airport', cat: 'transit', dept: 'transit', size: 4, cost: 70000, upkeep: 3000, tier: 4, jobs: 300, noise: 60, air: 18, lv: -14, lvr: 12, usePower: 6, air_port: true, desc: 'Business travel and tourism boost commerce. Very noisy.' });
  // parks
  def('park', { name: 'Small Park', cat: 'park', dept: 'parks', cost: 300, upkeep: 16, cover: { k: 'park', r: 6, s: 0.6 }, green: 6, desc: 'A pocket of green. Raises land value and happiness nearby.' });
  def('plaza', { name: 'Plaza', cat: 'park', dept: 'parks', cost: 450, upkeep: 18, tier: 1, cover: { k: 'park', r: 5, s: 0.5 }, lv: 6, lvr: 4, desc: 'A paved square with a fountain; great beside shops.' });
  def('bigpark', { name: 'City Park', cat: 'park', dept: 'parks', size: 2, cost: 1600, upkeep: 65, tier: 2, cover: { k: 'park', r: 10, s: 1 }, green: 14, desc: 'A large park with a pond.' });
  def('field', { name: 'Sports Field', cat: 'park', dept: 'parks', size: 2, cost: 2000, upkeep: 90, tier: 2, cover: { k: 'park', r: 11, s: 0.8 }, health: 0.02, noise: 5, desc: 'Sport makes citizens a little healthier and happier.' });
  def('stadium', { name: 'Stadium', cat: 'park', dept: 'parks', size: 3, cost: 26000, upkeep: 1200, tier: 3, jobs: 60, cover: { k: 'park', r: 24, s: 1 }, health: 0.03, noise: 30, usePower: 3, commerce: 0.05, desc: 'City-wide entertainment. Boosts commerce; neighbours hear every goal.' });
  // decorations
  def('tree', { name: 'Plant Trees', cat: 'deco', cost: 12, deco: 'tree', desc: 'Trees clean the air and raise land value.' });
  def('flowers', { name: 'Flower Bed', cat: 'deco', dept: 'parks', cost: 60, upkeep: 2, cover: { k: 'park', r: 3, s: 0.25 }, desc: 'A small splash of colour.' });
  def('fountain', { name: 'Fountain', cat: 'deco', dept: 'parks', cost: 350, upkeep: 8, cover: { k: 'park', r: 4, s: 0.4 }, lv: 5, lvr: 3, desc: 'An animated fountain.' });
  def('statue', { name: 'Statue', cat: 'deco', dept: 'parks', cost: 500, upkeep: 4, lv: 7, lvr: 4, desc: 'A monument to a mayor yet to be named.' });
  def('landmark', { name: 'Metropolis Spire', cat: 'deco', dept: 'parks', size: 2, cost: 150000, upkeep: 1500, tier: 5, jobs: 200, lv: 20, lvr: 14, commerce: 0.1, usePower: 5, desc: 'A landmark tower that announces your city to the world.' });
  // internal
  def('rubble', { name: 'Rubble', cat: 'none', cost: 0, internal: true, desc: 'The remains of a destroyed building. Bulldoze to clear.' });

  M.CATS = [
    { id: 'road', name: 'Roads', key: '1' }, { id: 'res', name: 'Residential', key: '2' }, { id: 'com', name: 'Commercial', key: '3' },
    { id: 'ind', name: 'Industrial', key: '4' }, { id: 'power', name: 'Electricity', key: '5' }, { id: 'water', name: 'Water & Waste', short: 'Water', key: '6' },
    { id: 'service', name: 'Public Services', short: 'Services', key: '7' }, { id: 'transit', name: 'Transport', key: '8' }, { id: 'park', name: 'Parks', key: '9' },
    { id: 'deco', name: 'Decorations', key: '0' }, { id: 'district', name: 'Districts', key: '' }, { id: 'bulldoze', name: 'Demolish', key: 'B' }
  ];
  M.DEPTS = [
    { id: 'roads', name: 'Roads' }, { id: 'power', name: 'Electricity' }, { id: 'water', name: 'Water & Sewage' }, { id: 'waste', name: 'Garbage' },
    { id: 'fire', name: 'Fire' }, { id: 'police', name: 'Police' }, { id: 'health', name: 'Healthcare' }, { id: 'edu', name: 'Education' },
    { id: 'parks', name: 'Parks' }, { id: 'transit', name: 'Transport' }
  ];

  // ---- progression ----
  M.TIERS = [
    { name: 'Small Village', pop: 0, reward: 0 }, { name: 'Growing Town', pop: 500, reward: 5000 },
    { name: 'Established Town', pop: 2000, reward: 10000 }, { name: 'Small City', pop: 6000, reward: 20000 },
    { name: 'Major City', pop: 15000, reward: 40000 }, { name: 'Metropolis', pop: 40000, reward: 80000 },
    { name: 'Megacity', pop: 100000, reward: 150000 }
  ];
  M.NEED_TIER = { garbage: 1, fire: 1, police: 1, health: 1, edu: 1, sewage: 2, graves: 2, park: 1 };

  M.POLICIES = [
    { id: 'recycle', name: 'Recycling Programme', cost: 0.5, pro: 'Garbage -25%', con: 'Costs $0.50 per 100 residents', desc: 'Kerbside sorting cuts the garbage your city produces.' },
    { id: 'smoke', name: 'Smoke Detectors', cost: 0.4, pro: 'Fire risk -40%', con: 'Costs $0.40 per 100 residents', desc: 'Free detectors for every building.' },
    { id: 'filters', name: 'Emission Filters', cost: 0, pro: 'Industrial air pollution -35%', con: 'Industrial tax income -12%, demand falls', desc: 'Mandatory scrubbers on every smokestack.' },
    { id: 'noheavy', name: 'Heavy Industry Ban', cost: 0, pro: 'No heavy industry develops', con: 'Industrial demand falls', desc: 'Only light and high-tech industry may build here.' },
    { id: 'edu', name: 'Education Incentives', cost: 1.2, pro: 'Graduation rates +15%', con: 'Costs $1.20 per 100 residents', desc: 'Grants and free school meals keep children in school.' },
    { id: 'transit', name: 'Free Public Transport', cost: 0.3, pro: 'Bus ridership +50%', con: 'No fare income', desc: 'Nobody pays to ride the bus.' },
    { id: 'trucks', name: 'Heavy Traffic Ban', cost: 0, pro: 'Freight avoids the area, noise -30%', con: 'Commercial income -8%', desc: 'Lorries must find another way round.' },
    { id: 'parks', name: 'Parks Funding', cost: 0.6, pro: 'Park effect +25%', con: 'Costs $0.60 per 100 residents', desc: 'Gardeners, events and playground upkeep.' },
    { id: 'priority', name: 'Priority Services', cost: 1.5, pro: 'Fire, police and health coverage +20%', con: 'Costs $1.50 per 100 residents', desc: 'Extra crews and faster response.' },
    { id: 'power', name: 'Energy Conservation', cost: 0.2, pro: 'Electricity use -15%', con: 'Slightly less happy residents', desc: 'Insulation subsidies and a few nagging leaflets.' },
    { id: 'water', name: 'Water Conservation', cost: 0.2, pro: 'Water use -20%', con: 'Slightly less happy residents', desc: 'Water meters and hosepipe rules.' },
    { id: 'smallbiz', name: 'Small Business Incentive', cost: 0, pro: 'Commercial demand rises', con: 'Commercial tax income -10%', desc: 'Tax relief for shops and restaurants.' }
  ];

  M.ACHIEVEMENTS = [
    { id: 'settlers', name: 'First Settlers', desc: 'Reach 100 residents.' },
    { id: 'town', name: 'On the Map', desc: 'Reach 500 residents.' },
    { id: 'city', name: 'City Charter', desc: 'Reach 6,000 residents.' },
    { id: 'metro', name: 'Metropolis', desc: 'Reach 40,000 residents.' },
    { id: 'mega', name: 'Megacity', desc: 'Reach 100,000 residents.' },
    { id: 'black', name: 'In the Black', desc: 'Run a monthly surplus for 12 months in a row.' },
    { id: 'rich', name: 'Deep Pockets', desc: 'Hold $500,000 in the treasury.' },
    { id: 'debtfree', name: 'Debt Free', desc: 'Pay off every loan you took.' },
    { id: 'clean', name: 'Clean Air', desc: 'Average air pollution under 4 with 5,000+ residents.' },
    { id: 'green', name: 'Green Grid', desc: 'Power 2,000+ residents with wind and solar only.' },
    { id: 'scholar', name: 'City of Scholars', desc: 'Education index of 70% with 3,000+ residents.' },
    { id: 'happy', name: 'A Happy Place', desc: 'Happiness of 85% with 2,000+ residents.' },
    { id: 'flow', name: 'Rush Hour Hero', desc: 'Average congestion under 40% with 8,000+ residents.' },
    { id: 'skyline', name: 'Skyline', desc: 'Have 10 top-level buildings.' },
    { id: 'firefighter', name: 'Brigade of Heroes', desc: 'Extinguish 10 fires.' },
    { id: 'riders', name: 'All Aboard', desc: 'Carry 2,000 bus passengers in a month.' },
    { id: 'jobs', name: 'Full Employment', desc: 'Unemployment under 3% with 2,000+ residents.' },
    { id: 'safe', name: 'Safe Streets', desc: 'Average crime under 5 with 5,000+ residents.' },
    { id: 'scenario', name: 'Mission Accomplished', desc: 'Complete a scenario.' }
  ];

  M.SCENARIOS = [
    { id: 'free', name: 'Free Play', desc: 'No objectives beyond your own ambition.' },
    { id: 'island', name: 'Island Nation', desc: 'A scattered archipelago. Reach 8,000 residents within 25 years.', gen: { water: 0.62, hills: 0.4 }, goalPop: 8000, years: 25 },
    { id: 'debt', name: 'Debt Crisis', desc: 'You inherit $60,000 of debt and little cash. Be debt-free with 5,000 residents within 20 years.', debt: 60000, money: 18000, goalPop: 5000, years: 20 },
    { id: 'greencity', name: 'Green City', desc: 'Reach 10,000 residents with average air pollution under 6. No coal allowed. 25 years.', goalPop: 10000, maxAir: 6, noCoal: true, years: 25 }
  ];
  M.DIFF = {
    easy: { name: 'Easy', money: 80000, cost: 0.85, tax: 1.12, disaster: 0.6 },
    normal: { name: 'Normal', money: 50000, cost: 1, tax: 1, disaster: 1 },
    hard: { name: 'Hard', money: 35000, cost: 1.2, tax: 0.9, disaster: 1.5 }
  };
  M.LOANS = [{ amount: 10000, months: 36, rate: 0.06 }, { amount: 30000, months: 60, rate: 0.075 }, { amount: 80000, months: 96, rate: 0.09 }];
})();
