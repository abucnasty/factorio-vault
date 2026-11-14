---
status: draft
title: "Counting wakeups in the game, not in the simulator"
date: "2026-11-03"
description: How the game was read to find out why the simulator and the game disagreed on wakeup counts, and what the rule became.
tags: [clock-generator, discovery, simulator]
---

## The question

The generator picks the clock with the fewest wakeups. A wakeup is one time an alarm reaches an inserter that is asleep. The game then checks whether the inserter can do something. So the simulator's count must be the game's count, or the ranking is wrong.

Was it? And if not, why?

## How it was measured

Factorio has a debug setting, `show-wakeup-lists`. It draws a line from a waiting inserter to what it waits on. A line that flickers on and off is an inserter that keeps getting woken for nothing.

I read the running game, Factorio 2.1.24, on three builds. Each had one capture of 10 window cycles of its clock:

| Build | Window cycle time |
| --- | --- |
| Front-exit: one inserter takes from a machine onto a belt, one puts into it | 1,408 ticks |
| Electromagnetic science | 704 ticks |
| Agricultural science: five biochambers, twelve inserters | 480 ticks |

A fourth build, metallurgic science at 640 ticks, tested belt pickups. Then I wrote a rule from what the game did, and checked it tick for tick against the recordings.

## The result

On the front-exit build, the old count gave 10 wakeups a window cycle where the game has 15 by a machine. The game has 19 more that the clock causes by switching an inserter on. The count leaves those out on purpose.

Four things explained the gap.

1. **A switch-off sends no alarm.** An inserter that is asleep on a machine's list when its clock switches it off stays on the list. The machine's next alarm wakes it. It sees that it is disabled and sleeps on no list. The wakeup does nothing: a ghost wakeup. On the front-exit build this happens to the output inserter at clock positions 288, 687 and 1072.
2. **An inserter can sleep and wake again in one tick.** It is updated, finds a part hand and goes back to sleep. A result that the machine places later in the same tick wakes it again.
3. **A taker that took part of a hand sleeps on two lists.** These are the machine's output list and the list of what it puts into. On the front-exit build the output inserter did this in 80 of 150 sleeps.
4. **The update order.** The game updates first the inserter that joined the update list last. One woken by another inserter's take comes first, then one woken by a machine, then one switched on by its clock.

On agricultural science, a rule built from these gave all 2,792 of the game's wakeups, and 7 more. The 7 are two inserters woken by two machines in one tick, in an order that a recording does not hold. On metallurgic science, two belt-fed inserters sleep only while both lines of their belt are still. A line moves while it closes the gaps that takes leave. Worked out from the takes in the recording, this gave every tick on which the game moved either line, 9,658 of 9,658, and no other.

The simulator's own count, after the change, is within 3 % of the game's per inserter on agricultural science, and at the game's ticks for 97 % of its wakeups.

## What changed

- The rule became one rule, "kept-lists". It reads each inserter's lists tick by tick. It was merged in three pull requests: [#563](https://github.com/abucnasty/clock-generator/pull/563), [#565](https://github.com/abucnasty/clock-generator/pull/565) and [#571](https://github.com/abucnasty/clock-generator/pull/571).
- The simulator's update list became the only dispatch, and shipped in [0.27.0](../clock-generator-0-27-0-the-games-update-order/README.md).
- Ghost wakeups became something the generator can design against. 0.28.0 shapes the enable windows so that an inserter, when its window closes, has an empty hand and goes on no list ([issue 641](https://github.com/abucnasty/clock-generator/issues/641)).
- The documentation of the measurement is in [wake-ups.md](https://github.com/abucnasty/clock-generator/blob/master/clock-generator/docs/wake-ups.md), and the glossary has the terms.

## What is not known

The glossary marks the switch-off case as provisional. It was observed on three builds in Factorio 2.1.24, and its cost was not measured. I do not know what a ghost wakeup costs in time. The count treats it as one wakeup.

Not tested: an inserter with an empty hand at a belt drop without room. Other belt speeds and stack sizes are not tested either.

The simulator was not exact on everything. After the change, the fuel of agricultural science is taken a tick early, because the simulator's burning item runs a fraction of a tick ahead of the game's.

*Drafted with Claude from the project's logs.*
