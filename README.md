# lanterns-of-lowtide

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/zelotadonia-lang/lanterns-of-lowtide/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/zelotadonia-lang/lanterns-of-lowtide/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

A card duel in the flooded Saltmarket at dusk: three stalls, one suit cycle, and a rival you can read. Win 2 of 3 stalls to take a round; first to 3 rounds takes the market.

## How it plays

- **Three stalls, best of five rounds.** Play cards into the Fish, Spice and Silk stalls. When both sides pass, the higher total takes each stall; win 2 or more stalls to take the round.
- **A suit cycle, not a coin flip.** Lantern outshines Salt, Salt preserves Tide, Tide douses Lantern. A card whose suit beats the top rival card in its stall gets +2.
- **Surge chains.** A second card of the same suit in the same stall gives +1 to the chain.
- **Three specials.** Lamplighter (Lantern) boosts a whole stall by +2. Stormcaller (Tide) washes away the weakest rival card there. Saltwarden (Salt) guards a stall and blocks the rival surge.
- **A rival you can read.** Before every move it says which stall it eyes, and it follows rules you can learn: defend a close stall, answer a big card, save its Stormcaller for a real threat.
- **Coins, not luck.** Start with 3 coins, gain 2 each round, cap 8. Every card costs coins, so each hand asks where the money goes.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 in desktop Chrome. Mouse and keyboard: click a card, then a stall; 1–8 play a card, Space passes, M toggles sound. Staged screens for screenshots: `?screen=title|table|win|loss&seed=11`. Logic self-test: `?selftest=1`, or in Node:

```sh
node --input-type=module -e "import { runSelfTests } from './game/src/selftest.js'; console.log(runSelfTests(7).map(r => (r.pass ? 'PASS' : 'FAIL') + ' ' + r.name).join('\n'))"
```

No build step, no network, no libraries. The game is plain files under `game/`; `main.ts` copies them to `/output` with a dossier for the make.fun grader.

---

<sub>Entered on [make.fun](https://make.fun/?ref=yk7ez00m&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
