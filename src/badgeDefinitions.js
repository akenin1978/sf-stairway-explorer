// All badge definitions live here as static, curated content -- same
// pattern as the rating-color legend elsewhere in the app. This is not
// a database table on purpose: the badge list is fixed content Ali
// finalizes and edits deliberately, not something that needs changing
// without a deploy.
//
// Each badge has a stable `id` -- this is what actually gets stored in
// the badges_earned table, so once a badge has been awarded to anyone,
// its id should never change (the display name/description can change
// freely, the id is the permanent identity).

export const NEIGHBORHOOD_BADGES = [
  { id: 'neighborhood-alamo-square', neighborhood: 'Alamo Square', name: 'Alamo Square Ace' },
  { id: 'neighborhood-anza-vista', neighborhood: 'Anza Vista', name: 'Anza Vista Adventurer' },
  { id: 'neighborhood-ashbury-heights', neighborhood: 'Ashbury Heights', name: 'Ashbury Heights Avenger' },
  { id: 'neighborhood-balboa-park', neighborhood: 'Balboa Park', name: 'Balboa Park Booster' },
  { id: 'neighborhood-bayview', neighborhood: 'Bayview', name: 'Bayview Baddie' },
  { id: 'neighborhood-bernal-heights', neighborhood: 'Bernal Heights', name: 'Bernal Beast' },
  { id: 'neighborhood-buena-vista-park', neighborhood: 'Buena Vista Park', name: 'Buena Vista Boss' },
  { id: 'neighborhood-corona-heights', neighborhood: 'Corona Heights', name: 'Corona Crown Champion' },
  { id: 'neighborhood-castro-eureka-valley', neighborhood: 'Castro/Eureka Valley', name: 'Castro Conqueror' },
  { id: 'neighborhood-chinatown', neighborhood: 'Chinatown', name: 'Chinatown Charger' },
  { id: 'neighborhood-cole-valley', neighborhood: 'Cole Valley', name: 'Cole Valley Climber' },
  { id: 'neighborhood-crocker-amazon', neighborhood: 'Crocker-Amazon', name: 'Crocker-Amazon Queen' },
  { id: 'neighborhood-diamond-heights', neighborhood: 'Diamond Heights', name: 'Diamond Heights Dazzler' },
  { id: 'neighborhood-dogpatch', neighborhood: 'Dogpatch', name: 'Dogpatch Dynamo' },
  { id: 'neighborhood-dolores-heights', neighborhood: 'Dolores Heights', name: 'Dolores Heights Darling' },
  { id: 'neighborhood-duboce-triangle', neighborhood: 'Duboce Triangle', name: 'Triangle Titan' },
  { id: 'neighborhood-edgehill-mountain', neighborhood: 'Edgehill Mountain', name: 'Edgehill Enthusiast' },
  { id: 'neighborhood-embarcadero', neighborhood: 'Embarcadero', name: 'Embarcadero Explorer' },
  { id: 'neighborhood-excelsior', neighborhood: 'Excelsior', name: 'Excelsior Expert' },
  { id: 'neighborhood-fidi', neighborhood: 'FiDi', name: 'FiDi Flyer' },
  { id: 'neighborhood-fishermans-wharf', neighborhood: "Fisherman's Wharf", name: "Fisherman's Wharf Wanderer" },
  { id: 'neighborhood-forest-hill', neighborhood: 'Forest Hill', name: 'King of the (Forest) Hill' },
  { id: 'neighborhood-forest-knolls', neighborhood: 'Forest Knolls', name: 'Forest Knolls Fanatic' },
  { id: 'neighborhood-fort-funston', neighborhood: 'Fort Funston', name: 'Friend of Fort Funston' },
  { id: 'neighborhood-fort-mason', neighborhood: 'Fort Mason', name: 'Fort Mason Flight Finder' },
  { id: 'neighborhood-glen-canyon-park', neighborhood: 'Glen Canyon Park', name: 'Glen Canyon GOAT' },
  { id: 'neighborhood-glen-park', neighborhood: 'Glen Park', name: 'Glen Park Pro' },
  { id: 'neighborhood-golden-gate-heights', neighborhood: 'Golden Gate Heights', name: 'Golden Gate Heights Hiker' },
  { id: 'neighborhood-golden-gate-park', neighborhood: 'Golden Gate Park', name: 'GG Park Guide' },
  { id: 'neighborhood-haight-ashbury', neighborhood: 'Haight-Ashbury', name: 'Love & Haight' },
  { id: 'neighborhood-hayes-valley', neighborhood: 'Hayes Valley', name: 'Hayes Valley Hottie' },
  { id: 'neighborhood-ingleside-terrace', neighborhood: 'Ingleside Terrace', name: 'Ingleside Insider' },
  { id: 'neighborhood-lands-end', neighborhood: 'Lands End', name: 'Lands End Legend' },
  { id: 'neighborhood-laurel-heights', neighborhood: 'Laurel Heights', name: 'Laurel Heights Local' },
  { id: 'neighborhood-lincoln-park', neighborhood: 'Lincoln Park', name: 'Lincoln Park Lover' },
  { id: 'neighborhood-lone-mountain', neighborhood: 'Lone Mountain', name: 'Lone Mountain Luminary' },
  { id: 'neighborhood-marina', neighborhood: 'Marina', name: 'Marina Girl' },
  { id: 'neighborhood-mclaren-park', neighborhood: 'McLaren Park', name: 'McLaren Park Mainstay' },
  { id: 'neighborhood-merced-manor', neighborhood: 'Merced Manor', name: 'Merced Manor Marvel' },
  { id: 'neighborhood-mission', neighborhood: 'Mission', name: 'Mission Master' },
  { id: 'neighborhood-mission-bay', neighborhood: 'Mission Bay', name: 'Mission Bay Maverick' },
  { id: 'neighborhood-miraloma', neighborhood: 'Miraloma', name: 'Miraloma Marauder' },
  { id: 'neighborhood-mt-davidson', neighborhood: 'Mt. Davidson', name: 'Mt. Davidson Diehard' },
  { id: 'neighborhood-nob-hill', neighborhood: 'Nob Hill', name: 'Nob Hill Navigator' },
  { id: 'neighborhood-noe-valley', neighborhood: 'Noe Valley', name: 'Noe Valley Native' },
  { id: 'neighborhood-north-beach', neighborhood: 'North Beach', name: 'North Beach Nomad' },
  { id: 'neighborhood-oceanview', neighborhood: 'Oceanview', name: 'Oceanview Overachiever' },
  { id: 'neighborhood-pacific-heights', neighborhood: 'Pacific Heights', name: 'Pac Heights Heavy Hitter' },
  { id: 'neighborhood-parkmerced', neighborhood: 'Parkmerced', name: 'Parkmerced on Point' },
  { id: 'neighborhood-parkside', neighborhood: 'Parkside', name: 'Parkside Pathfinder' },
  { id: 'neighborhood-parnassus-heights', neighborhood: 'Parnassus Heights', name: 'Parnassus Heights Pacer' },
  { id: 'neighborhood-portola', neighborhood: 'Portola', name: 'Portola Prowler' },
  { id: 'neighborhood-potrero-hill', neighborhood: 'Potrero Hill', name: 'Potrero Powerhouse' },
  { id: 'neighborhood-presidio', neighborhood: 'Presidio', name: 'Presidio Pioneer' },
  { id: 'neighborhood-presidio-fort-winfield-scott', neighborhood: 'Presidio (Fort Winfield Scott)', name: 'Fort Winfield Scout' },
  { id: 'neighborhood-richmond', neighborhood: 'Richmond', name: 'Richmond Rover' },
  { id: 'neighborhood-russian-hill', neighborhood: 'Russian Hill', name: 'Russian Hill Rambler' },
  { id: 'neighborhood-sea-cliff', neighborhood: 'Sea Cliff', name: 'Seacliff Seeker' },
  { id: 'neighborhood-soma', neighborhood: 'SoMa', name: 'SoMa Standout' },
  { id: 'neighborhood-st-francis-wood', neighborhood: 'St. Francis Wood', name: 'St. Francis Wood Finisher' },
  { id: 'neighborhood-sherwood-forest', neighborhood: 'Sherwood Forest', name: 'Sherwood Forest Ranger' },
  { id: 'neighborhood-south-beach', neighborhood: 'South Beach', name: 'South Beach Saunterer' },
  { id: 'neighborhood-sunnyside', neighborhood: 'Sunnyside', name: 'Sunnyside Star' },
  { id: 'neighborhood-sunnydale', neighborhood: 'Sunnydale', name: 'Sunnydale Strider' },
  { id: 'neighborhood-outer-sunset', neighborhood: 'Outer Sunset', name: 'Sunset Stepper' },
  { id: 'neighborhood-telegraph-hill', neighborhood: 'Telegraph Hill', name: 'Telegraph Hill Trekker' },
  { id: 'neighborhood-twin-peaks', neighborhood: 'Twin Peaks', name: 'Twin Peaks Trailblazer' },
  { id: 'neighborhood-university-mound', neighborhood: 'University Mound', name: 'University Mound Scholar' },
  { id: 'neighborhood-upper-market', neighborhood: 'Upper Market', name: 'Upper Market Maven' },
  { id: 'neighborhood-visitacion-valley', neighborhood: 'Visitacion Valley', name: 'Vis Valley Victor' },
  { id: 'neighborhood-western-addition', neighborhood: 'Western Addition', name: 'Western Addition Wayfarer' },
  { id: 'neighborhood-civic-center', neighborhood: 'Civic Center', name: 'Civic Center Citizen' },
  { id: 'neighborhood-union-square', neighborhood: 'Union Square', name: 'Union Square Shopper' },

  // Special / non-geographic "neighborhoods" -- awarded exactly like a
  // regular neighborhood badge (100% of that category's stairways), they
  // just don't correspond to a normal geographic area.
  { id: 'neighborhood-alcatraz-island', neighborhood: 'Alcatraz Island', name: 'Escape from Alcatraz' },
  { id: 'neighborhood-yerba-buena-island', neighborhood: 'Yerba Buena Island', name: 'Yerba Buena Voyager' },
  { id: 'neighborhood-bart-and-muni-stations', neighborhood: 'BART and MUNI Stations', name: 'Transit Nerd' },
  { id: 'neighborhood-angel-island', neighborhood: 'Angel Island', name: 'Island Angel' },
];

// Threshold-based, citywide totals -- not tied to one neighborhood.
// "All" is intentionally NOT a fixed number here -- it's computed at
// award-check time against however many stairways actually exist then,
// so it stays accurate as the map keeps growing rather than needing to
// be updated by hand.
export const MILESTONE_BADGES = [
  { id: 'milestone-25', threshold: 25, name: 'First Flight' },
  { id: 'milestone-50', threshold: 50, name: 'Half-Century Hiker' },
  { id: 'milestone-100', threshold: 100, name: 'Century Climber' },
  { id: 'milestone-200', threshold: 200, name: '200 Club' },
  { id: 'milestone-300', threshold: 300, name: '300 Club' },
  { id: 'milestone-400', threshold: 400, name: '400 Club' },
  { id: 'milestone-500', threshold: 500, name: 'Halfway Hero' },
  { id: 'milestone-600', threshold: 600, name: '600 Club' },
  { id: 'milestone-700', threshold: 700, name: '700 Club' },
  { id: 'milestone-800', threshold: 800, name: '800 Club' },
  { id: 'milestone-900', threshold: 900, name: '900 Club' },
  { id: 'milestone-1000', threshold: 1000, name: '1,000 Steps Strong' },
  { id: 'milestone-1100', threshold: 1100, name: 'Almost There' },
  { id: 'milestone-all', threshold: 'all', name: 'SF Stairway Legend' },
];

// Not tied to a neighborhood or a simple count -- special one-off
// achievement badges with their own dedicated award logic.
export const SPECIAL_BADGES = [
  {
    id: 'special-best-of-the-best',
    name: 'Best of the Best',
    description: 'Spotted every 5-rated stairway in the city.',
  },
  // "Scout" (first submitted stairway) is designed but not wired up yet
  // -- it hooks into the Spot a Stairway submission flow rather than
  // check-ins, which is a separate piece of work.
];
