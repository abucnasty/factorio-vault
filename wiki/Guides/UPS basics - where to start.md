---
draft: true
---
This article aims at providing an introduction to UPS optimised building in Factorio. Where to start, what are the priorities and what helps the most why.

Each tick Factorio has to calculate the state of the game and advance everything one tick forward: Machines, items, belts, inserters etc. The calculation of these things takes time. Factorio runs at 60 updates per second, so the game has \~16 milliseconds to calculate and render each frame. If the game takes longer than 16 milliseconds for an update, the game starts to run slower than 60 UPS. Instead, the game runs the simulation at the maximum speed your computer can handle.

Therefore, to keep the game at 60 UPS, you have to reduce the amount of calculations the game has to do each tick. And that is the first and most important rule of UPS optimisation:

## A. Achieve the same outcome while doing less stuff.

"Less stuff" means:

- **Using less machines**: Use higher quality buildings and max out the beacon count around each building. Use productivity modules in any machine accepting productivity. One building producing a certain amount of output takes way less time to calculate then two buildings producing the same output.
- **Use the largest and fastest inserter:** Basically this means Q5 stack inserters for everything everywhere. The only exception can be items with a stack size of one like asteroid chunks, there a fast inserter does the same job. There are rare cases were a bulk inserter can be useful. Never use yellow or red inserters. Their small hand capacity and slow turning speeds makes them very expensive.
- **Reduce the number of item transfers**: Transferring items between chests, belts and machines is one of the most UPS expensive things in Factorio. Hence, it helps a lot by reducing the number of times items are transferred. The most important method to reduce item transfers is to directly insert items from one machine into another, skipping the intermediate step of transferring the item to a belt, transporting it and inserting it into the target machine.
- **Only drop items on empty belts:**  When transferring an item to a belt, the inserter has to scan the belt if it can drop items, than drop a stack of 4 items and scan the belt again for the next gap. If the belt is not empty, the inserter keeps on scanning until there is a gap. Each failed scan costs UPS. A common method to make ensure an empty belt is to make a separate few tile long belt the inserter can drop on and connect the belt sideways to the actual target belt: the few belt tiles act as buffer to hold the items until there is space on the main belt. Joining belts is way cheaper than having an inserter scan for gaps.

Direct insertion has two major advantages:

1. Items are only transferred once instead of twice.
2. But even more, transfers between chests (machines work the same way as chests for item transfers) are less UPS expensive than transfers to belts. Chest to chest transfers allow to always drop all items the inserter holds at once. If you cannot get buildings close enough for an inserter, it is better to use an intermediate chest (or even two) before using a belt. So chest -> chest -> chest -> chest is better than chest -> belt -> chest even though it is 3 transfers instead of 2.

You will notice that there is a conflict between the methods: more DI often means that you need more machines. As a rule of thumb, if you need more than 4 additional machines over belting items, it could be that direct insertion is not better.

Direct insertion is limited by how you can arrange buildings around each other. You cannot direct insert everything, so what are the priorities?

1. It's the amount of items transferred that cost UPS, so choose the item with the highest volume in the target machine.
2. Look for machines where the ratios are somewhat close to each other.

A good example for DI are blue chips. Green chips and the ingredients for green chips come at a high volume. Arranging them around each other with direct insertion eliminates a lot of item transfers without need all that many additional machines. In addition, the volume of the items would make using belts more difficult.

Another important lategame method of avoiding to belt high volume items is to build directly on the resource patches. Very easy doable for smelting of iron and copper in the foundries. Put a miner down pointing directly into the foundry and you only have to deal with the liquids. More advanced methods put entire science builds on ore patches, especially for grey and purple science.

## B. Inserter clocking

The second main method to optimise your UPS is to clock inserters. In any base, inserters are the single most expensive category of entities. Inserters are very well optimised but they are also what holds a Factorio base together. They work always, under any condition, in any configuration. If you put an inserter down, it will do the job. But in a megabase where UPS becomes a concern, you actually don't need inserters to be able to work always under any condition in any configuration. You only need to work them in the very specific situation you put the inserter in.

And that is where clocking come in. Simple put, you cripple the inserter to no longer be the jack of all trades. Instead, you limit the inserter to only do this one job you put it on. This is done via circuits. Instead of having the game determine if an inserter has something to do, you use circuits to make those decisions beforehand and enable the inserter only when there is something for the inserter to do.

As a result, clocking requires a lot of work to be put into: You need to understand your build, you need to understand what happens when and than set the right circuits for the inserter. If you clock your build wrong, you can easily make it no longer work.

That's also the reason why you should not start with clocking until you optimised your builds following the guidelines under A. The gains from clocking are smaller and harder to achieve compared to building in a more efficient manner.
