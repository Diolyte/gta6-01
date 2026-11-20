// Verano Heat — every tuning number, colour and place name in one file.
// An original open-world crime game set in the sun-soaked city of Puerto Verano.
// Nothing here (or anywhere in this game) comes from any other game: the city,
// the people, the crews and the story were all invented for this entry.

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The world is a big place measured in pixels; the camera shows a window of it. */
export const WORLD = { width: 3400, height: 2500 };

/** Road centre-lines. Vertical roads run north-south, horizontal ones east-west. */
export const ROADS_X = [260, 760, 1260, 1760, 2260, 2760];
export const ROADS_Y = [260, 760, 1260, 1760, 2160];
export const ROAD_WIDTH = 130;
/** How far from a road's centre-line its right-hand lane sits (right-hand traffic). */
export const LANE_OFFSET = 17;

/** The sea starts here; the sand runs from SAND_X to WATER_X along the east edge. */
export const SAND_X = 2920;
export const WATER_X = 3070;

export const STREET_NAMES_X = ['Calle Palma', 'Avenida Central', 'Calle Coral', 'Avenida del Faro', 'Calle Brisa', 'Avenida del Sol'];
export const STREET_NAMES_Y = ['Calle Norte', 'Avenida Mercado', 'Calle Centro', 'Avenida Sur', 'Paseo Marítimo'];

/** The named districts, painted on the ground and used by the missions. */
export const DISTRICTS = [
  { name: 'MARINA', x: 2350, y: 60, w: 570, h: 500 },
  { name: 'DOWNTOWN', x: 950, y: 560, w: 1100, h: 900 },
  { name: 'MERCADO', x: 60, y: 1460, w: 890, h: 800 },
  { name: 'PLAYA', x: 2560, y: 560, w: 360, h: 1700 },
  { name: 'SOLANA', x: 60, y: 60, w: 2200, h: 500 },
];

/** Places the story visits. */
export const PLACES = {
  safehouse: { x: 2520, y: 430, label: 'Casa Verano (safehouse)' },
  rosaDock: { x: 2880, y: 300, label: "Rosa's dock office" },
  mercadoPlaza: { x: 480, y: 1830, label: 'Mercado plaza' },
  titoGarage: { x: 830, y: 2060, label: "Tito's garage" },
  downtownParking: { x: 1500, y: 1010, label: 'Downtown parking' },
  rosaWarehouse: { x: 1150, y: 1360, label: "Rosa's warehouse" },
  beachClub: { x: 2830, y: 1900, label: 'Club Brisa' },
};

export const PLAYER = {
  walkSpeed: 125,
  runSpeed: 205,
  radius: 9,
  maxHealth: 100,
  maxArmour: 100,
  shirt: '#e4572e',
  skin: '#c68863',
  trousers: '#2e4057',
};

export const CAR = {
  length: 48,
  width: 23,
  accel: 300,
  brake: 420,
  reverseAccel: 180,
  maxSpeed: 345,
  maxReverse: 125,
  drag: 0.55,
  steerRate: 2.35,
  radius: 21,
};

/** Wanted points that raise each star, and the police strength that answers them. */
export const WANTED_THRESHOLDS = [0, 12, 45, 100, 175, 275];
export const POLICE_PER_STAR = [0, 2, 3, 4, 6, 8];

export const PALETTE = {
  backdrop: '#2b1a12',
  sidewalk: '#c9b18c',
  plot: '#b3a37f',
  plotAlt: '#ab9a72',
  park: '#79a85b',
  asphalt: '#454049',
  asphaltEdge: '#38333d',
  laneMark: '#e8d9a0',
  crosswalk: '#d8d2c4',
  sand: '#eed9a0',
  boardwalk: '#a97e4f',
  water: '#22707f',
  waterDeep: '#175263',
  pier: '#8a6a42',
  shadow: 'rgba(74, 36, 8, 0.35)',
  buildingSide: '#00000022',
  roofs: ['#b56545', '#8a5a44', '#7d8590', '#4f8a80', '#a2674c', '#6d7f8c'],
  buildings: ['#eda98a', '#f2e3c6', '#e8836f', '#7fc8bc', '#ecc987', '#e5a3b4', '#f5efe0', '#d98e6a'],
  glass: ['#5d7f96', '#476b84', '#6b8ca3', '#3f6178'],
  neon: ['#ff5d8f', '#22d3ee', '#facc15', '#a3e635', '#fb923c'],
  text: '#fdf6e9',
  muted: '#d8c9a8',
  gold: '#f2c94c',
  danger: '#e5534b',
  policeBlue: '#2f6fd0',
  panel: 'rgba(24, 16, 12, 0.88)',
  minimapRoad: '#8f8574',
  minimapGround: '#4c4438',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

/** Where the saved game lives between visits (this browser only). */
export const SAVE_KEY = 'verano-heat.save.v1';

export const TRAFFIC_COUNT = 14;
export const PARKED_COUNT = 16;
export const PED_COUNT = 42;
