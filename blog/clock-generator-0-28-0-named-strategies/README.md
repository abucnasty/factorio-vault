---
status: draft
title: "Clock generator 0.28.0: named strategies and ghost wakeups"
date: "2026-11-07"
description: Release 0.28.0 added a router that picks a strategy for each source, shaped windows against ghost wakeups and renamed the site's words.
tags: [clock-generator, release]
---

## The problem

A build has several sources: machines, belts and chests that inserters take from. The generator has many clock strategies, and one strategy does not have to serve every source of a build. The new router of 0.28.0 gives each source's inserters the strategy that fits them.

The site also had a word problem. The glossary settled on "enable window" and lists "wake window" and "active window" as words to avoid. 0.28.0 brought the site's words in line with it.

This is release [v0.28.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.28.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0280---2026-11-07) has the list.

## What shipped

- **Coordinated Sources.** A new router gives the inserters of each source the strategy that fits them ([#699](https://github.com/abucnasty/clock-generator/pull/699)). It is made after every other clock. For each source it uses the enable windows of one clock that the other makers built. It chooses source by source, from the output upstream, by simulated wakeups.
- **A clock for some inserters, one tick.** A new clock enables some inserters for one tick at each swing.
- **Fewer wakeups.** 24 builds recommend clocks with fewer wakeups, among them accumulator, processing unit and chemical science.
- **Euclidean Swings** falls back to fewer output swings where the machine cannot take them.
- **The glossary's words.** The site now says enable window, wakeup, window cycle time, recovery and configuration. Clocks are named for the practice they follow, and the table shows signals a minute.
- **Fixed:** belt slack and low insertion limits honor the item's stack size during a swing.

0.28.1 followed on the same day. It fixed the page not starting in Safari and on iPhones, where it loaded forever.

## The numbers

Wakeups a minute on the recommended clock of four samples, before and after Coordinated Sources. The game column is the count from the game test of the new clock (the first figure of each pair that the record gives).

| Sample | Before | After | Game |
| --- | --- | --- | --- |
| Accumulator | 889.072 | 696.44 | 696.5 |
| Chemical science, shared foundry | 163.791 | 81.896 | 81.8 |
| Logistic science, direct insert | 200.069 | 100.035 | 100.0 |
| Utility science and processing unit on one belt | 42.985 | 32.239 | 32.2 |

The game's count is close to the simulator's on all four. The record keeps these moves, each with its reason. [The record as a merge gate](../clock-generator-discovery-the-record-as-merge-gate/README.md) tells how.

## What I learned

**Room for one more hand belongs inside the window.** On the logistic science sample, a hand-made clock of 176 ticks with two pickup windows, 52-71 and 76-95, was better than the clock the generator found ([issue 595](https://github.com/abucnasty/clock-generator/issues/595)). The generator had added 4 ticks of room after each window. The two windows then joined into one, 52-99, at 61.714 wakeups a minute. With the room kept inside the windows, the clock costs 20.571. Before that fix, the selected clock for this sample was at 41.379.

**A ghost wakeup can sometimes be removed by closing a window earlier.** A ghost wakeup is a wakeup that does nothing: the clock switched the inserter off while it was asleep on a machine's list. 0.28.0 shapes the windows of the primary clock against them ([issue 641](https://github.com/abucnasty/clock-generator/issues/641)). On the electric furnace sample, the output inserter took a part hand of 6 at the end of each of its 9 windows a window cycle. Closing the windows 8 ticks earlier leaves the 6 for the next window. The clock wakes 62.5 times a minute, against 100.

**It does not always work.** Where the hand at the end of a window is one the build needs, an earlier closing edge does not hold. On the logistic science sample the output inserter's last part hand of 10 keeps the assembler from blocking at its output. Its ghost wakeup, all of its 20.57 wakeups a minute, stays. On two other builds, a closing edge moved alone cleared 1 of 3 and 2 of 6 ghost-causing windows. The rest needed the window dropped or changed in another way.

## What came next

0.29.0 changed what a clock is judged on. Until then a clock was judged on one copy. Read [0.29.0: belts, lane by lane](../clock-generator-0-29-0-belts-lane-by-lane/README.md).

*Drafted with Claude from the project's logs.*
