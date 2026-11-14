---
status: draft
title: "Clock generator 0.25.0: loops, and which start to judge"
date: "2026-10-28"
description: Release 0.25.0 gave the inserters of a machine loop enable windows, and ranked such builds by their mean wakeups over 12 starts.
tags: [clock-generator, release]
---

## The problem

Some builds feed their own machines. In agricultural science the egg biochambers pass eggs to each other. In iron bacteria cultivation the machines pass bacteria. The inserters between these machines are the ones 0.25.0 gives enable windows, so that these builds need fewer wakeups.

A second problem sat under the first. A loop holds a stock that the clock does not set. So the wakeups of such a build depend on how it starts: where its clock stands when the machines start empty, and what the loop holds.

This is release [v0.25.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.25.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0250---2026-10-28) has the full list.

## What shipped

- **Windows for loops.** The inserters between the machines of a loop get enable windows where the clock still holds and recovers with them.
- **Ranking by the mean over 12 starts.** On a build with a machine loop, clocks are ranked by their mean wakeups over 12 starts. The Potential Clocks panel says so.
- **Early refusals.** A target rate that cannot be reached is refused at once, before any clock is tried. The message names the machines, inserters or belts that limit it.
- **Simulator fixes.** Productivity skips results the game excludes, such as returned asteroid chunks and barrel recipes. Only inserters that wait for a full hand in the game, such as stack inserters, wait for one. Stone and steel furnaces, burner mining drills and captive biter spawners burn fuel.
- **Short clocks.** Short window cycles no longer overstate items a second. That could change the closest clock.

## The finding: a fixed clock can settle in more than one state

I ran the iron bacteria sample with one window a window cycle on its loop inserters, from five starts. Each start settled for good, in a different place.

| Start | Wakeups a minute |
| --- | --- |
| 1 | 317 |
| 2 | 373 |
| 3 | 756 |
| 4 | 766 |
| 5 | 907 |

Each figure stayed within 2 % over ten stretches of 12,000 ticks of a run of 180,000. The seed of the loop moves the mean too. Over every place of the window cycle, the same clock gives 495 at a seed of 200, 566 at 100 and 670 at 50. So the seed belongs to the build the config describes, and the ranking does not average over it.

## How many starts

The rule is to rank a loop clock by its mean over a fixed set of starts: the cold start with the clock at twelve evenly spaced places in its window cycle. Twelve is not exact. Against every place of the window cycle:

- twelve places were within 7 % of the mean on 22 loop clocks and seeds, with a median of 1.6 %. They were within 1 % on 10 of them;
- twenty-four places were within 3.6 %, with a median of 0.4 %.

I kept twelve, which are the places the as-built check already judges a clock from.

## What I did not do

I did not extend the mean to every build. The simulator's wakeups were not yet near the game's. On the samples without a loop, 86 of the 247 stable clocks had a mean over twelve places more than 1 % off their cold figure. Ranking them by it moved the selection on nine samples, at 3.3 % more generation time where no clock got a mean and 16.3 % where some did. Every other build keeps the figure of its cold start.

## What went wrong

Windows on a loop can starve it. [Issue 516](https://github.com/abucnasty/clock-generator/issues/516), which is still open, says that on agricultural science the egg loop can run out of eggs under loop windows. Since then, a clock with windows for a loop carries the two-hop bound from that issue in its assessment. It is a report. It keeps, drops and ranks nothing.

## What came next

0.26.0 changed how ties between clocks are broken and how far the search goes. Read [0.26.0: fewer wakeups, and which clock wins a tie](../clock-generator-0-26-0-fewer-wakeups-on-ties/README.md).

*Drafted with Claude from the project's logs.*
