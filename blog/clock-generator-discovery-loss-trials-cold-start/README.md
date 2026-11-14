---
status: draft
title: "Measure first: the loss trials that found nothing"
date: "2026-11-14"
description: Before redesigning the loss trials, I measured what each stage costs and finds. The other starts found nothing and took 72 % of the loss trials' time.
tags: [clock-generator, discovery, recovery]
---

## The question

A clock is stable only if the build goes back to its rate by itself after a supply stop or an output blockage. The generator tests this with loss trials. Each loss is cut at 4 places and 4 lengths. In 0.29.0 each of these was run from the cold start, from every lane-phase start and under every taker order.

On a build with many moving belt pickups that was too many starts. Above a tick budget the trials were not run, and the clocks showed as Error. Two issues proposed designs: [#746](https://github.com/abucnasty/clock-generator/issues/746), sample the lane phases, and [#747](https://github.com/abucnasty/clock-generator/issues/747), deliver the clock first and run the loss trials in stages.

Before I designed either, I asked a smaller question. What does each stage of the loss trials cost, and what does it find?

## How it was measured

An AI agent instrumented the loss trials and ran them over the 86 jobs of the record, one process at a time so that the seconds were clean. The 86 jobs hold 423 clocks. 210 of them have starts other than the cold start. It timed three parts: the rest of the generation, the loss trials from the cold start, and the loss trials from the other starts. It then ran the generation again with the other stages off and compared the selection, the clock hashes and the verdicts.

## The result

| Part of the generation, over 86 jobs | Seconds |
| --- | --- |
| Everything else | 999.8 |
| Loss trials from the cold start | 127.2 |
| Loss trials from the other starts | 327.5 |

The other starts are 72 % of the loss trials' seconds. They found nothing the cold start misses. With them off, no selected clock and no clock hash differs. The only visible change is that on 8 clocks in 4 jobs a clock is back in 3 window cycles after a loss, where it was 5. The 5 came from a start at another lane phase.

So the idea of #746, to sample the lane phases, had nothing to sample: the other starts found no loss that the cold start misses.

## What changed

[#754](https://github.com/abucnasty/clock-generator/pull/754) removed the other starts from the loss trials. Every loss is now cut at 4 places and 4 lengths from the cold start only. The tick budget is gone, and so is its Error chip. The progress line names the loss, not a start.

| On the record of 86 jobs | Before | After |
| --- | --- | --- |
| Recommended clocks, verdicts, rates, wakeups, clock hashes | | none moved |
| Blast time, one process | 1,460.7 s | 1,137.3 s |

The first run of the blast had the measurement's timers in, so the blast time is a comparison, not a pure gain. The change shipped as [0.29.1](https://github.com/abucnasty/clock-generator/blob/master/CHANGELOG.md#0291---2026-11-14), the same day as 0.29.0: builds with many moving belt pickups now get their recovery checked.

A test, `loss-trials-cold-start`, has 3 cases that failed on the old code and pass now.

## What is kept, and what is not known

The clock-only check keeps its other taker orders. So does the check of start dependence, and the verdict of copies that share a lane.

A loss that only another start would find: none of the 423 clocks has one. Builds outside the record are not measured. If one turns up, the old trials are in the history and the record regenerates.

I also took a claim out. The first changelog line said that a build gets its recovery checked "and sooner". Commit cd2abf21 took out "and sooner", so the line says only that the recovery is checked.

## Where this fits

This change removes code, and it still touched the record: the results digest of 338 clocks changed, because the verdict no longer carries a field that was always empty. No recommended clock moved. The record shows what moved and what did not. That check is the subject of [the record as a merge gate](../clock-generator-discovery-the-record-as-merge-gate/README.md).

*Drafted with Claude from the project's logs.*
