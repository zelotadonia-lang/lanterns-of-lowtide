// Config: suits, stalls, economy and match constants for Lanterns of Lowtide.
// Suits are told apart by colour AND shape, never by text alone.

export const SUITS = {
  lantern: { key: 'lantern', name: 'Lantern', color: '#f2b544', dark: '#8a6414', shape: 'sun', beats: 'salt', verb: 'Outshines' },
  tide: { key: 'tide', name: 'Tide', color: '#4fb3d9', dark: '#1d5f7a', shape: 'wave', beats: 'lantern', verb: 'Douses' },
  salt: { key: 'salt', name: 'Salt', color: '#7fce7a', dark: '#2f6b2a', shape: 'crystal', beats: 'tide', verb: 'Preserves' },
};

export const SUIT_ORDER = ['lantern', 'tide', 'salt'];

export const STALLS = [
  { key: 'fish', name: 'Fish Stall', note: 'the morning catch' },
  { key: 'spice', name: 'Spice Stall', note: 'cinnamon and smoke' },
  { key: 'silk', name: 'Silk Stall', note: 'dyed in lowtide' },
];

export const START_COINS = 3;
export const COINS_PER_ROUND = 2;
export const MAX_COINS = 8;
export const HAND_CAP = 8;
export const DRAW_PER_ROUND = 2;
export const OPENING_HAND = 5;
export const ROUNDS_TO_WIN = 3;
export const DECK_SIZE = 24;
export const MAX_ROUNDS = 5;

// Special effects, one per suit.
export const EFFECTS = {
  boost: { key: 'boost', name: 'Lamplighter', text: '+2 to every friendly card in this stall' },
  clear: { key: 'clear', name: 'Stormcaller', text: 'Washes away the weakest rival card here' },
  ward: { key: 'ward', name: 'Saltwarden', text: '+3 here; blocks the rival surge in this stall' },
};

export const COST_FOR_POWER = { 2: 1, 3: 2, 4: 2, 5: 3, 6: 4 };
