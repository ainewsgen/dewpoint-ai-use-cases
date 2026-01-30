
import os

file_path = '../frontend/src/pages/Leads.jsx'

with open(file_path, 'r') as f:
    content = f.read()

# Fix 1: The premature closure at ~line 945
# We search for the specific sequence of characters
target_block = """                )
}
            </div >"""

replacement_block = """                )}
            </div>"""

if target_block in content:
    print("Found target block 1. Replacing...")
    content = content.replace(target_block, replacement_block)
else:
    print("WARNING: Target block 1 NOT found. Dumping surrounding context check:")
    # Let's try to find part of it to debug
    part = "            </div >"
    if part in content:
        print(f"Found '{part}' in content.")
    else:
        print(f"Did NOT find '{part}' in content.")

# Fix 2: The malformed tag at the end
target_tag = "        </div >"
replacement_tag = "        </div>"

if target_tag in content:
     print("Found target tag 2. Replacing...")
     content = content.replace(target_tag, replacement_tag)
else:
    print("WARNING: Target tag 2 NOT found.")

with open(file_path, 'w') as f:
    f.write(content)

print("Done.")
