---
status: draft
title: "Clock generator 0.29.0: belts, lane by lane"
date: "2026-11-14"
description: Release 0.29.0 models each belt lane and runs every copy of a build on the lanes the copies share.
tags: [clock-generator, release]
---

## The problem

Until 0.29.0 the generator judged a clock on one copy of a build. But a real build is often several copies side by side, and the copies take from the same belt. A hand that one copy takes leaves a gap in the lane. The next copy can find fewer items than it planned for.

This is release [v0.29.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.29.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0290---2026-11-14) has 48 lines. The finding behind it is in [the gap in an input lane](../clock-generator-discovery-gap-in-an-input-lane/README.md).

## What shipped

**Generation**

- Copies are run together on the lanes they share, each belt lane by lane. A copy that misses swings reads Underproduces.
- The disturbance trials, a supply stop or an output blockage, run on one copy and then on the copies.
- A build that holds identical copies is clocked as given, no longer refused.
- Of clocks with equal wakeups, the one with fewer signals a minute is recommended.

**The site**

- The form sets each belt's flow direction and each lane's end, supply rate and sharing.
- Diagnostics shows the selected clock's tests, its shared lanes and why it is not stable.
- A clock that makes its rate only on average reads Oscillates, with an output chart.
- Statuses were renamed: Stable, Underproduces, Overproduces and Error replace the earlier ones. A rounded clock that meets the target reads Stable.
- Results shows the clocks as a list beside the selected clock. Compare all opens a table with a Rank column.
- The site moved to [clock.abucnasty.dev](https://clock.abucnasty.dev). Builds saved at the old address stay there.

The release also removed a lot of text and chips from the cards and the compare table. Eleven lines of the changelog are removals.

## The numbers

The pull request that made this change, [#748](https://github.com/abucnasty/clock-generator/pull/748), is large.

| | |
| --- | --- |
| Files changed | 754 |
| Lines added and removed | 50,295 and 6,435 |
| Record files changed against master | 86 of 88 (84 moved, 2 added, 2 removed, 1 renamed) |
| Unit tests | 5,291 in 328 files |
| Generation tests | 141 in 30 files |
| Site tests | 3,081 in 175 files |

Every moved job is in the [record's list of moves](https://github.com/abucnasty/clock-generator/blob/master/clock-generator/record/MOVES.md), each with its reason. Samples that had a clock which loses swings once the copies share a lane got another clock, or a lower verdict. For example, on the automation science sample the old clock had copy 2 missing 9 of its 65 copper plate swings.

## What I learned

**A clock can be right for one copy and wrong for the row.** The old clocks were judged on one copy. The check of the row found what the single copy could not.

**I accepted the moves as corrections.** The record says so for the 0.29.0 moves. The engine now also runs the copies on the lanes they share, and the samples state their lanes. Some clocks got more wakeups: on the automation science sample the recommended clock went from 50.174 to 300.696 wakeups a minute, because the cheaper clock lost swings on the shared lane.

**Loss trials had a budget, and it hurt.** A build whose loss trials plan more than 200 million ticks gets its clocks without them, and the pull request lists this as an effect on users ([#746](https://github.com/abucnasty/clock-generator/issues/746), [#747](https://github.com/abucnasty/clock-generator/issues/747)). Such a clock showed as Error. A post of the series tells what happened to that budget: [the loss trials from the cold start](../clock-generator-discovery-loss-trials-cold-start/README.md).

## What came next

[0.29.1](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0291---2026-11-14) was tagged the same day. It has one line: builds with many moving belt pickups now get their recovery checked.

*Drafted with Claude from the project's logs.*
