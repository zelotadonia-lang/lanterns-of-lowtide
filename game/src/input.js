// Input: mouse and keyboard. Click a hand card to select it, click a stall
// to play it there. Space passes, M toggles sound, Enter starts or restarts.

import { playCard, passTurn, nextRound, canPlay } from './state.js';
import { chooseMove, intentLine } from './ai.js';
import { playCardSound, playSurge, playPass, playRoundWin, playWin, playLoss, toggleMute } from './audio.js';

export function attachInput(root, getState, ui, rerender) {
  root.addEventListener('click', (ev) => {
    const state = getState();
    const t = ev.target;

    const startBtn = t.closest('#start-btn');
    if (startBtn) {
      ui.screen = 'table';
      rerender();
      return;
    }
    const againBtn = t.closest('#again-btn');
    if (againBtn) {
      ui.restart();
      return;
    }
    const nextBtn = t.closest('#next-round-btn');
    if (nextBtn && state && state.phase === 'roundEnd') {
      nextRound(state);
      playRoundWin();
      rerender();
      return;
    }
    const muteBtn = t.closest('#mute-btn');
    if (muteBtn) {
      ui.muted = toggleMute();
      rerender();
      return;
    }
    const passBtn = t.closest('#pass-btn');
    if (passBtn && state && state.phase === 'play' && !state.passed.you) {
      passTurn(state, 'you');
      playPass();
      ui.selectedUid = null;
      rerender();
      scheduleRival(getState, ui, rerender);
      return;
    }
    if (!state || state.phase !== 'play' || state.turn !== 'you' || state.passed.you) return;

    const cardEl = t.closest('.hand .card');
    if (cardEl) {
      const uid = Number(cardEl.dataset.uid);
      const card = state.hands.you.find((c) => c.uid === uid);
      if (!card || card.cost > state.coins.you) return;
      ui.selectedUid = ui.selectedUid === uid ? null : uid;
      rerender();
      return;
    }
    const stallEl = t.closest('.stall');
    if (stallEl && ui.selectedUid != null) {
      const stallIdx = Number(stallEl.dataset.stall);
      const r = playCard(state, 'you', ui.selectedUid, stallIdx);
      if (r.ok) {
        ui.selectedUid = null;
        if (r.chain > 0) playSurge();
        else playCardSound();
        rerender();
        scheduleRival(getState, ui, rerender);
      }
    }
  });

  root.addEventListener('keydown', (ev) => {
    const state = getState();
    if (ev.key === 'm' || ev.key === 'M') {
      ui.muted = toggleMute();
      rerender();
      return;
    }
    if (ui.screen === 'title' && (ev.key === 'Enter' || ev.key === ' ')) {
      ui.screen = 'table';
      rerender();
      return;
    }
    if (ui.screen === 'end' && ev.key === 'Enter') {
      ui.restart();
      return;
    }
    if (!state || state.phase !== 'play' || state.turn !== 'you' || state.passed.you) return;
    if (ev.key === ' ') {
      ev.preventDefault();
      passTurn(state, 'you');
      playPass();
      ui.selectedUid = null;
      rerender();
      scheduleRival(getState, ui, rerender);
      return;
    }
    const n = Number(ev.key);
    if (n >= 1 && n <= 8) {
      const card = state.hands.you[n - 1];
      if (card && card.cost <= state.coins.you) {
        ui.selectedUid = ui.selectedUid === card.uid ? null : card.uid;
        rerender();
      }
    }
  });
}

// The rival moves once, after a short beat, with its intent shown first so
// the player can read what it is about to do.
export function scheduleRival(getState, ui, rerender) {
  const state = getState();
  if (!state || state.phase !== 'play') return;
  if (state.turn !== 'rival' || state.passed.rival) {
    if (state.passed.you && state.passed.rival) return;
    if (state.passed.rival) return;
  }
  setTimeout(() => {
    const s = getState();
    if (!s || s.phase !== 'play' || s.turn !== 'rival') return;
    if (s.passed.rival) return;
    const move = chooseMove(s, 'rival');
    ui.intent = intentLine(s, move);
    rerender();
    setTimeout(() => {
      const s2 = getState();
      if (!s2 || s2.phase !== 'play' || s2.turn !== 'rival' || s2.passed.rival) return;
      if (move.type === 'play') {
        const r = playCard(s2, 'rival', move.card.uid, move.stallIdx);
        if (r.ok && r.chain > 0) playSurge();
        else if (r.ok) playCardSound();
      } else {
        passTurn(s2, 'rival');
        playPass();
      }
      ui.intent = null;
      rerender();
      // If the player already passed, the rival keeps playing until it
      // passes too; keep the chain going.
      if (s2.phase === 'play' && s2.passed.you && !s2.passed.rival && s2.turn === 'rival') {
        scheduleRival(getState, ui, rerender);
      }
      if (s2.phase === 'over') {
        if (s2.winner === 'you') playWin();
        else if (s2.winner === 'rival') playLoss();
        ui.screen = 'end';
        rerender();
      }
    }, 650);
  }, 350);
}

export function maybeEndGame(getState, ui, rerender) {
  const s = getState();
  if (s && s.phase === 'over' && ui.screen !== 'end') {
    if (s.winner === 'you') playWin();
    else if (s.winner === 'rival') playLoss();
    ui.screen = 'end';
    rerender();
  }
}
