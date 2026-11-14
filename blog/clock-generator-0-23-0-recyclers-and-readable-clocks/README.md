---
status: draft
title: "Clock generator 0.23.0: recyclers, and clocks you can read"
date: "2026-10-27"
description: Release 0.23.0 gave recyclers a clock, cut the number of deciders in a blueprint and made long builds generate much faster.
tags: [clock-generator, release]
---

## The problem

The [roadmap](https://github.com/abucnasty/clock-generator/blob/master/clock-generator/docs/ROADMAP.md) lists recyclers as milestone M3, and 0.23.0 is the release that delivered them. The same roadmap lists three other families that this release brought in: loops of biochambers, builds whose items spoil, and the original electromagnetic science scaffold.

The release also made clocks smaller and clearer: fewer deciders in the blueprint, and results that give their reasons.

This is release [v0.23.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.23.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0230---2026-10-27) has every line.

## What shipped

- **Recyclers.** A recycler that puts its results into a container, such as an ore voider, gets a clock. So does one that puts them straight into another machine. Results that come by small chances, such as scrap into a rocket silo, get one window a window cycle for each result.
- **Target Output** counts items that are destroyed, not only items that are made.
- **Small batches.** Where no planned clock holds, this clock moves a few hands at a time.
- **Fewer deciders.** Inserters with the same windows now share one decider.
- **Clearer results.** The result says why an inserter is always on, names the items in a loss and groups the combinators.
- **Belt bends.** Inputs that pick up from a supported belt bend get a clock. Older captures of a bend must be captured again.
- **Removed:** clocks for a shorter period that were "not in the period".

## What I learned

**A clock is stable only if it holds whichever inserter the game serves first.** When several inserters take from one machine, the game serves them in an order. The simulator now serves them in that order too. A clock must hold for every order the game may use.

**Recovery is not tried on every loss.** The generator now tries a build whose items spoil with losses shorter than the spoil times: three quarters of the spoil time, the roadmap says. It also stops at the first loss a clock fails, and the result shows that.

**Where the time went.** One sample, a processing unit build with a belt export, took over five minutes to generate ([issue 101](https://github.com/abucnasty/clock-generator/issues/101)). 60 % of a generation went into grouping about 70,000 transfers a call. A sorted sweep does that now ([#406](https://github.com/abucnasty/clock-generator/pull/406)). A run made again with the same config and options is made once ([#408](https://github.com/abucnasty/clock-generator/pull/408)). The loss trials of a clock are made once in a generation ([#409](https://github.com/abucnasty/clock-generator/pull/409)). Equal reason texts are stored once ([#433](https://github.com/abucnasty/clock-generator/pull/433)).

## The numbers

Processing unit sample with a belt export, on one desktop machine. The times compare the versions with each other. They are not absolute.

| | Before | After |
| --- | --- | --- |
| Generation, belts moving | 260 s | 68 s |
| Generation, belts backed up | 231 s | 62 s |
| Peak memory (#433 alone) | 3.10 GiB | 2.65 GiB |

The memory row is a different measurement from the one in the next post, which starts the same sample at 3,282 MB.

## What came next

0.24.0 was tagged the same day. Its plan says that checking a change takes long and that a large build takes a lot of memory, so each change waits for its checks. Read it in [0.24.0: ship faster](../clock-generator-0-24-0-ship-faster/README.md).

*Drafted with Claude from the project's logs.*
