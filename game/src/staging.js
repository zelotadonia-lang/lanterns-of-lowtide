// Staging: fixed, plausible game states for screenshots (?screen=title|table|
// win|loss&seed=...). These are real states built through the match logic,
// not painted pictures: the table screen plays several turns of autopilot
// from the seed, then hands the state to the renderer.

import { newMatch, playCard, passTurn, nextRound } from './state.js';
import { chooseMove } from './ai.js';

function autoTurns(state, n) {
  let steps = 0;
  while (steps < n && state.phase === 'play') {
    steps += 1;
    const side = state.turn;
    const move = chooseMove(state, side);
    if (move.type === 'play') playCard(state, side, move.card.uid, move.stallIdx);
    else passTurn(state, side);
  }
}

export function stagedState(screen, seed) {
  const s = typeof seed === 'number' ? seed : 11;
  if (screen === 'title') return { screen: 'title', state: null };
  if (screen === 'win' || screen === 'loss') {
    const m = newMatch(s + 40);
    // Play whole matches until the wanted side wins; fall back to the
    // match that finished if the seed never delivers it.
    let guard = 0;
    while (m.phase !== 'over' && guard < 600) {
      guard += 1;
      if (m.phase === 'roundEnd') { nextRound(m); continue; }
      const side = m.turn;
      const move = chooseMove(m, side);
      if (move.type === 'play') playCard(m, side, move.card.uid, move.stallIdx);
      else passTurn(m, side);
    }
    if ((screen === 'win' && m.winner === 'you') || (screen === 'loss' && m.winner === 'rival')) {
      return { screen, state: m };
    }
    // Try a few more seeds to find the wanted outcome.
    for (let t = 1; t <= 8; t++) {
      const m2 = newMatch(s + 40 + t);
      let g2 = 0;
      while (m2.phase !== 'over' && g2 < 600) {
        g2 += 1;
        if (m2.phase === 'roundEnd') { nextRound(m2); continue; }
        const side = m2.turn;
        const move = chooseMove(m2, side);
        if (move.type === 'play') playCard(m2, side, move.card.uid, move.stallIdx);
        else passTurn(m2, side);
      }
      if ((screen === 'win' && m2.winner === 'you') || (screen === 'loss' && m2.winner === 'rival')) {
        return { screen, state: m2 };
      }
    }
    return { screen, state: m };
  }
  // Table: a mid-match state, round 2 or 3, stalls half full, log alive,
  // caught mid-round (phase 'play'), never on a round-end screen.
  let m = newMatch(s);
  autoTurns(m, 6);
  let guard = 0;
  while (m.phase !== 'play' && guard < 6) {
    guard += 1;
    if (m.phase === 'roundEnd') { nextRound(m); autoTurns(m, 4); }
    else break;
  }
  if (m.phase !== 'play') {
    m = newMatch(s + 5);
    autoTurns(m, 5);
    guard = 0;
    while (m.phase !== 'play' && guard < 6) {
      guard += 1;
      if (m.phase === 'roundEnd') { nextRound(m); autoTurns(m, 4); }
      else break;
    }
  }
  return { screen: 'table', state: m };
}
