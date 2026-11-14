---
status: draft
title: "The gap in an input lane"
date: "2026-11-13"
description: A clock that holds for one copy can lose crafts when copies share a belt lane. A row of assemblers in the game shows it.
tags: [clock-generator, discovery, belts]
---

## The question

The generator used to judge a clock on one copy of a build. Does a clock that holds for one copy still hold when several copies take from the same belt lane?

## The idea

Several input inserters can take from one belt lane, one after the other. A hand that the first one takes leaves a gap in the lane. The gap moves down the belt at the belt's speed, 8 ticks a tile on a turbo belt. If the lane has no room to spare, and the next inserter is open when the gap comes, it finds fewer items than a full hand.

The engine can work this out from the places of the inserters. The test records the miss in the game and sets the engine's check against it.

## How it was measured

A row of gear assemblers takes iron plate from one dead-end turbo belt, in Factorio 2.1.24. A lane carries 120 plate a second, and a gear takes 2 plate. So the lane is full when the row asks for 120 a second: 2 assemblers at 30 gears a second each, or 3 at 20. Only then has a gap no room to be filled. Each assembler has a crafting speed of 18.75.

```text
tile row  -5   C C C C                            C = infinity chest of iron plate (the four feeders)
          -4   f f f f                            f = feeder, a stack inserter
          -3   > > > > > > > > > > > > > > > |    belt, to the east; the last tile is the end
          -2               i         i           i = input inserter, at the middle column of its assembler
          -1,0,1          [A A A]   [A A A]      A = assembler, 3 tiles wide
           2               o         o           o = output inserter
           3               C         C           C = infinity chest that removes all
                           <-pitch->             the tiles from one input inserter to the next
```

The rows differ in the number of assemblers and in the pitch. A script locks the clock, empties every belt, machine and hand, and unlocks the clock a number of ticks later: the start phase. It records the finished crafts of each assembler. I tried two clocks: `euclidean_swings`, which the engine says does not fit the closer pitch, and the clock the generator selects.

## The result

Finished crafts of each assembler, counted along the belt, in whole window cycles after the lane has settled.

| Assemblers | Pitch | Clock | First | Second | Third |
| --- | --- | --- | --- | --- | --- |
| 2 | 3 | euclidean_swings, 96 ticks | 1,056 | **880** | |
| 2 | 6 | euclidean_swings, 96 ticks | 1,056 | 1,056 | |
| 3 | 6 | euclidean_swings, 144 ticks | 720 | **600** | 720 |
| 3 | 9 | euclidean_swings, 144 ticks | 720 | 720 | 720 |
| 2 | 3 | selected, 32 ticks | 1,056 | 1,056 | |
| 3 | 6 | selected, 96 ticks | 704 | 704 | 704 |

The second assembler makes 5 crafts in every 6 where the clock does not fit the pitch: 880 of 1,056 and 600 of 720. The others make their full number. No start phase held: every phase I measured gave these numbers. The selected clock holds on the rows that the first clock fails on.

The engine gets the same answer from the config alone. For two assemblers 3 tiles apart, the second input inserter keeps 305 of 366 swings. 61 lost of 366 is 1 in 6, the game's 880 of 1,056.

## What changed

The game and the engine's lane check agree. So 0.29.0 runs every copy of a build on the lanes the copies share ([#748](https://github.com/abucnasty/clock-generator/pull/748)). The commit that checks a shared lane with every copy's machines and inserters is dated 9 November. The game recording of the row is dated 13 November.

The record shows how common the miss is. What the old clock lost on the shared lane:

| Sample | Loss |
| --- | --- |
| Automation science, 240 | Copy 2 misses 9 of its 65 copper plate swings |
| Chemical science, shared foundry | Inserter 5 of copy 2 misses 57 of its 168 advanced circuit swings |
| Electromagnetic science, 330 | Copy 2 misses 38 of its 224 accumulator swings |

Their recommended clocks moved. Chemical science went from 81.896 to 122.844 wakeups a minute, electromagnetic science from 92.176 to 196.116.

## What is not known

The row is not the build in which the miss was first seen. There it showed at some start phases only, and I do not know why. A row of nine assemblers with two lanes is not pinned: the clock the generator selects, which the engine calls stable, does not make the target there, and the reason is not established. The numbers are for turbo belts, one lane and one item.

*Drafted with Claude from the project's logs.*
