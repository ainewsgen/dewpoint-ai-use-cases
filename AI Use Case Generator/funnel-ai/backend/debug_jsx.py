
import re

file_path = '../frontend/src/pages/Leads.jsx'

with open(file_path, 'r') as f:
    lines = f.readlines()

stack = []
content = "".join(lines)

# Regex to capture:
# 1. Closing slash /?
# 2. Tag name (letters, numbers, dot, dash) -> [a-zA-Z0-9\.\-]+ 
#    Actually, standard tags are just letters/numbers/dot. Dash for custom elements.
# 3. Attributes (anything until >)
tag_regex = re.compile(r'<(/?[a-zA-Z0-9\.\-]+)?([^>]*)>')

for m in tag_regex.finditer(content):
    full_tag = m.group(0)
    tag_group = m.group(1) # This includes leading slash if present. e.g. "/div" or "div" or "/" or None (for <>)
    attrs = m.group(2)
    pos = m.start()
    line_num = content[:pos].count('\n') + 1

    # Skip comments
    if full_tag.startswith('<!--'): continue
    
    # Self-closing
    if full_tag.endswith('/>'):
        continue
    
    # Analyze tag name
    if tag_group is None:
        # Matches <>
        tag_name = 'Fragment'
        is_closing = False
    elif tag_group == '/':
        # Matches </>
        tag_name = 'Fragment'
        is_closing = True
    else:
        is_closing = tag_group.startswith('/')
        tag_name = tag_group[1:] if is_closing else tag_group
    
    # Ignore invalid tags or script artifacts
    if not tag_name: continue

    if is_closing:
        if not stack:
            print(f"Error: Unexpected closing tag </{tag_name}> at line {line_num}. Stack empty.")
            break
        
        last_tag, last_line = stack[-1]
        
        if tag_name == last_tag:
            stack.pop()
        else:
             print(f"Error: Mismatch at line {line_num}. Found </{tag_name}> but expected closing </{last_tag}> (opened at line {last_line}).")
             break
    else:
        stack.append((tag_name, line_num))

if stack:
    print("Error: Unclosed tags remaining at EOF:")
    for tag, line in stack:
        print(f"  <{tag}> opened at line {line}")
else:
    print("Success: No tag mismatches found.")
