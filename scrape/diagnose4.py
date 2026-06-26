import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

# Crocs is likely the product with M-format sizes — check it
url = "https://shoesmaster.in/croc-s-classic-yukon-clog-sandal-brown-npi578523174-shoesmaster.html"
r = requests.get(url, headers=HEADERS, timeout=15)
soup = BeautifulSoup(r.text, "html.parser")

size_els = soup.find_all(class_="size_clickk")
print(f"size_clickk elements found: {len(size_els)}")
for el in size_els:
    print(f"  text={repr(el.get_text(strip=True))}")
