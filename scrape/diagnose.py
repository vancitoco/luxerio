import requests
from bs4 import BeautifulSoup
import re

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
url = "https://shoesmaster.in/on-cloudnova-form-2-ghost-lense-npi578387525-shoesmaster.html"
r = requests.get(url, headers=HEADERS, timeout=15)
soup = BeautifulSoup(r.text, "html.parser")

print("=== TITLE TAG ===")
t = soup.find("title")
print(t.get_text() if t else "NONE")

print("\n=== ALL H1s ===")
for h in soup.find_all("h1"):
    print(repr(h.get_text(strip=True)[:100]))

print("\n=== JSON-LD ===")
for s in soup.find_all("script", type="application/ld+json"):
    print((s.string or "")[:500])

print("\n=== SCRIPTS MENTIONING variant/size/option (first match) ===")
for s in soup.find_all("script"):
    txt = s.string or ""
    if any(k in txt.lower() for k in ["variant", "option_value", "size", "attr_id"]):
        print(txt[:600])
        print("---")
        break

print("\n=== ELEMENTS WITH class containing size/variant/attr/option ===")
for el in soup.find_all(["span", "label", "div", "button", "li", "input"],
                         class_=lambda x: x and any(y in " ".join(x).lower() for y in ["size", "variant", "attr", "option"])):
    txt = el.get_text(strip=True)[:50]
    cls = " ".join(el.get("class", []))
    print(f"  <{el.name} class='{cls}'> text={repr(txt)}")
    if len(txt) > 2:
        break  # show first real match

print("\n=== ALL INPUT tags ===")
for inp in soup.find_all("input"):
    print(f"  type={inp.get('type')} name={inp.get('name')} value={inp.get('value')} class={inp.get('class')}")

print("\n=== TEXT NODES MATCHING SIZE PATTERN ===")
for el in soup.find_all(string=re.compile(r"SIZE|Euro\s*\d+", re.I)):
    p = el.parent
    print(f"  [{p.name} class={p.get('class')}] {repr(str(el).strip()[:80])}")
