# Galore

I want to make a horde survival game with some roguelite elements. It'll be based on phaser, with a thin React layer on top.

## How to run
Install dependencies via `npm i` and then run `npm run dev`

## Current state and stuff I want to do
- [x] Add player character and a couple obstacles
- [x] Add sprites
- [x] One of the obstacles shoots an arrow towards the player, if arrow touches the player the game resets
- [x] Arrow follows the player
- [x] One of the obstacles spawns a mob, which shoots an arrow towards the player
- [X] If the player touches the mob, the mob dies
- [X] The player can shoot bullets to the closest monster by pressing space bar
- [X] Monsters spawn randomly in the arena
- [X] Walls stop bullets and monsters
- [X] Implement random seed at the start of the game, and use it to determine placement of walls (capped at 5 for now)
- [X] Bigger map with scrolling and increased number of walls. Mobs should still appear near the player
- [X] Floor tileset so player can tell they're moving
- [X] Points as the time goes on and monsters killed
- [X] Death screen showing number of points obtained and a revive button
- [X] Store to buy passive upgrades
- [X] Ability button and extra upgrades
- [ ] Sound effects
- ...the list will go on as I learn more Phaser

## Constributions

Assets are from [kenney.nl](https://kenney.nl/assets/tiny-dungeon) under Creative Commons license