// Rival AI: scores every legal move and plays the best one. It follows rules
// the player can see — defend a close stall, answer a big card, save the
// Stormcaller for a real threat — and it says which stall it eyes first,
// so its choices can be read and countered.

import { STALLS } from './config.js';
import { affordableCards, stallLeader, stallTotal, effectivePower } from './state.js';

function stallStandingAfter(state, side, uid, stallIdx) {
  // Score the board as it would look after this play, without mutating state.
  // We approximate by copying the two stall totals and the card's value.
  const foe = side === 'you' ? 'rival' : 'you';
  const card = state.hands[side].find((c) => c.uid === uid);
  if (!card) return null;
  const mine = stallTotal(state, side, stallIdx) + card.power;
  const theirs = stallTotal(state, foe, stallIdx);
  return { mine, theirs, leader: mine > theirs ? side : mine < theirs ? foe : 'tie' };
}

export function intentLine(state, move) {
  if (!move || move.type === 'pass') return 'The rival weighs the table, then sets a card down.';
  const stall = STALLS[move.stallIdx].name;
  if (move.card.effect === 'clear') return `The rival eyes the ${stall} — a storm is coming.`;
  if (move.card.effect === 'boost') return `The rival lights a lamp over the ${stall}.`;
  if (move.card.effect === 'ward') return `The rival salts the ${stall} and stands guard.`;
  return `The rival eyes the ${stall}.`;
}

export function chooseMove(state, side) {
  const hand = affordableCards(state, side);
  const foe = side === 'you' ? 'rival' : 'you';

  // Ahead in two stalls with nothing to gain: pass.
  let ahead = 0;
  for (let i = 0; i < 3; i++) if (stallLeader(state, i) === side) ahead += 1;
  if (hand.length === 0) return { type: 'pass' };

  let best = null;
  let bestScore = -Infinity;
  for (const card of hand) {
    for (let s = 0; s < 3; s++) {
      const after = stallStandingAfter(state, side, card.uid, s);
      if (!after) continue;
      const before = stallLeader(state, s);
      let score = 0;
      if (before !== side && after.leader === side) score += 12; // flip a stall
      else if (before === side && after.leader === side) score += 4; // hold a stall
      else if (before === 'tie' && after.leader === side) score += 8;
      // Winning by a mile wastes value; prefer close stalls.
      const margin = after.mine - after.theirs;
      if (after.leader === side && margin > 6) score -= (margin - 6);
      // Suit advantage against the top opposing card is worth chasing.
      const foeCards = side === 'you' ? state.stalls[s].cardsRival : state.stalls[s].cardsYou;
      if (foeCards.length > 0) {
        const top = foeCards[foeCards.length - 1];
        const beats = { lantern: 'salt', salt: 'tide', tide: 'lantern' };
        if (beats[card.suit] === top.suit) score += 3;
        // Answer a big opposing card.
        if (effectivePower(state, foe, s, foeCards.length - 1) >= 6) score += 2;
      }
      // Same-suit chain in the stall pays off.
      const mine = side === 'you' ? state.stalls[s].cardsYou : state.stalls[s].cardsRival;
      if (mine.length > 0 && mine[mine.length - 1].suit === card.suit) score += 3;
      // Specials: save Stormcaller for a real threat, use the others freely.
      if (card.effect === 'clear') {
        const maxFoe = foeCards.reduce((m, c, i) => Math.max(m, effectivePower(state, foe, s, i)), 0);
        if (maxFoe < 6 && foeCards.length < 2) score -= 8;
        else score += 4;
      }
      if (card.effect === 'boost') score += mine.length >= 2 ? 5 : 1;
      if (card.effect === 'ward') score += 2;
      score -= card.cost * 1.5;
      // Small nudge to keep the game moving rather than hoarding.
      score += 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = { type: 'play', card, stallIdx: s };
      }
    }
  }

  // Pass only when passing is safe: ahead in two stalls and the rival has
  // no affordable card left, or every move on the table loses value.
  // Passing early while the rival still holds cards hands it free plays,
  // so a small lead is never a reason to pass on its own.
  let safeToPass = false;
  if (ahead >= 2) {
    const foeAffordable = affordableCards(state, foe);
    safeToPass = foeAffordable.length === 0;
  }
  if (safeToPass && bestScore < 6) return { type: 'pass' };
  if (bestScore < 0) return { type: 'pass' };
  return best;
}
