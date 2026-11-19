---
draft: true
---
This article aims at providing an introduction to UPS optimised building in Factorio. Where to start, what are the priorities and what helps the most why.

Each tick Factorio has to calculate the state of the game and advance everything one tick forward: Machines, items, belts, inserters etc. The calculation of these things takes time. Factorio runs at 60 updates per second, so the game has \~16 milliseconds to calculate and render each frame. If the game takes longer than 16 milliseconds for an update, the game starts to run slower than 60 UPS. Instead, the game runs the simulation at the maximum speed your computer can handle.

Therefore, to keep the game at 60 UPS, you have to reduce the amount of calculations the game has to do each tick. And that is the first and most important rule of UPS optimisation: Achieve the same outcome while doing less stuff. "Less stuff" means:

- **Using less machines**: Use higher quality buildings and max out the beacon count around each building. Use productivity modules in any machine accepting productivity. One building producing a certain amount of output takes way less time to calculate then two buildings producing the same output.
- **Always use the largest and fastest inserter:** Basically this means Q5 stack inserters for everything everywhere. The only exception can be items with a stack size of one like asteroid chunks, there a fast inserter does the same job. There are rare cases were a bulk inserter can be useful. Never use yellow or red inserters. Their small hand capacity and slow turning speeds makes them very expensive.
- **Reduce the number of item transfers**: Transferring items between chests, belts and machines is one of the most UPS expensive things in Factorio. Hence, it helps a lot by reducing the number of times items are transferred. The most important method to reduce item transfers is to directly insert items from one machine into another, skipping the intermediate step of transferring the item to a belt, transporting it and inserting it into the target machine.

Direct insertion has two major advantages:

1. Items are only transferred once instead of twice.
2. But even more, transfers between chests (machines work the same way as chests for item transfers) are less UPS expensive than transfers to belts: on a belt, the inserter has to scan the belt if it can drop items, than drop a stack of 4 items and scan the belt again for the next gap. Chest to chest transfers allow to always drop all items the inserter holds at once. If you cannot get buildings close enough for an inserter, it is better to use an intermediate chest (or even two) before using a belt. So chest -> chest -> chest -> chest is better than chest -> belt -> chest even though it is 3 transfers instead of 2.
