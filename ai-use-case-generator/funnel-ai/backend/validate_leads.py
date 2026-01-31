
import re

file_path = '../frontend/src/pages/Leads.jsx'

with open(file_path, 'r') as f:
    text = f.read()

# Remove comments (simple block and line)
# This is hard because of strings.
# We'll just try to count braces in raw text first, understanding that strings might skew it.
# But "Unterminated JSX" often comes from code structure.

open_braces = text.count('{')
close_braces = text.count('}')
open_parens = text.count('(')
close_parens = text.count(')')
open_angle = text.count('<')
close_angle = text.count('>')

print(f"Braces:   {open_braces} open, {close_braces} close")
print(f"Parens:   {open_parens} open, {close_parens} close")
print(f"Angles:   {open_angle} open, {close_angle} close")

# Stack based parser for tags (ignoring strings/comments for now - imperfect but useful)
stack = []
lines = text.split('\n')
for i, line in enumerate(lines):
    line_num = i + 1
    # Simple regex for tags
    for m in re.finditer(r'<(/?[a-zA-Z0-9\.\-]+)([^>]*)>', line):
        full_tag = m.group(0)
        tag_name_raw = m.group(1)
        
        # Self closing
        if full_tag.endswith('/>'): continue
        if full_tag.startswith('<!--'): continue
        
        if tag_name_raw.startswith('/'):
            # Close
            tname = tag_name_raw[1:]
            if not tname: tname = 'Fragment'
            
            if not stack:
                print(f"Error line {line_num}: Unexpected close </{tname}>")
            else:
                last_tag = stack[-1]
                if last_tag == tname:
                    stack.pop()
                else:
                    print(f"Error line {line_num}: Mismatch close </{tname}>, expected </{last_tag}>")
        else:
            # Open
            tname = tag_name_raw
            if not tname: tname = 'Fragment'
            # Void elements? input, img, br, hr.
            if tname in ['input', 'img', 'br', 'hr']: continue
            
            stack.append(tname)

if stack:
    print(f"Stack remaining: {stack}")
