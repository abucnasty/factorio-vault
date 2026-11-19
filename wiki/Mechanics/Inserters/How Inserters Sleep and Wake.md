## Summary

- An inserter with nothing to do goes to sleep. While it is asleep it costs almost no update time.
- A sleeping inserter is woken by the entity it is waiting for: a machine, a chest, a lab or a belt.
- An inserter that feeds a machine is woken when a craft **starts**, not when a craft finishes.
- An inserter that takes from a moving belt cannot sleep while the belt carries only items that the inserter cannot take. It stays on the update list and costs time every tick.
- An inserter that a circuit switches off while it is asleep gets one more wakeup that does nothing. This page calls that a ghost wakeup.

## 1. Terms

| Term                   | Meaning                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tick**               | One step of the game's simulation. The game runs 60 ticks a second at full speed.                                                                         |
| **Update**             | The work the game does for one entity in one tick.                                                                                                        |
| **Update list**        | The inserters the game updates this tick. An inserter on this list costs time every tick, whether or not it moves an item.                                |
| **Sleep**              | The state of an inserter that is not on the update list. It does nothing until something puts it back on the update list.                                 |
| **Wakeup list**        | A list kept by an entity, such as a machine, a chest, a lab or a belt. It holds the sleeping inserters that this entity must wake when something changes. |
| **Wakeup**             | An entity puts one inserter from its wakeup list back on the update list. A machine that wakes four inserters at once causes four wakeups.                |
| **Input inserter**     | An inserter that drops items into a machine.                                                                                                              |
| **Output inserter**    | An inserter that takes items out of a machine.                                                                                                            |
| **Craft start**        | The tick a machine uses up its ingredients and begins a craft.                                                                                            |
| **Craft finish**       | The tick a machine completes a craft and its products appear.                                                                                             |
| **Productivity bonus** | The extra products a machine pays out when its productivity bar fills. It uses no ingredients.                                                            |

## 2. Scope and evidence

This page describes Factorio 2.1. Where a Factorio developer has stated a rule, section 10 lists the statement, with a link where there is one.

Other game versions may differ. `Machine` on this page means any entity that crafts: an assembling machine, a furnace, a chemical plant, etc.

## 3. The update list

Factorio runs in ticks, 60 a second at full speed. In each tick the game has to move the simulation one step forward: machines craft, belts move, inserters swing.

The game does not go through every entity on the map to do this. It keeps a list of the entities that have work to do, and in each tick it updates only the entities on that list. This page calls it the **update list**.

- An inserter **on** the update list is updated every tick. That costs time every tick, even in a tick where it moves nothing.
- An inserter **off** the update list is not updated. It costs almost nothing.

So the number of inserters in a factory matters less than the number that are on the update list in each tick. The next sections are about how an inserter leaves that list, and what puts it back.

## 4. How sleep works

An inserter that cannot do anything leaves the update list and goes to sleep.

Before it sleeps, the inserter joins the wakeup list of the entity it is waiting for. When something changes at that entity, the entity wakes the inserter and puts the inserter back on the update list.

![[sleep-two-states-59b42b0c.webp]]

Four rules follow:

1. **A woken inserter acts one tick later.** It is woken in one tick and does its work in the next.
2. **An inserter can be on more than one wakeup list**, up to three: for example the list of the entity it takes from and the list of the entity it drops to. Whichever entity wakes it first puts it back on the update list.
3. **Not every entity has a wakeup list.** The ground has none. Another inserter has none. An inserter that waits for one of these has nothing to wake it, so it cannot sleep and stays on the update list. A small chest between two inserters solves the inserter-to-inserter case.
4. **Loaders follow the same rule.** A loader stays on the update list when the entity it works with has no wakeup list.

## 5. What wakes an inserter

| Waiting On | Action                               | Woken By                                                                                                        |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| machine    | Drop ingredients in (input inserter) | A craft start, a machine that burns fuel using some of it, another inserter taking the machine's products       |
| machine    | Take products out (output inserter)  | Products appearing (a craft finish or a productivity bonus)                                                     |
| chest      | Take items from it                   | Any item being added to the chest                                                                               |
| lab        | Drop science packs in                | The lab using up a pack                                                                                         |
| belt       | Take items from it                   | An item being picked up from the same transport line. Other belt events may also wake it; they are not measured |

![[what-wakes-an-inserter-23595312.webp]]

Points that are easy to get wrong:

- **A craft finish does not wake an input inserter.** A craft start uses up ingredients, and that makes room for more. A craft finish makes no room. A craft that finishes without a new one starting wakes no input inserter.
- **Taking products out can wake an input inserter.** A machine with too many products in its output refuses new ingredients. When an output inserter takes products out, the machine can accept ingredients again, so it wakes its input inserters.
- **A machine wakes all of its waiting input inserters together.** It keeps one list of them. It does not know which inserter can use the new room, so it wakes all of them and each one checks for itself.
- **A productivity bonus does not wake an input inserter.** It uses no ingredients, so it makes no room.
- **A chest wakes its inserters on every item added**, not only on an item they can use. Each woken inserter then searches the chest for something to take. The cost grows with the number of slots and the number of inserters, so the developers advise keeping such chests small.
- **A pickup from a belt wakes the other inserters on that belt.** When one inserter picks an item up from a belt, the other sleeping inserters that take from the same transport line are woken too. A transport line is a stretch of belt that the game moves as one piece. So one busy inserter on a line keeps waking its neighbours, whether or not they have anything to take.
- **A pickup from a belt wakes the other inserters on that belt.** When one inserter picks an item up from a belt, the other sleeping inserters that take from the same transport line are woken too. A transport line is a stretch of belt that the game moves as one piece. So one busy inserter on a line keeps waking its neighbours, whether or not they have anything to take.
- **An inserter can sleep and be woken in the same tick.** An inserter is updated before its machine. It can go to sleep in its own update, and the machine can wake it again later in that tick. This matters only when you count wakeups: such an inserter can have two close together.

## 6. What it costs

**Waiting.** The cost of a tick spent waiting depends on where the inserter waits.

> [!note] About the times
> Every time in nanoseconds (ns) comes from one machine: a Ryzen 9800X3D with CPU boost off, on Factorio 2.1.21. Read the times against each other. They are not what your machine will show.

The table is for an enabled inserter that waits to pick up. "Items it cannot take" are items of a kind its machine does not use: for example, the inserter waits for copper plates and the belt carries iron plates. The case of a belt that carries the right item while the machine is full is not verified.

| The inserter waits to take from                     | Cost of one waiting tick |
| --------------------------------------------------- | ------------------------ |
| An empty chest or machine                           | At most about 0.2 ns     |
| A belt that stands still, with items it cannot take | At most about 0.2 ns     |
| A belt that moves, with items it cannot take        | About 136 ns             |

![[waiting-cost-2514cd9a.webp]]

An inserter that can sleep is nearly free. An inserter at a moving belt cannot sleep: it stays on the update list and looks through the items that pass, every tick. The developers also say that in any save most inserter time goes to taking items from belts, because a belt pickup has to look through the items on the belt first.

**A wakeup.** One wakeup is not free, and its price is not fixed.

- A wakeup of an input inserter costs about 60 to 110 ns. A wakeup of an output inserter costs more: about 140 to 350 ns.
- The price rises with the size of the save. With three times as many copies of the same build, one wakeup can go from about 90 ns to about 270 ns.
- On some designs the wakeups of the input inserters cost almost nothing. The reason is not known.
- A wakeup that finds nothing to do still costs a little, by the developers' account.

So the number of wakeups shows which inserters are worth a closer look. It does not tell you how much time you will save.

**A wire.** A clock is not free. The circuit connection of a wired inserter is updated every tick, whether the inserter is asleep or not. Each tick it checks whether its signals changed, and skips the costly part when they did not. A clock's signal changes every tick, so a clocked inserter does not skip it. This page gives no time for the wire, and none for a switch-on.

## 7. Circuit conditions and ghost wakeups

This section uses a clock as its example. The same rules hold for any circuit enable condition, for example "enable while the chest holds fewer than 100 items".

| Term                          | Meaning                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unwired**                   | An inserter with no circuit wire. It is always enabled.                                                                                                 |
| **Clocked**                   | An inserter wired to a circuit clock that enables it only in chosen ticks.                                                                              |
| **Enable window**             | The ticks in which a clock enables a clocked inserter. "Ticks 10 to 20" on this page means: switched on at tick 10, switched off at tick 20.            |
| **Switched on, switched off** | An inserter is switched on at the tick its enable condition becomes true, and switched off at the tick it becomes false. Between the two it is enabled. |
| **Swing**                     | One movement of the hand: from the pickup position to the drop position, or back.                                                                       |
| **Swing back**                | The swing of the empty hand from the drop position to the pickup position.                                                                              |
| **Ghost wakeup**              | A wakeup of an inserter that was switched off while it was asleep. The inserter can do no work. The name is ours; the game has none.                    |

### What a clock does to sleep

For sleep, three rules matter:

1. **Switching on puts a sleeping inserter back on the update list.** No wakeup list is needed for this, and it is not counted as a wakeup.
2. **Switching off does not wake the inserter, and does not stop its hand.** An inserter that is switched off while its hand is moving finishes what it is doing. With items in its hand, it drops them and swings back. A switched-off inserter does not start a new pickup.
3. **A switched-off inserter that goes to sleep joins no wakeup list.** It does not need one, because the next switch-on puts it back on the update list.

This is how a clock removes wakeups. A switched-off inserter that is asleep on no list is not woken when its machine starts a craft. It stays asleep until it is switched on. The clock has a cost of its own: see "A wire" in section 6.

### What a ghost wakeup is

Rule 3 does not cover one case. It applies to an inserter that goes to sleep **after** it is switched off. An inserter that is **already asleep** on a wakeup list when it is switched off stays on that list.

**An inserter that is switched off while it is asleep gets one more wakeup, and that wakeup does nothing.** That is a ghost wakeup. It happens in four steps:

1. The inserter is enabled and has nothing to do, so it goes to sleep on its machine's wakeup list.
2. The clock switches the inserter off. Switching off does not wake the inserter and does not take it off the list.
3. The machine wakes every inserter on its list, as it always does. This inserter is woken too.
4. In the next tick the inserter is updated, finds it is switched off, and goes back to sleep. This time it joins no list.

Steps 3 and 4 are the wasted work: one wakeup and one update for an inserter that is switched off.

![[ghost-wakeup-6fe4b606.webp]]

The upper timeline shows the four steps for an input inserter. The lower timeline shows the same inserter with its window closed earlier, during the swing back. It goes to sleep already switched off, joins no list, and the machine does not wake it. In both timelines the inserter works again when its next window opens, which is past the right edge.

A ghost wakeup can happen to an input inserter and to an output inserter. On a clocked build, a small share of the wakeups are ghost wakeups.

### How to avoid it

**Switch the inserter off before it goes to sleep, not after.** There are two ways.

1. **Close the window while the hand is still moving.** The usual choice is the swing back: set the window to close while the empty hand returns from its drop. The inserter finishes the swing, stops switched off, and goes to sleep on no list. This removes the wakeup completely.
2. **Join two windows into one.** If an inserter has two enable windows with only a short gap between them, keep it enabled through the gap. The inserter is then never switched off in the gap, so no ghost wakeup can happen there.

Use the first way when you can. Use the second when the window cannot close earlier, for example because other inserters share the same clock signal and need the longer window.

An example of joining, with made-up ticks:

|        | Enable windows                     | What happens in the gap                                                                                                                                                                                                     |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Before | Ticks 10 to 20, and ticks 26 to 36 | The inserter goes to sleep at tick 18, on the machine's wakeup list. It is switched off at tick 20 and stays on the list. The machine wakes it at tick 23: a ghost wakeup. It works again when it is switched on at tick 26 |
| After  | Ticks 10 to 36                     | The inserter goes to sleep at tick 18 and stays enabled. The machine wakes it at tick 23, and it works from tick 24                                                                                                         |

![[joining-enable-windows-1fe7d448.webp]]

Joining does not remove the wakeup at tick 23. Before, that wakeup did nothing. After, it starts the inserter's next swing, and the switch-on at tick 26 is no longer needed.

Joining can change when the inserter works: here it starts at tick 24, not at tick 26. Check that the build still moves the same items in the same ticks.

> [!warning] The time a ghost wakeup costs is not known
> By the prices in section 6 it should be about one wakeup, but it has not been timed by itself. It is likely smaller than the difference between two runs of the same benchmark. A ghost wakeup is still work that does nothing, and removing it only needs a change to the clock. Treat ghost wakeups as a count to reduce, not as a known time saving.

## 8. What this means for a build

- **Let waiting inserters sleep.** An inserter that takes from or drops to a machine or a chest can sleep. One that takes from the ground or from another inserter cannot.
- **Do not let an enabled inserter wait at a moving belt of items it cannot take.** It cannot sleep there, and pays for every tick.
- **Keep chests that inserters take from small.**
- **An unwired inserter beside a fast machine gets many wakeups.** A clock can remove them, but the clock costs time too, and a wakeup's price varies. Time both versions of your build before you decide.
- **Close an enable window while the inserter is swinging back.** A window that closes after the inserter has gone to sleep causes a ghost wakeup. Where the window cannot close earlier, join it with the next one.

## 9. Open questions

- **Switched-off inserters at a moving belt.** The belt cost in section 6 is for an enabled inserter. Whether a switched-off inserter at a moving belt pays it is not covered here.
- **The right item on the belt, and a full machine.** Whether an inserter in that case sleeps or stays on the update list is not verified.
- **What else on a belt wakes an inserter.** A pickup from the same transport line does. Whether items arriving, or the belt starting to move, also do is not measured.
- **The time a wire and a switch-on cost.** Not given on this page.
- **Old developer statements.** The three-list limit and the rule about entities with no wakeup list are developer statements from Factorio 1.1. They were not tested again on 2.1.
- **Why wakeups cost so little on some builds.** See section 6.

## 10. Developer statements

The rules on this page that a Factorio developer has stated, with the statement behind each. The statements are summarised, not exact quotes. A forum statement has a link to the post. A Discord statement has no public link.

| Rule on this page                                                                     | Developer | Date       | Game version | What the developer said                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | --------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A sleeping inserter costs no CPU time                                                 | Rseding91 | 2019-08-16 | 0.17         | An inserter with nothing to do goes to sleep and uses no CPU time ([forum post](https://forums.factorio.com/viewtopic.php?p=450864))                                                                                      |
| At most three wakeup lists                                                            | boskid    | 2022-08-20 | 1.1          | An entity can sleep on at most three objects ([forum post](https://forums.factorio.com/viewtopic.php?p=572334))                                                                                                           |
| The ground and inserters have no wakeup list                                          | boskid    | 2021-09-08 | 1.1          | Inserters and the ground have no wakeup list, so an inserter working with either cannot sleep. A small chest between two inserters avoids it ([forum post](https://forums.factorio.com/viewtopic.php?p=552079))           |
| A loader stays active when its entity has no wakeup list                              | boskid    | 2022-10-11 | 1.1.69       | A loader stays active when the entity it works with has no wakeup list ([forum post](https://forums.factorio.com/viewtopic.php?p=575563))                                                                                 |
| A loader stays active when its entity has no wakeup list                              | boskid    | 2025-07-29 | 2.0.60       | Asteroid collectors have no wakeup list, and a loader beside one must stay active ([forum post](https://forums.factorio.com/viewtopic.php?p=677264))                                                                      |
| A craft start wakes an input inserter; a craft finish does not                        | Rseding91 | 2025-12-06 | 2.0.72       | A machine wakes the inserters that put items into it when it uses up its ingredients, not when it finishes a craft (Discord)                                                                                              |
| A machine wakes all its waiting input inserters, not only the one a change matters to | Rseding91 | 2025-12-06 | 2.0.72       | A machine has one list of the sleeping inserters that want to put items in. To know whether a change matters to one of them, the inserter itself has to be asked (Discord)                                                |
| Another inserter taking a machine's products wakes its input inserters                | Rseding91 | 2026-03-07 | 2.0.76       | A machine whose output is over its limit refuses new items. That answer is remembered until the machine's output goes down (Discord)                                                                                      |
| A chest wakes on every item added; a lab on every pack used                           | Rseding91 | 2026-09-09 | 2.1.17       | An inserter is woken each time its chest gains an item or the lab it faces uses one, and searches the inventory each time. Keep such inventories small ([forum post](https://forums.factorio.com/viewtopic.php?p=703557)) |
| A wakeup that finds nothing to do still costs a little                                | boskid    | 2025-09-27 | 2.0.68       | Extra wakeups make inserters wake and use some CPU even when there is nothing for them to do ([forum post](https://forums.factorio.com/viewtopic.php?p=681674))                                                           |
| Most inserter time goes to belt pickups                                               | Rseding91 | 2022-04-15 | 1.1          | Most inserter time is spent finding and chasing items on belts ([forum post](https://forums.factorio.com/viewtopic.php?p=566292))                                                                                         |
| Most inserter time goes to belt pickups                                               | Rseding91 | 2025-12-06 | 2.0.72       | By far most inserter time in any save goes to taking items from belts. A belt pickup starts by going through the items on the belt from its front (Discord)                                                               |
| A wired inserter's circuit connection is updated every tick, asleep or not            | boskid    | 2026-10-17 | 2.1.22       | An entity that sleeps gets no updates, but the circuit connection of a wired entity is updated every tick. It skips its costly part when no signal changed (Discord)                                                      |

