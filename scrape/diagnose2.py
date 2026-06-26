import requests
from bs4 import BeautifulSoup
import re

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
url = "https://shoesmaster.in/on-cloudnova-form-2-ghost-lense-npi578387525-shoesmaster.html"
r = requests.get(url, headers=HEADERS, timeout=15)
soup = BeautifulSoup(r.text, "html.parser")

# Find SIZE label and show its parent tree
print("=== SIZE LABEL PARENT CHAIN ===")
size_label = soup.find("label", string=re.compile(r"^\s*size\s*$", re.I))
if not size_label:
    size_label = soup.find(lambda t: t.name in ["label", "span", "div", "h4", "p"]
                           and t.get_text(strip=True).upper() == "SIZE")

if size_label:
    print(f"Found: <{size_label.name} class={size_label.get('class')}> = {repr(size_label.get_text())}")
    p = size_label.parent
    for level in range(5):
        print(f"  Parent L{level+1}: <{p.name} class={p.get('class')}> children_count={len(list(p.children))}")
        # Show direct children text
        for child in p.children:
            if hasattr(child, 'get_text'):
                t = child.get_text(strip=True)
                if t:
                    print(f"    child <{child.name} class={child.get('class')}> = {repr(t[:60])}")
        p = p.parent
        if not p:
            break
else:
    print("SIZE label NOT FOUND")

print("\n=== SIZE LABEL NEXT SIBLINGS ===")
if size_label:
    count = 0
    for sib in size_label.next_siblings:
        if hasattr(sib, "get_text"):
            t = sib.get_text(strip=True)
            if t:
                print(f"  <{sib.name} class={sib.get('class')}> = {repr(t[:80])}")
                count += 1
        if count >= 10:
            break

print("\n=== RELATED PRODUCTS heading ===")
for el in soup.find_all(["h1","h2","h3","h4","div","span"]):
    if "related" in el.get_text(strip=True).lower():
        print(f"  <{el.name} class={el.get('class')}> = {repr(el.get_text(strip=True)[:60])}")
        break
