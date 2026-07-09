import sys
with open("src/game/FloorGenerator.ts", "r") as f:
    text = f.read()

# We need to completely rewrite generateFloor to use the new graph logic.
