---
status: draft
title: "Clock generator 0.27.0: the game's update order"
date: "2026-11-04"
description: Release 0.27.0 made the simulator update inserters in the game's order, so its wakeup count moved toward the game's count.
tags: [clock-generator, release]
---

## The problem

The generator ranks clocks by wakeups. A ranking is only as good as the count behind it. Up to 0.26.0 the simulator did not update inserters in the game's order, and its count of wakeups missed some that the game makes. The details of that measurement are in [the post on counting wakeups in the game](../clock-generator-discovery-game-wakeups/README.md). This post is about the release.

This is release [v0.27.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.27.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0270---2026-11-04) has the list. Two small releases followed it, 0.27.1 on the same day and 0.27.2 on 5 November. They are told here too.

## What shipped

In 0.27.0:

- **Inserters update in the game's order.** The simulator now updates them as the game does.
- **Wakeups match the game's count.** The wakeups shown for each clock now match the game's count, mostly going up.
- **No more clocks that fall one item short.** A clock that falls one item short over a long run is no longer stable.
- **Moving express belts** into electromagnetic plants, and their front exits, get a stable clock.
- **Removed:** the recycling scrap silo sample.

In [0.27.1](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0271---2026-11-04), fractional swings became a potential clock on every build, so its switch is gone. Two examples changed: Electromagnetic science no longer forces swings or hand-made output conditions, and Logistic science pack is now 1 machine and 2 inserters.

In [0.27.2](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0272---2026-11-05), inserters that take several items from one infinity chest pick them in the game's order.

## The numbers

I counted the wakeups of one build in the running game: a front-exit build, with one inserter taking from a machine onto a belt and one putting into it. Its window cycle time is 1,408 ticks. The count is per window cycle.

| | Wakeups by a machine | Wakeups by the clock switching an inserter on |
| --- | --- | --- |
| The game | 15 | 19 |
| The count before 0.27.0 | 10 | not counted |

The count leaves out the switch-ons on purpose. They are the clock's doing, not a machine's. So the figure to compare is 10 against 15. The pull requests that fixed the count are [#563](https://github.com/abucnasty/clock-generator/pull/563), [#565](https://github.com/abucnasty/clock-generator/pull/565) and [#571](https://github.com/abucnasty/clock-generator/pull/571).

## What I learned

**An inserter can sleep and wake in the same tick.** An inserter woken in one tick is updated in the next. If its hand is not full, it goes back to sleep in that update. A result that the machine places later in the same tick wakes it again. The old count missed this.

**A switch-off sends no alarm.** An inserter that is asleep on a machine's list when its clock switches it off stays on that list. The machine's next alarm wakes it. It sees that it is disabled and sleeps on no list. That wakeup does nothing, and the clock caused it. I call it a ghost wakeup. 0.28.0 shaped the enable windows against it.

**The order matters.** The game updates first the inserter that joined the update list last. That is why the simulator's order changed.

These findings stand on three builds, with one capture each. The glossary marks the switch-off case as provisional: observed on three builds in Factorio 2.1.24, and its cost not measured.

## What came next

0.28.0 came three days later. It named the strategies, made new clocks, and shaped windows against ghost wakeups. Read [0.28.0: named strategies](../clock-generator-0-28-0-named-strategies/README.md).

*Drafted with Claude from the project's logs.*
