---
status: draft
title: "Clock generator 0.26.0: fewer wakeups, and which clock wins a tie"
date: "2026-11-01"
description: Release 0.26.0 searched past a stable clock for one with fewer wakeups, broke ties by recovery and stopped counting wakeups the game does not make.
tags: [clock-generator, release]
---

## The problem

The generator makes some clocks straight from a plan. It finds others by a search, which tries many clocks in the simulator. The searches take about nine tenths of the ticks a generation simulates. So they only ran when no clock made without a search was stable. In other words, goal 1 (the clock meets its setpoint and recovers) decided whether the generator searched, and goal 2 (the fewest wakeups) did not.

That left wakeups on the table. A stable clock from the plan ended the search, even where a search could find a stable clock with fewer wakeups.

This is release [v0.26.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.26.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0260---2026-11-01) has every line.

## What shipped

- **Search past a stable clock.** Where a stable clock still has wakeups, the searches for observed windows and for shifted swings now look for one with fewer. They do this on window cycle times up to 480 ticks.
- **Ties go to recovery.** When clocks tie on wakeups, the one that recovers sooner after inputs stop or outputs back up is picked.
- **Fewer wakeups counted.** An inserter whose arm is still swinging back from its drop is no longer counted as woken, because the game does not wake it. Some builds get another clock because of this.
- **Over the target beats unstable.** When no clock holds the target rate, a stable clock that runs over it is picked before an unstable one nearer to it. The page says how far over the rate the clock runs.
- **Removed:** duplicates. A subtick clock is no longer also listed rounded down. All results at once is no longer offered for a recycler's rare results.
- **Fixed:** a clock for a recycler that is fed back its own results is now also tried with a run of results above their mean. Before that it could be called stable and come up short in the game.

## What the search cost and found

I ran every search on every sample, as built and backed up. The two searches that now run past a stable clock found fewer wakeups on 8 of 106 jobs. They cost 22.7 % of what running all four searches everywhere costs. The other two searches are not run by default. A user who wants them turns on "Search for fewer wake-ups", and then the clock with the fewest wakeups of all is selected.

So the default search is narrow. Its gain is on a small share of jobs.

## What I learned: a wakeup the game does not make

The simulator counted a wakeup for an inserter that was swinging its arm back from a drop. The game does not wake such an inserter, whatever state it shows. It shows "waiting for space" on the return swing when the machine it dropped into is full.

On the circuit export sample the effect is large. On its recommended clock, the alarms that reach an inserter with its arm away are 3,994 of 11,561 a minute. That is 34.5 %, nearly all of it on the eight takers of the electronic circuit plants. The count now takes the arm as away from the tick its hand empties, for the turn's ticks and one. That is 4 ticks for the legendary stack inserter. The count keeps these alarms apart, so they stay visible.

## What did not ship

[Pull request 530](https://github.com/abucnasty/clock-generator/pull/530) proposes to rank clocks that hold and recover by a priced cost estimate, with ties parted by recovery. It is still open. The generator still selects the clock with the fewest wakeups among those that meet goal 1. The tie rule of that title, recovery, is in 0.26.0.

## What came next

The count of wakeups was still not the game's count. 0.27.0 went to the game to measure it. Read [0.27.0: the game's update order](../clock-generator-0-27-0-the-games-update-order/README.md).

*Drafted with Claude from the project's logs.*
