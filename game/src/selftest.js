// Self-tests for the match logic. Runs in Node (node --test style, plain
// function) and in the browser (?selftest=1). No DOM here.

import { buildDeck } from './deck.js';
import {
  newMatch, drawCards, playCard, passTurn, nextRound, stallTotal,
  stallLeader, effectivePower, affordableCards,
} from './state.js';
import { chooseMove } from './ai.js';

function check(name, ok, detail) {
  return { name, pass: !!ok, detail: detail || '' };
}

export function runSelfTests(seed) {
  const results = [];
  const base = typeof seed === 'number' ? seed : 7;

  // 1. Deck: 24 cards, 8 per suit, one special per suit.
  {
    const deck = buildDeck();
    const bySuit = { lantern: 0, tide: 0, salt: 0 };
    let specials = 0;
    for (const c of deck) { bySuit[c.suit] += 1; if (c.effect) specials += 1; }
    results.push(check('deck is 24 cards, 8 per suit, 3 specials',
      deck.length === 24 && bySuit.lantern === 8 && bySuit.tide === 8 && bySuit.salt === 8 && specials === 3,
      JSON.stringify(bySuit)));
  }

  // 2. Opening hands: 5 cards each, 19 left in each deck, 3 coins each.
  {
    const m = newMatch(base);
    results.push(check('opening hands 5/5, decks 19/19, coins 3/3',
      m.hands.you.length === 5 && m.hands.rival.length === 5
      && m.decks.you.length === 19 && m.decks.rival.length === 19
      && m.coins.you === 3 && m.coins.rival === 3,
      `hands ${m.hands.you.length}/${m.hands.rival.length}`));
  }

  // 3. Playing a card spends coins and lands in the stall.
  {
    const m = newMatch(base + 1);
    const card = affordableCards(m, 'you')[0];
    const before = m.coins.you;
    const r = playCard(m, 'you', card.uid, 0);
    results.push(check('play card spends coins and fills a stall',
      r.ok && m.coins.you === before - card.cost && m.stalls[0].cardsYou.length === 1,
      `coins ${before} -> ${m.coins.you}`));
  }

  // 4. Surge: two same-suit cards in a row in one stall give +1 to the second.
  {
    const m = newMatch(base + 2);
    // Force the hand: two lantern cards, cheap.
    const l1 = { uid: 901, suit: 'lantern', name: 'T1', power: 3, cost: 1, effect: null };
    const l2 = { uid: 902, suit: 'lantern', name: 'T2', power: 3, cost: 1, effect: null };
    m.hands.you = [l1, l2];
    m.coins.you = 8;
    m.coins.rival = 8;
    playCard(m, 'you', 901, 1);
    // The rival answers with a plain card (no Saltwarden: its ward would
    // legitimately block the surge and spoil the test).
    const rivalCard = m.hands.rival.find((c) => !c.effect);
    playCard(m, 'rival', rivalCard.uid, 1);
    const r2 = playCard(m, 'you', 902, 1);
    results.push(check('surge chain gives +1 to the second same-suit card',
      r2.ok && r2.chain === 1 && effectivePower(m, 'you', 1, 1) === 4,
      `chain ${r2.chain}, power ${effectivePower(m, 'you', 1, 1)}`));
  }

  // 5. Outshone: tide beats lantern, so a tide card against a lantern top gets +2.
  {
    const m = newMatch(base + 3);
    const lan = { uid: 911, suit: 'lantern', name: 'L', power: 3, cost: 1, effect: null };
    const tid = { uid: 912, suit: 'tide', name: 'T', power: 3, cost: 1, effect: null };
    m.hands.you = [lan];
    m.hands.rival = [tid];
    m.coins.you = 8; m.coins.rival = 8;
    playCard(m, 'you', 911, 0);
    const r = playCard(m, 'rival', 912, 0);
    results.push(check('outshone: tide over lantern gives +2',
      r.ok && r.outshone === 2 && effectivePower(m, 'rival', 0, 0) === 5,
      `outshone ${r.outshone}`));
  }

  // 6. Stormcaller clears the weakest opposing card in the stall.
  {
    const m = newMatch(base + 4);
    const weak = { uid: 921, suit: 'salt', name: 'W', power: 2, cost: 1, effect: null };
    const strong = { uid: 922, suit: 'salt', name: 'S', power: 5, cost: 3, effect: null };
    const storm = { uid: 923, suit: 'tide', name: 'Stormcaller', power: 4, cost: 4, effect: 'clear' };
    m.hands.you = [weak, strong];
    m.hands.rival = [storm];
    m.coins.you = 8; m.coins.rival = 8;
    playCard(m, 'you', 921, 2);
    playCard(m, 'you', 922, 2);
    const r = playCard(m, 'rival', 923, 2);
    results.push(check('stormcaller clears the weakest rival card',
      r.ok && m.stalls[2].cardsYou.length === 1 && m.stalls[2].cardsYou[0].uid === 922,
      `left ${m.stalls[2].cardsYou.length} card(s)`));
  }

  // 7. Both pass ends the round; the stall leader takes it.
  {
    const m = newMatch(base + 5);
    const big = { uid: 931, suit: 'lantern', name: 'B', power: 6, cost: 4, effect: null };
    m.hands.you = [big];
    m.coins.you = 8;
    playCard(m, 'you', 931, 0);
    passTurn(m, 'you');
    passTurn(m, 'rival');
    results.push(check('both pass ends round, leader takes it',
      m.phase === 'roundEnd' && m.roundWinner === 'you' && m.roundsWon.you === 1,
      `phase ${m.phase}, winner ${m.roundWinner}`));
  }

  // 8. A full autopilot match ends with a winner inside 5 rounds.
  {
    let winner = null;
    let turns = 0;
    const m = newMatch(base + 6);
    while (m.phase !== 'over' && turns < 400) {
      turns += 1;
      if (m.phase === 'roundEnd') { nextRound(m); continue; }
      const side = m.turn;
      const move = chooseMove(m, side);
      if (move.type === 'play') playCard(m, side, move.card.uid, move.stallIdx);
      else passTurn(m, side);
    }
    winner = m.winner;
    results.push(check('autopilot match finishes with a winner',
      m.phase === 'over' && (winner === 'you' || winner === 'rival' || winner === 'tie') && turns < 400,
      `winner ${winner}, ${turns} turns, rounds ${m.round}`));
  }

  // 9. AI never plays a card it cannot afford, over 10 seeds.
  {
    let bad = 0;
    for (let s = 0; s < 10; s++) {
      const m = newMatch(base + 100 + s);
      let turns = 0;
      while (m.phase !== 'over' && turns < 400) {
        turns += 1;
        if (m.phase === 'roundEnd') { nextRound(m); continue; }
        const side = m.turn;
        const move = chooseMove(m, side);
        if (move.type === 'play') {
          if (move.card.cost > m.coins[side]) bad += 1;
          playCard(m, side, move.card.uid, move.stallIdx);
        } else passTurn(m, side);
      }
    }
    results.push(check('AI never overspends across 10 seeds', bad === 0, `${bad} bad moves`));
  }

  // 10. Balance: autopilot both sides, player win share stays between 25% and 75%.
  {
    let youWins = 0;
    let games = 0;
    for (let s = 0; s < 20; s++) {
      const m = newMatch(base + 200 + s);
      let turns = 0;
      while (m.phase !== 'over' && turns < 400) {
        turns += 1;
        if (m.phase === 'roundEnd') { nextRound(m); continue; }
        const side = m.turn;
        const move = chooseMove(m, side);
        if (move.type === 'play') playCard(m, side, move.card.uid, move.stallIdx);
        else passTurn(m, side);
      }
      games += 1;
      if (m.winner === 'you') youWins += 1;
    }
    results.push(check('balance: first player wins 25–75% of autopilot games',
      youWins >= 5 && youWins <= 15, `${youWins}/20`));
  }

  return results;
}

export function selfTestSummary(seed) {
  const results = runSelfTests(seed);
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, total: results.length };
}
