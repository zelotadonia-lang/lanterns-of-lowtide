// Render: builds and updates the DOM table. Cards are real DOM elements so
// their text stays crisp at thumbnail size; suits are inline SVG shapes.

import { SUITS, STALLS, ROUNDS_TO_WIN } from './config.js';
import { stallTotal, stallLeader, effectivePower, chainBonus, outshoneBonus } from './state.js';
import { effectText } from './deck.js';

export function suitSvg(suit, size) {
  const s = SUITS[suit];
  const n = size || 22;
  if (s.shape === 'sun') {
    return `<svg width="${n}" height="${n}" viewBox="0 0 24 24" aria-label="${s.name}"><circle cx="12" cy="12" r="5" fill="${s.color}"/><g stroke="${s.color}" stroke-width="2" stroke-linecap="round"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/><line x1="19.1" y1="4.9" x2="17" y2="7"/><line x1="7" y1="17" x2="4.9" y2="19.1"/></g></svg>`;
  }
  if (s.shape === 'wave') {
    return `<svg width="${n}" height="${n}" viewBox="0 0 24 24" aria-label="${s.name}"><path d="M2 9 Q6 4 12 9 T22 9" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round"/><path d="M2 15 Q6 10 12 15 T22 15" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  }
  return `<svg width="${n}" height="${n}" viewBox="0 0 24 24" aria-label="${s.name}"><polygon points="12,2 19,9 16,22 8,22 5,9" fill="${s.color}"/></svg>`;
}

function cardEl(card, opts) {
  const o = opts || {};
  const s = SUITS[card.suit];
  const eff = effectText(card);
  const sel = o.selected ? ' selected' : '';
  const dim = o.dim ? ' dim' : '';
  const anim = o.anim ? ` ${o.anim}` : '';
  return `<div class="card suit-${card.suit}${sel}${dim}${anim}" data-uid="${card.uid}" data-cost="${card.cost}" tabindex="0" role="button" aria-label="${card.name}, power ${card.power}, cost ${card.cost}">
    <div class="card-top"><span class="coin" title="Cost">${card.cost}</span><span class="suit-mark">${suitSvg(card.suit, 20)}</span></div>
    <div class="card-power">${card.power}</div>
    <div class="card-name">${card.name}</div>
    ${eff ? `<div class="card-effect">${eff}</div>` : `<div class="card-suit-name">${s.name} · ${s.verb} ${s.beats === 'salt' ? 'Salt' : s.beats === 'tide' ? 'Tide' : 'Lantern'}</div>`}
  </div>`;
}

function cardBackEl() {
  return `<div class="card card-back"><div class="card-back-mark"></div></div>`;
}

function stallEl(state, i, ui) {
  const stall = state.stalls[i];
  const youTotal = stallTotal(state, 'you', i);
  const rivalTotal = stallTotal(state, 'rival', i);
  const leader = stallLeader(state, i);
  const badge = leader === 'you' ? 'you' : leader === 'rival' ? 'rival' : 'tie';
  const rivalCards = stall.cardsRival.map((c, idx) => {
    const bonus = effectivePower(state, 'rival', i, idx) - c.power;
    return `<div class="played-wrap">${cardEl(c, {})}${bonus > 0 ? `<span class="bonus">+${bonus}</span>` : ''}</div>`;
  }).join('');
  const youCards = stall.cardsYou.map((c, idx) => {
    const bonus = effectivePower(state, 'you', i, idx) - c.power;
    return `<div class="played-wrap">${cardEl(c, {})}${bonus > 0 ? `<span class="bonus">+${bonus}</span>` : ''}</div>`;
  }).join('');
  const wardNote = stall.wardYou ? '<span class="ward-tag">Saltwarden guard</span>' : stall.wardRival ? '<span class="ward-tag">Rival guard</span>' : '';
  return `<section class="stall" data-stall="${i}">
    <header class="stall-head"><span class="stall-name">${stall.name}</span><span class="stall-note">${stall.name === 'Fish Stall' ? 'the morning catch' : stall.name === 'Spice Stall' ? 'cinnamon and smoke' : 'dyed in lowtide'}</span></header>
    <div class="stall-totals"><span class="total rival ${badge === 'rival' ? 'leading' : ''}">${rivalTotal}</span><span class="vs">–</span><span class="total you ${badge === 'you' ? 'leading' : ''}">${youTotal}</span>${wardNote}</div>
    <div class="stall-row rival-row">${rivalCards || '<span class="empty-slot">no cards yet</span>'}</div>
    <div class="stall-mid"></div>
    <div class="stall-row you-row">${youCards || '<span class="empty-slot">play a card here</span>'}</div>
  </section>`;
}

function dots(won) {
  let out = '';
  for (let i = 0; i < ROUNDS_TO_WIN; i++) out += `<span class="dot ${i < won ? 'lit' : ''}">●</span>`;
  return out;
}

export function renderTable(root, state, ui) {
  const hand = state.hands.you.map((c) => {
    const afford = c.cost <= state.coins.you;
    return cardEl(c, { selected: ui.selectedUid === c.uid, dim: !afford, anim: 'dealt' });
  }).join('');
  const rivalBacks = state.hands.rival.map(() => cardBackEl()).join('');
  const stalls = state.stalls.map((_, i) => stallEl(state, i, ui)).join('');
  const logLines = state.log.slice(-6).map((l) => `<div class="log-line">${l}</div>`).join('');
  const intent = ui.intent ? `<div class="intent">${ui.intent}</div>` : '';
  const phaseNote = state.phase === 'roundEnd'
    ? `<div class="phase-note">${state.roundWinner === 'you' ? 'You take round ' + state.round + '.' : state.roundWinner === 'rival' ? 'The rival takes round ' + state.round + '.' : 'Round ' + state.round + ' is tied.'} <button id="next-round-btn" class="btn">Next round</button></div>`
    : '';
  root.innerHTML = `
  <div class="table-screen">
    <header class="topbar">
      <div class="brand">LANTERNS OF LOWTIDE</div>
      <div class="round-box">Round ${state.round} of 5
        <span class="score"><span class="who">You ${dots(state.roundsWon.you)}</span><span class="who">Rival ${dots(state.roundsWon.rival)}</span></span>
      </div>
      <div class="coins-box">Coins <b>${state.coins.you}</b> <span class="rival-coins">Rival ${state.coins.rival}</span></div>
      <button id="mute-btn" class="btn small">${ui.muted ? 'Sound off' : 'Sound on'}</button>
    </header>
    <div class="rival-zone">
      <div class="rival-hand">${rivalBacks}</div>
      <div class="rival-label">The Rival — ${state.hands.rival.length} cards in hand · ${state.passed.rival ? 'passed' : state.turn === 'rival' ? 'thinking…' : 'waiting'}</div>
      ${intent}
    </div>
    <main class="stalls">${stalls}</main>
    <div class="log">${logLines}</div>
    ${phaseNote}
    <footer class="player-zone">
      <div class="hand">${hand}</div>
      <div class="actions">
        <button id="pass-btn" class="btn primary" ${state.passed.you || state.phase !== 'play' ? 'disabled' : ''}>Pass this round</button>
        <div class="hint">Click a card, then a stall · 1–8 play · Space pass · M sound</div>
      </div>
    </footer>
  </div>`;
}

export function renderTitle(root, ui) {
  root.innerHTML = `
  <div class="title-screen">
    <div class="title-lanterns">${suitSvg('lantern', 54)} ${suitSvg('tide', 54)} ${suitSvg('salt', 54)}</div>
    <h1>LANTERNS<br>OF LOWTIDE</h1>
    <p class="tagline">A card duel in the flooded Saltmarket at dusk.<br>Three stalls. One suit cycle. A rival you can read.</p>
    <div class="how">
      <div><b>Win 2 of 3 stalls</b> to take a round. First to 3 rounds takes the market.</div>
      <div><b>Lantern outshines Salt, Salt preserves Tide, Tide douses Lantern</b> — +2 when your suit beats the top rival card.</div>
      <div><b>Surge:</b> a second card of the same suit in one stall gives +1 to the chain.</div>
      <div><b>Watch the rival.</b> It says which stall it eyes before it plays.</div>
    </div>
    <button id="start-btn" class="btn big">Light the lanterns — play</button>
    <div class="hint">Mouse and keyboard · 1–8 play a card · Space pass · M sound</div>
  </div>`;
}

export function renderEnd(root, state, ui) {
  const win = state.winner === 'you';
  const tie = state.winner === 'tie';
  const s = state.stats;
  root.innerHTML = `
  <div class="end-screen ${win ? 'win' : 'loss'}">
    <h1>${tie ? 'THE MARKET KEEPS ITS SECRET' : win ? 'THE MARKET IS YOURS' : 'THE LANTERNS GUTTER OUT'}</h1>
    <p class="tagline">${tie
      ? 'Five rounds, no winner. The tide takes the stakes back.'
      : win
        ? 'Every stallholder nods to you as the water falls.'
        : 'The rival takes the market tonight. Your lanterns burn low.'}</p>
    <div class="end-score">Rounds <b>${state.roundsWon.you} – ${state.roundsWon.rival}</b> · played over ${state.round} round${state.round > 1 ? 's' : ''}</div>
    <div class="end-stats">
      <div>Cards played <b>${s.cardsPlayed.you}</b> (rival ${s.cardsPlayed.rival})</div>
      <div>Surge chains <b>${s.surges.you}</b> · Outshone <b>${s.outshone.you}</b> · Storms <b>${s.cleared.you}</b></div>
    </div>
    <button id="again-btn" class="btn big">Play again</button>
    <div class="hint">Lanterns of Lowtide — a card duel in the flooded Saltmarket</div>
  </div>`;
}

export function renderSelfTest(root, summary) {
  const rows = summary.results.map((r) => `<div class="test-row ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'PASS' : 'FAIL'} — ${r.name}${r.detail ? ` (${r.detail})` : ''}</div>`).join('');
  root.innerHTML = `<div class="selftest"><h1>Self-test</h1><div>${summary.passed} / ${summary.total} passed</div>${rows}</div>`;
}
