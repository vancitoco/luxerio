import requests
from bs4 import BeautifulSoup
import re

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

urls = [
    "https://shoesmaster.in/nik-airmax-1-platinum-white-black-red-npi578530388-shoesmaster.html",
    "https://shoesmaster.in/croc-s-classic-yukon-clog-sandal-brown-npi578523174-shoesmaster.html",
    "https://shoesmaster.in/nikee-air-force-1-low-valentines-day-locket-npi578171535-shoesmaster.html",
]

for url in urls:
    print(f"\n{'='*60}")
    print(f"URL: {url.split('/')[-1]}")
    r = requests.get(url, headers=HEADERS, timeout=15)
    soup = BeautifulSoup(r.text, "html.parser")

    # Check size_smallbox
    size_box = soup.find("div", class_="size_smallbox")
    if size_box:
        print(f"size_smallbox found: {repr(size_box.get_text(strip=True)[:100])}")
        for child in size_box.find_all(["span", "li", "button", "label"]):
            print(f"  child <{child.name} class={child.get('class')}> = {repr(child.get_text(strip=True))}")
    else:
        print("size_smallbox NOT FOUND")

    # Check all divs with size in class
    for el in soup.find_all("div", class_=lambda x: x and any("size" in c.lower() for c in x)):
        print(f"  Size-related div: class={el.get('class')} text={repr(el.get_text(strip=True)[:80])}")

    # Check for any ul/li with size data
    for ul in soup.find_all("ul"):
        items = [li.get_text(strip=True) for li in ul.find_all("li")]
        if any(re.match(r"^(3[5-9]|4[0-7])$", i) or re.search(r"euro\s*\d+", i, re.I) for i in items):
            print(f"  ul with sizes: {items}")
