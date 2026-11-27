---
draft: true
---
This article aims at providing an introduction to UPS optimised building in Factorio. Where to start, what are the priorities and what helps the most why. This article only covers the basics in each section and provides general guidelines. UPS optimisation is very specific: if you dig deeper, there are many exceptions and edge cases where things are differently.



Also, please note that this article is trying to help you with the best current knowledge. There may be better or other ways to achieve better performance. We as a community are learning every day.

## Executive summary/TL;DR

Building more efficiently yields the highest UPS gains: Reduce the number of item transfers as much as possible. Use direct insertion to avoid chest-to-belt-transfers. Use as few splitters and belt merges as possible via clever routing.

Only once you have your build streamlined, it is worthwile to look into clocking your build. Inserters that are active often but not all the time yield the most benefit for clocking. Basing the activation of inserters on an actual clock yields the highest UPS gain.

## Basics

Each tick Factorio has to calculate the state of the game and advance everything one tick forward: Machines, items, belts, inserters etc. The calculation of these things takes time. Factorio runs at 60 updates per second, so the game has \~16 milliseconds to calculate and render each frame. If the game takes longer than 16 milliseconds for an update, the game starts to run slower than 60 UPS. Instead, the game runs the simulation at the maximum speed your computer can handle.

Therefore, to keep the game at 60 UPS, you have to reduce the amount of calculations the game has to do each tick. And that is the first and most important rule of UPS optimisation:

## A. Achieve the same outcome while doing less stuff.

"Less stuff" means:

- **Using less machines**: Use higher quality buildings and max out the beacon count around each building. Use productivity modules in any machine accepting productivity. One building producing a certain amount of output takes way less time to calculate then two buildings producing the same output.
- **Use the largest and fastest inserter:** Basically this means Q5 stack inserters for everything everywhere. The only exception can be items with a stack size of one like asteroid chunks, there a fast inserter does the same job. There are rare cases were a bulk inserter can be useful. Never use yellow or red inserters. Their small hand capacity and slow turning speeds makes them very expensive.
- **Reduce the number of item transfers**: Transferring items between chests, belts and machines is one of the most UPS expensive things in Factorio. Hence, it helps a lot by reducing the number of times items are transferred. The most important method to reduce item transfers is to directly insert items from one machine into another, skipping the intermediate step of transferring the item to a belt, transporting it and inserting it into the target machine.
- **Only drop items on empty belts:**  When transferring an item to a belt, the inserter has to scan the belt if it can drop items, than drop a stack of 4 items and scan the belt again for the next gap. If the belt is not empty, the inserter keeps on scanning until there is a gap. Each failed scan costs UPS. A common method to make ensure an empty belt is to make a separate few tile long belt the inserter can drop on and connect the belt sideways to the actual target belt: the few belt tiles act as buffer to hold the items until there is space on the main belt. Joining belts is way cheaper than having an inserter scan for gaps.
- **Less splitters and belt merges:** Think about where and how many resources you need. Balancers are usually not needed. Avoid merging belts that you need to split again down the line. Unless detrimental to what you want to achieve, set priorities on splitter inputs and outputs.

Direct insertion has two major advantages:

1. Items are only transferred once instead of twice.
2. But even more, transfers between chests (machines work the same way as chests for item transfers) are less UPS expensive than transfers to belts. Chest to chest transfers allow to always drop all items the inserter holds at once. If you cannot get buildings close enough for an inserter, it is better to use an intermediate chest (or even two) before using a belt. So chest -> chest -> chest -> chest is better than chest -> belt -> chest even though it is 3 transfers instead of 2.

You will notice that there is a conflict between the methods: On the one side, using as few machines as possible, on the other side, doing as much DI as possible. Direct insertion limits the output of a machine to how much you can transfer to other machines taking this input directly. Also, placing buildings close enough to each other to use direct insertion reduces the number of beacons, you can place around those buildings. As a result, using direct insertion increases the amount of machines you need for the same output.

Hence, there is a tradeoff: More machines to achieve less item transfers. As a rule of thumb, if you need more than 4 additional machines over belting items, it could be that direct insertion is not better. However, this highly depends on what items are involved and many other factors. So this rule of thumb is only a first indication that direct insertion may not be straight up better in the case at hand.

Direct insertion is limited by how you can arrange buildings around each other. You cannot direct insert everything, so what are the priorities?

1. It's the amount of items transferred that cost UPS, so choose the item with the highest volume in the target machine.
2. Look for machines where the ratios are somewhat close to each other.

A good example for DI are blue chips. Green chips and the ingredients for green chips come at a high volume. Arranging them around each other with direct insertion eliminates a lot of item transfers without need all that many additional machines. In addition, the volume of the items would make using belts more difficult.

Another important lategame method of avoiding to belt high volume items is to build directly on the resource patches. Very easy doable for smelting of iron and copper in the foundries. Put a miner down pointing directly into the foundry and you only have to deal with the liquids. More advanced methods put entire science builds on ore patches, especially for grey and purple science. \[Future link to respective benchmarks]. The reasons for grey and purple science benefitting heavily from building on patch are:

- Walls, grenades, furnaces and rails require a high volume of the raw resources stone and coal while at the same time offering only few production steps with limited productivity bonuses. Hence, scaling up those sciences requires rivers of stone and coal if belted.
- It turns out that the ratios for on patch builds for those two sciences are very favorable: The number of buildings needed, beacon counts, inserters: if built carefully, it all lines up well.
- It works better the larger the patch size. Even on default settings, those builds are feasible. However, it requires expansion to find suiting patches. The cost for the very long belts required is negligible.

## B. Inserter clocking

The second main method to optimise your UPS is to clock inserters. In any base, inserters are the single most expensive category of entities. Inserters are very well optimised but they are also what holds a Factorio base together. They work always, under any condition, in any configuration. If you put an inserter down, it will do the job. But in a megabase where UPS becomes a concern, you actually don't need inserters to be able to work always under any condition in any configuration. You only need to work them in the very specific situation you put the inserter in. [UPS Wiki: How inserters sleep and wake](https://abucnasty.dev/wiki/how-inserters-sleep-and-wake)

And that is where clocking come in. Simple put, you cripple the inserter to no longer be the jack of all trades. You limit the inserter to only do this one job you put it on. This is done via circuits. Instead of having the game determine if an inserter has something to do, you use circuits to make those decisions beforehand and enable the inserter only when there is something for the inserter to do.

As a result, clocking requires a lot of work to be put into: You need to understand your build, you need to understand what happens when and than set the right circuits for the inserter. If you clock your build wrong, you can easily make it no longer work.

That's also the reason why you should not start with clocking until you optimised your builds following the guidelines under A. The gains from clocking are smaller and harder to achieve compared to building in a more efficient manner.

### I. How does clocking work?

Clocking means that the inserter is disabled via circuit network and only enabled when a condition set by the player is met. There are two main ways of how to clock an inserter. \[For a more in-depth description of clocking strategies, please refer to ADVANCED CLOCKING GUIDE].

1. Clock the inserter based on some information retrieved via the circuit network, e.g., read content on the assembler the inserter shall insert into and only activate the inserter if the item you want to put in is below a certain threshold. This could be "i) read content on the red science assembler" and "ii) set the inserter to only be active if copper plates in the red science assembler are below 5".

   This way of clocking is easier to get into and simple to setup. It makes sense for beginners to use this a couple of times to get a hang of how it works and what happens. Clocking this way already results in some performance gains as reading a machine via circuit network is usually cheaper than having the inserter check if it can insert items into the machine.
2. The more advanced method that yields the most UPS gains is basing the activation of the inserters on an actual ingame clock \[LINK: how to build a clock] as shown in the screenshot. For this method, you calculate every how many ticks an inserter needs to be active to for example put copper plates into your science assembler. If your red science assembler is consuming 10 copper plates a second and a stack inserter can input 16 plates at once, the inserter needs to be activate once every (16 items per swing) / (10 items per second) * (60 ticks per second) = (96 ticks per swing). In the simple case, you set a clock to run for 96 ticks and activate the inserter for at least 4 ticks if you grab from a belt or for 1 tick when transferring from a chest. If you have more inserters set to activate on the same condition, it is beneficial to put down a second decider combinator that evaluates if the inserters are to be activated. This way, the inserters get sent only "on or off" via the circuit network and not every inserter has to evaluate the condition by itself.

### II. Where to start with clocking?

Clocking is especially beneficial for inserters that are active often but not all the time. Connection inserters to a circuit network and clocking them costs control behavior time and circuit network time. It is not free and not in all situations clocking is actually an UPS improvement.

Prime candidates are inserters inserting into science assemblers or taking out from them.

As most inserters are worth clocking, below follows a list of cases where clocking is often not worth it or pretty difficult to make it worth it. As a beginner, you should leave those cases aside and start with clocking other stuff.

- Inserters that are active all or most of the time or inserter into very fast machines are usually not worth clocking. This is especially true for anything around green chips. The throughput for q5 stacks inserters is 120/sec from chest to chest (8 ticks per swing) and around 80/sec from or to an belt (12 ticks per swing. Depending on the specific case, it can be 11 or 13 ticks as well). If an inserter is close to those values, don't clock them.
- Don't clock inserters that are active very rarely. Circuit behavior has a constant overhead so if the inserter respectively the machine the inserter is looking at is not all that active, the overhead may exceed the clocking benefit.
- Some items are difficult to clock due to low or limiting input and output buffers and/or odd ratios along the production chain. This is especially true for things produced in EMPs as they allow for 175% production bonus. This makes aligning inputs and outputs via clocking very difficult. Hence, red chips and supercapacitors/superconductors are very hard to clock.
- Direct insertion from plastic into LDS and LDS into multiple yellow science assemblers is also difficult to clock.

### III. Wake-up list debug view

Enabling "show-wakeup-lists" in the debug view shows you the lines which wakeup-lists the inserters are subscribed to. The color is only the direction of the subscription ("take from" or "insert into"). The debug view also shows the activity in the wakeup-lists by making the lines flicker. It is the flickering of the lines that costs UPS because each flicker means that the inserter checked if it has something to do. Stable lines do not cost UPS.

### IV. Best practices

Below is a list of tips and tricks to make the clocking life easier and more efficient at the start:

- Don't clock your inserters to the maximum capacity of the machine unless you actually need the full output (often not the case). Instead, clock your inserters to match your target rate. E.g., if you have your science assembler on Nauvis is producing 19 science per second each, you will most likely not need the full 19 science per second output as the target for your science is a belt and your throughput is limited by that belt. For a stacked green belt and the resulting 240 science per second, a typical choice is either 14 assemblers, meaning you would clock the inserters to allow a production of \~17.15 science per assembler or 13 assemblers, resulting in a clock for an output of \~18.5 science per assembler. Clocking for a higher output of the science assembler would not increase your final output and clocking for an output rate below the maximum capacity of a machine is a lot easier than clocking for the maximum output.
- Clocks are cheap. It's the entities connected to the clocks and the activity in the circuit network that costs UPS.
- Rough clocks already provide a lot of UPS benefit. Although perfect clocks have the most benefit, especially at the start it can be a good practice to start with "good enough" clocks to get something done and finished and learn along the progress. "Good enough" means longer activation times and additional activations to avoid the build tripping.
- You can use radars for a central clock and have one radar per build forwarding the signal from the central clock \[Future link: Fulgora benchmark with on patch clock vs radar clock]. As clocks are very cheap, you don't save UPS by doing this but you also don't lose UPS if you only have one radar per build. If you use multiple radars per build to avoid having to drag wires across everything, this convenience comes at the cost of UPS.
- Longer activations are cheaper than activations more often and shorter. E.g., outputting several stacks from a science assembler at once is better than activating the inserter every time 16 items are ready. However, outputting multiple stacks at once requires respective clocking of the inputs. Hence, it is a (very) advanced clocking technique.
- Separate circuit networks per signal. So for red science, if you make a clock for copper plates and a clock for red science, the red science and the copper plate inserters should all be connected separately, i.e., one circuit network for the red science inserters and one network for the copper plates. It helps with UPS if the inserters only have to evaluate the signal relevant to them and nothing else. Depending on your PC, cutting circuit networks down into smaller ones instead of large ones (especially around the hub), can help with performance. However, it appears that this is highly dependent on the system Factorio is run on.

  Having a separate circuit network per signal also allows for easier inserter configuration. If there is only one signal in the network, you can set any inserter to activate if "anything > 0". So you don't need to check if the respective inserter has the right configuration because all inserters use the same configuration.
- If you want to forward a signal and the wire can't reach, constant combinators are the cheapest option to forward wires. They are cheaper than power poles.
- Disconnect the checkboxes for wire networks you don't need. So if you connect a green wire to an inserter to receive a signal, uncheck the "output" green wire connection.
