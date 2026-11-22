// Match state: a best-of-5-rounds duel over three stalls. Pure logic, no DOM,
// so the same module runs in the browser and in Node self-tests.

import {
  SUITS, STALLS, START_COINS, COINS_PER_ROUND, MAX_COINS, HAND_CAP,
  DRAW_PER_ROUND, OPENING_HAND, ROUNDS_TO_WIN, MAX_ROUNDS,
} from './config.js';
import { buildDeck } from './deck.js';
import { makeRng, shuffle } from './rng.js';

export function newMatch(seed) {
  const rng = makeRng(seed);
  const youDeck = shuffle(rng, buildDeck());
  const rivalDeck = shuffle(rng, buildDeck());
  const state = {
    seed,
    rng,
    round: 1,
    roundsWon: { you: 0, rival: 0 },
    phase: 'play',
    turn: 'you',
    coins: { you: START_COINS, rival: START_COINS },
    decks: { you: youDeck, rival: rivalDeck },
    hands: { you: [], rival: [] },
    stalls: STALLS.map((s) => ({
      key: s.key, name: s.name,
      cardsYou: [], cardsRival: [],
      boostYou: 0, boostRival: 0, wardYou: false, wardRival: false,
    })),
    passed: { you: false, rival: false },
    log: [`Round 1 begins. The market is ankle-deep and the lanterns are lit.`],
    winner: null,
    roundWinner: null,
    stats: {
      cardsPlayed: { you: 0, rival: 0 },
      surges: { you: 0, rival: 0 },
      outshone: { you: 0, rival: 0 },
      cleared: { you: 0, rival: 0 },
    },
    lastPlay: null,
  };
  drawCards(state, 'you', OPENING_HAND);
  drawCards(state, 'rival', OPENING_HAND);
  return state;
}

export function drawCards(state, side, n) {
  for (let i = 0; i < n; i++) {
    if (state.hands[side].length >= HAND_CAP) return;
    const card = state.decks[side].shift();
    if (!card) return;
    state.hands[side].push(card);
  }
}

function other(side) {
  return side === 'you' ? 'rival' : 'you';
}

function stallCards(stall, side) {
  return side === 'you' ? stall.cardsYou : stall.cardsRival;
}

// Chain bonus: +1 for each consecutive same-suit card directly before this
// one in the same stall, same side. A rival Saltwarden in the stall blocks it.
export function chainBonus(state, side, stallIdx, cardIdx) {
  const stall = state.stalls[stallIdx];
  const foe = other(side);
  if (side === 'you' ? stall.wardRival : stall.wardYou) return 0;
  const cards = stallCards(stall, side);
  const card = cards[cardIdx];
  let bonus = 0;
  for (let i = cardIdx - 1; i >= 0; i--) {
    if (cards[i].suit === card.suit) bonus += 1;
    else break;
  }
  return bonus;
}

// Outshone: +2 when this card's suit beats the suit of the top opposing card
// in the same stall (Lantern beats Salt, Salt beats Tide, Tide beats Lantern).
export function outshoneBonus(state, side, stallIdx, cardIdx) {
  const stall = state.stalls[stallIdx];
  const foeCards = stallCards(stall, other(side));
  if (foeCards.length === 0) return 0;
  const card = stallCards(stall, side)[cardIdx];
  const topFoe = foeCards[foeCards.length - 1];
  return SUITS[card.suit].beats === topFoe.suit ? 2 : 0;
}

export function effectivePower(state, side, stallIdx, cardIdx) {
  const stall = state.stalls[stallIdx];
  const card = stallCards(stall, side)[cardIdx];
  return card.power + chainBonus(state, side, stallIdx, cardIdx)
    + outshoneBonus(state, side, stallIdx, cardIdx);
}

export function stallTotal(state, side, stallIdx) {
  const stall = state.stalls[stallIdx];
  const cards = stallCards(stall, side);
  let total = 0;
  for (let i = 0; i < cards.length; i++) total += effectivePower(state, side, stallIdx, i);
  total += side === 'you' ? stall.boostYou : stall.boostRival;
  return total;
}

export function stallLeader(state, stallIdx) {
  const you = stallTotal(state, 'you', stallIdx);
  const rival = stallTotal(state, 'rival', stallIdx);
  if (you === rival) return 'tie';
  return you > rival ? 'you' : 'rival';
}

export function affordableCards(state, side) {
  return state.hands[side].filter((c) => c.cost <= state.coins[side]);
}

export function canPlay(state, side) {
  return !state.passed[side] && affordableCards(state, side).length > 0;
}

export function playCard(state, side, uid, stallIdx) {
  const hand = state.hands[side];
  const idx = hand.findIndex((c) => c.uid === uid);
  if (idx < 0) return { ok: false, reason: 'card not in hand' };
  const card = hand[idx];
  if (card.cost > state.coins[side]) return { ok: false, reason: 'not enough coins' };
  if (state.passed[side]) return { ok: false, reason: 'already passed' };
  if (state.phase !== 'play') return { ok: false, reason: 'round is over' };

  hand.splice(idx, 1);
  state.coins[side] -= card.cost;
  const stall = state.stalls[stallIdx];
  const cards = stallCards(stall, side);
  cards.push(card);
  const cardIdx = cards.length - 1;

  const chain = chainBonus(state, side, stallIdx, cardIdx);
  const out = outshoneBonus(state, side, stallIdx, cardIdx);
  if (chain > 0) state.stats.surges[side] += 1;
  if (out > 0) state.stats.outshone[side] += 1;

  let note = '';
  if (card.effect === 'boost') {
    if (side === 'you') stall.boostYou += 2;
    else stall.boostRival += 2;
    note = ` Lamplighter: +2 to every friendly card in the ${stall.name}.`;
  } else if (card.effect === 'clear') {
    const foeCards = stallCards(stall, other(side));
    if (foeCards.length > 0) {
      let weakest = 0;
      for (let i = 1; i < foeCards.length; i++) {
        if (effectivePower(state, other(side), stallIdx, i) < effectivePower(state, other(side), stallIdx, weakest)) weakest = i;
      }
      const gone = foeCards.splice(weakest, 1)[0];
      state.stats.cleared[side] += 1;
      note = ` Stormcaller washes away the rival ${gone.name}.`;
    }
  } else if (card.effect === 'ward') {
    if (side === 'you') stall.wardYou = true;
    else stall.wardRival = true;
    note = ` Saltwarden stands guard; the rival surge is blocked here.`;
  }

  const who = side === 'you' ? 'You' : 'Rival';
  state.log.push(`${who} play ${card.name} (${card.power}) at the ${stall.name}.`
    + (chain > 0 ? ` Surge +${chain}.` : '')
    + (out > 0 ? ` Outshone +2.` : '') + note);
  state.stats.cardsPlayed[side] += 1;
  state.lastPlay = { side, card, stallIdx, chain, outshone: out };
  // If the other side already passed, the turn stays with the player who
  // can still act; the round ends only when both sides have passed.
  state.turn = state.passed[other(side)] ? side : other(side);
  return { ok: true, card, chain, outshone: out };
}

export function passTurn(state, side) {
  if (state.phase !== 'play') return { ok: false, reason: 'round is over' };
  state.passed[side] = true;
  const who = side === 'you' ? 'You' : 'Rival';
  state.log.push(`${who} pass${side === 'you' ? '' : 'es'} for this round.`);
  state.lastPlay = null;
  if (state.passed.you && state.passed.rival) {
    endRound(state);
  } else {
    state.turn = other(side);
  }
  return { ok: true };
}

function endRound(state) {
  let youStalls = 0;
  let rivalStalls = 0;
  const names = [];
  for (let i = 0; i < state.stalls.length; i++) {
    const leader = stallLeader(state, i);
    const you = stallTotal(state, 'you', i);
    const rival = stallTotal(state, 'rival', i);
    names.push(`${state.stalls[i].name} ${you}–${rival}`);
    if (leader === 'you') youStalls += 1;
    else if (leader === 'rival') rivalStalls += 1;
  }
  let roundWinner = null;
  if (youStalls > rivalStalls) roundWinner = 'you';
  else if (rivalStalls > youStalls) roundWinner = 'rival';
  state.roundWinner = roundWinner;
  if (roundWinner) state.roundsWon[roundWinner] += 1;
  state.log.push(`Round ${state.round} ends: ${names.join(', ')}. `
    + (roundWinner === 'you' ? 'You take the round.' : roundWinner === 'rival' ? 'The rival takes the round.' : 'The round is tied.'));
  state.phase = 'roundEnd';
  if (state.roundsWon.you >= ROUNDS_TO_WIN || state.roundsWon.rival >= ROUNDS_TO_WIN
    || state.round >= MAX_ROUNDS) {
    state.phase = 'over';
    state.winner = state.roundsWon.you > state.roundsWon.rival ? 'you'
      : state.roundsWon.rival > state.roundsWon.you ? 'rival' : 'tie';
    state.log.push(state.winner === 'you'
      ? 'The market is yours. Every lantern burns for you.'
      : state.winner === 'rival'
        ? 'The rival takes the market. Your lanterns gutter out.'
        : 'Neither side takes the market tonight.');
  }
}

export function nextRound(state) {
  if (state.phase !== 'roundEnd') return false;
  state.round += 1;
  state.stalls = STALLS.map((s) => ({
    key: s.key, name: s.name,
    cardsYou: [], cardsRival: [],
    boostYou: 0, boostRival: 0, wardYou: false, wardRival: false,
  }));
  state.passed = { you: false, rival: false };
  state.coins.you = Math.min(MAX_COINS, state.coins.you + COINS_PER_ROUND);
  state.coins.rival = Math.min(MAX_COINS, state.coins.rival + COINS_PER_ROUND);
  drawCards(state, 'you', DRAW_PER_ROUND);
  drawCards(state, 'rival', DRAW_PER_ROUND);
  state.roundWinner = null;
  state.lastPlay = null;
  // Alternate who opens each round: the side that moves first is also the
  // side that runs out of good moves first and passes first, and the other
  // side then gets the last word. Alternating keeps that edge even.
  state.turn = state.round % 2 === 1 ? 'you' : 'rival';
  state.phase = 'play';
  state.log.push(`Round ${state.round} begins. Fresh cards, fresh coins.`);
  return true;
}
