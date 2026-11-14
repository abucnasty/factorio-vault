---
status: draft
title: "The clock generator: what it is, and where it stood at 0.22"
date: "2026-10-24"
description: What the clock generator does, the words this series uses, and what it could do by release 0.22.0, 21 days after its first tag.
tags: [clock-generator, introduction]
---

## What it is

The [clock generator](https://clock.abucnasty.dev) plans circuit clocks for Factorio builds. You describe a build: its machines, inserters, belts, chests and drills, and the rate it should make. The generator simulates it tick by tick. It works out when each inserter has to be enabled. Then it gives you a blueprint of decider combinators that clock the inserters, so the build holds exactly its rate with as few inserter wakeups as it can.

It lists the clocks it could make. It says which of them hold the rate and go back to it by themselves after a supply stop or an output blockage. It selects one. The source is at [abucnasty/clock-generator](https://github.com/abucnasty/clock-generator).

I direct the work, and AI agents did much of the building and measuring. This series tells the development from release 0.23.0 to 0.29.0, and a few findings. The posts are drafted with Claude from the project's logs.

## The words of the series

The project keeps a glossary. These are the words these posts use.

| Word | Meaning |
| --- | --- |
| Setpoint | The product a build must make and the rate it must hold, in items per second, for all copies. The user sets it. |
| Clock | One set of combinators the generator made for a build and checked in the simulator. |
| Enable window | The ticks of the window cycle during which the clock makes an inserter's Enable if condition true. |
| Window cycle time | The time of one window cycle, in ticks. A window cycle is one complete sequence of all enable windows. |
| Swing | One move of an inserter from its pickup to its drop. |
| Wakeup | One time an alarm reaches an inserter that is asleep. The game then checks whether the inserter can do something. |
| Stable | A clock is stable when it holds its setpoint and recovers after every disturbance trial. |

The generator has two goals, in order. Goal 1: the clock meets its target exactly and has recovery. Goal 2: the fewest wakeups.

## The first 21 days

The first tag, v0.1.0, is dated 3 October 2026. Release 0.22.0 is dated 24 October. In between there are 29 tagged versions.

| Version | Date | What it added |
| --- | --- | --- |
| 0.17.0 | 17 Oct | The site rebuilt: several saved builds, share by link, undo, a build diagram that replays item flow |
| 0.18.0 | 18 Oct | Belt pickups modelled from the stacks within reach; straight or underground pickups chosen per inserter |
| 0.19.0 | 21 Oct | Belt pickups match the game at all four belt speeds; stable verdicts stricter |
| 0.20.0 | 23 Oct | Cars, tanks, cargo wagons and rocket silos as chests; mining drills that drop into a chest |
| 0.21.0 | 23 Oct | Drops onto a side-loading belt marked; machines picked by what they are and their quality |
| 0.22.0 | 24 Oct | Clocks for cells whose machines draw from one source, and for direct insertion |

Three things from this stretch matter later.

**Belt pickups.** 0.18.0 and 0.19.0 are about picking up from belts. The simulator took from the stacks within reach of an inserter's arm, and it modelled an arm's reach between grabs. 0.19.0 added that the result says why no clock is stable: lane phases, unrecovered losses or the closest rate ([#288](https://github.com/abucnasty/clock-generator/pull/288)). It also made generating about a fifth faster than 0.18.0, but slower with moving belt pickups ([#244](https://github.com/abucnasty/clock-generator/pull/244), thanks blousy, as the changelog says).

**Recovery was proven, not assumed.** The roadmap says that since 0.19.0 recovery is proven by an exact repeat of the simulated state. Belt builds are checked in the game after three disturbances.

**Copies on a shared belt.** 0.22.0 added a note on whether the drops of several copies onto a shared belt fit between each other, and a list of the copy spacings at which they fit. Until release 0.29.0 the generator judged a clock on one copy. [Release 0.29.0](../clock-generator-0-29-0-belts-lane-by-lane/README.md) changed that.

## Where it stood

The roadmap sorts the work into milestones. By 0.22.0, calibration on five real cells was done, and containers were in: phase 1 in 0.20.0. Stability on real cells, milestone M4, was in progress: 0.19.0 did it for belt pickups, and 0.22.0 for cells whose machines draw from one source or from each other. Recyclers were the next milestone.

## The series

- [0.23.0: recyclers, and clocks you can read](../clock-generator-0-23-0-recyclers-and-readable-clocks/README.md)
- [0.24.0: ship faster](../clock-generator-0-24-0-ship-faster/README.md)
- [0.25.0: loops, and which start to judge](../clock-generator-0-25-0-loops-and-starts/README.md)
- [0.26.0: fewer wakeups, and which clock wins a tie](../clock-generator-0-26-0-fewer-wakeups-on-ties/README.md)
- [0.27.0: the game's update order](../clock-generator-0-27-0-the-games-update-order/README.md)
- [0.28.0: named strategies and ghost wakeups](../clock-generator-0-28-0-named-strategies/README.md)
- [0.29.0: belts, lane by lane](../clock-generator-0-29-0-belts-lane-by-lane/README.md)

Four findings: [counting wakeups in the game](../clock-generator-discovery-game-wakeups/README.md), [the record as a merge gate](../clock-generator-discovery-the-record-as-merge-gate/README.md), [the gap in an input lane](../clock-generator-discovery-gap-in-an-input-lane/README.md) and [the loss trials that found nothing](../clock-generator-discovery-loss-trials-cold-start/README.md).

*Drafted with Claude from the project's logs.*
