---
status: draft
title: "Clock generator 0.24.0: ship faster"
date: "2026-10-27"
description: Release 0.24.0 cut the memory of a large build to about a third and the blast of the samples from 21 minutes to under 3.
tags: [clock-generator, release]
---

## The problem

Checking a change of the generator took long, and a large build took a lot of memory. So fewer checks could run at once, and every change waited for them. The plan for 0.24.0 says this in its first paragraph. The release was about that loop, from an edit to a merged change, and about nothing else.

This is release [v0.24.0](https://github.com/abucnasty/clock-generator/releases/tag/v0.24.0). Its [changelog section](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0240---2026-10-27) has three lines.

## What shipped

For a user:

- Large builds take less memory and generate faster.
- Clocks are made only for the belt setting the build has, moving or backed up. Before, both were made.
- Pickups from an underground end on backed-up normal-speed belts now get a stable clock. Each input window now gives the belt time to bring a whole hand. This is the one change of a result that the plan allowed. It is [issue 456](https://github.com/abucnasty/clock-generator/issues/456): no clock held on three normal-speed pickup and front-exit fixtures.

For the loop of work, which the changelog leaves out on purpose:

- The history of a run is kept in typed columns, one sealed copy shared by every run that keeps it ([#454](https://github.com/abucnasty/clock-generator/pull/454)).
- The blast of the samples generates only the belt setting each sample has ([#459](https://github.com/abucnasty/clock-generator/pull/459)).
- CI runs the generation tests in 8 shards ([#461](https://github.com/abucnasty/clock-generator/pull/461)).

## The numbers

The plan measured the start before any change. The times depend on the machine. They compare the versions with each other.

| | Before | After | Pull request |
| --- | --- | --- | --- |
| Peak memory, processing unit sample | 3,282 MB | 960 MB | [#454](https://github.com/abucnasty/clock-generator/pull/454) |
| Blast of the samples | 21 minutes | 2 minutes 51 seconds | [#459](https://github.com/abucnasty/clock-generator/pull/459) |
| Generation tests in CI | 7.6 minutes | 3.7 minutes | [#461](https://github.com/abucnasty/clock-generator/pull/461) |

## What I learned

**The blast made clocks it did not need.** The blast generated clocks for both belt settings of every sample. The plan changed three things: clocks only for the belt setting the sample is configured with, the recording off, and the slowest jobs first so that the parallel processes finish together. That took the blast from 21 minutes to 2 minutes 51 seconds.

**A transition took 64 to 72 bytes.** One entry in the history of an entity holds the tick, the status it came from, the status it went to and the reason. In typed columns it takes about 10 bytes. This is the change that took the peak memory down.

**Some work was left alone.** The plan considered bounding the memo by bytes and skipped it: the memo measured 155 MB, against the 300 MB at which bounding would pay. The plan also measured memory and speed once on the release candidate, and did not time each change.

**The rule for the release.** The plan allowed no change of a result, except the backed-up fix. Every sample's recommended clock and verdict had to stay the same unless a change said so.

## What came next

The plan for 0.25.0 says it follows 0.24.0 "so that a refactor of this size can be checked quickly". That refactor rebuilds the engine from components. The 0.25.0 changelog starts with machine loops. Read it in [0.25.0: loops and starts](../clock-generator-0-25-0-loops-and-starts/README.md).

*Drafted with Claude from the project's logs.*
