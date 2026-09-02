import os
import re

src_dir = r"c:\Users\alvar\TerraSence\Web\src"

pattern1 = re.compile(r'\[--color-terra-([a-zA-Z0-9-]+)\]')
pattern2 = re.compile(r'\[--color-verdict-([a-zA-Z0-9-]+)\]')

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern1.sub(r'terra-\1', content)
            new_content = pattern2.sub(r'verdict-\1', new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
