// Boot: wires state, render and input together. Reads ?screen=title|table|
// win|loss&seed=N for staged screenshots and ?selftest=1 for logic tests.

import { newMatch } from './state.js';
import { renderTable, renderTitle, renderEnd, renderSelfTest } from './render.js';
import { attachInput, scheduleRival } from './input.js';
import { stagedState } from './staging.js';
import { selfTestSummary } from './selftest.js';
import { playDeal } from './audio.js';

const root = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam : 20261123;

const ui = {
  screen: 'title',
  selectedUid: null,
  intent: null,
  muted: false,
  restart() {
    state = newMatch((seed + Math.floor(Math.random() * 100000)) >>> 0);
    ui.screen = 'table';
    ui.selectedUid = null;
    ui.intent = null;
    playDeal();
    rerender();
  },
};

let state = newMatch(seed);

function rerender() {
  if (ui.screen === 'title') {
    renderTitle(root, ui);
    return;
  }
  if (ui.screen === 'end') {
    renderEnd(root, state, ui);
    return;
  }
  if (state.phase === 'over') {
    ui.screen = 'end';
    renderEnd(root, state, ui);
    return;
  }
  renderTable(root, state, ui);
}

function getState() {
  return state;
}

attachInput(root, getState, ui, rerender);

const screenParam = params.get('screen');
if (params.get('selftest') === '1') {
  const summary = selfTestSummary(seed);
  renderSelfTest(root, summary);
  document.title = `Self-test ${summary.passed}/${summary.total}`;
} else if (screenParam) {
  const staged = stagedState(screenParam, seed);
  ui.screen = staged.screen === 'table' ? 'table' : staged.screen;
  if (staged.state) state = staged.state;
  if (staged.screen === 'win' || staged.screen === 'loss') ui.screen = 'end';
  rerender();
} else {
  rerender();
}

export { state, ui, rerender };
