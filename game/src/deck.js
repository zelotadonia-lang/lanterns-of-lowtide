// Deck: 24 original cards, 8 per suit. Each card has a suit, a power, a cost
// and, for three of them, a special effect. Names are invented for this game.

import { SUITS, COST_FOR_POWER, EFFECTS } from './config.js';

const NAMES = {
  lantern: [
    'Paper Lantern', 'Festival Lamp', 'Ember Wick', 'Harbour Light',
    'Night Candle', 'Paper Moon', 'Gutter Flame', 'Lamplighter',
  ],
  tide: [
    'Lowtide', 'Moon Pull', 'Harbour Mist', 'Ebb Coin',
    'Driftwood', 'Rain Barrel', 'Salt Spray', 'Stormcaller',
  ],
  salt: [
    'Salt Crystals', 'Brine Jar', 'Pickled Eel', 'Cured Ham',
    'Dried Kelp', 'Sea Salt', 'Brine Barrel', 'Saltwarden',
  ],
};

// Power spread per suit: two 2s, two 3s, two 4s, one 5, one 6; the last
// card of each suit is its special (power 3/4/3, cost 3/4/3).
const POWERS = [2, 3, 3, 4, 4, 5, 6];
const SPECIAL = {
  lantern: { effect: 'boost', power: 3, cost: 3 },
  tide: { effect: 'clear', power: 4, cost: 4 },
  salt: { effect: 'ward', power: 3, cost: 3 },
};

let uidCounter = 1;

export function makeCard(suit, name, power, cost, effect) {
  return { uid: uidCounter++, suit, name, power, cost, effect: effect || null };
}

export function buildDeck() {
  uidCounter = 1;
  const deck = [];
  for (const suit of Object.keys(NAMES)) {
    const names = NAMES[suit];
    for (let i = 0; i < POWERS.length; i++) {
      const power = POWERS[i];
      deck.push(makeCard(suit, names[i], power, COST_FOR_POWER[power], null));
    }
    const sp = SPECIAL[suit];
    deck.push(makeCard(suit, names[7], sp.power, sp.cost, sp.effect));
  }
  return deck;
}

export function effectText(card) {
  if (!card.effect) return '';
  return EFFECTS[card.effect].text;
}

export function suitOf(card) {
  return SUITS[card.suit];
}
