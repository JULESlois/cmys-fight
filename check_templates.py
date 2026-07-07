import re
import json

def check_file():
    with open('src/game/data/roomTemplates.ts', 'r') as f:
        content = f.read()
    
    # We'll just run node on a script that imports it and checks
    pass

