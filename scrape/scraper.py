import time
import re
import json
import argparse
import requests
from bs4 import BeautifulSoup
import pandas as pd
from pathlib import Path
from tqdm import tqdm

# ==========================================
#                  CONFIG
# ==========================================
PRODUCTS_PER_FILE = 1500
BASE_DELAY = 0.5
MAX_DELAY = 2.0
MAX_RETRIES = 3
CHECKPOINT_SAVE_INTERVAL = 50   # save checkpoint every N products
VENDOR = "Luxerio"
BASE_DOMAIN = "https://shoesmaster.in"
ALLCATEGORY_URL = f"{BASE_DOMAIN}/allcategory.html"
FALLBACK_PRICE = "3499"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Shopify Standard Product Taxonomy — paths verified from Shopify admin category picker
TAXONOMY_MAP = {
    # Footwear
    "men's shoe":               "Apparel & Accessories > Shoes",
    "women's shoes":            "Apparel & Accessories > Shoes",
    "flipflops/crocs":          "Apparel & Accessories > Shoes > Sandals",
    "flip-flop":                "Apparel & Accessories > Shoes > Sandals",
    "premium flip-flop":        "Apparel & Accessories > Shoes > Sandals",
    "sandals/chappal":          "Apparel & Accessories > Shoes > Sandals",
    "loafers or formals":       "Apparel & Accessories > Shoes",
    "loafers":                  "Apparel & Accessories > Shoes",
    "mens's sneakers":          "Apparel & Accessories > Shoes > Sneakers",
    "premium shoes":            "Apparel & Accessories > Shoes",
    "shoes":                    "Apparel & Accessories > Shoes",
    # Watches
    "mens watch":               "Apparel & Accessories > Jewelry > Watches",
    "ladies watch":             "Apparel & Accessories > Jewelry > Watches",
    "girls watch":              "Apparel & Accessories > Jewelry > Watches",
    "luxury watch collection":  "Apparel & Accessories > Jewelry > Watches",
    # Eyewear
    "sunglasses":               "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "ladies sunglasses":        "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "premium sunglass":         "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "sunglasses and frames":    "Apparel & Accessories > Clothing Accessories > Sunglasses",
    "frames":                   "Apparel & Accessories > Clothing Accessories > Sunglasses",
    # Bags
    "hand bags":                "Apparel & Accessories > Handbags, Wallets & Cases",
    "sling bag":                "Apparel & Accessories > Handbags, Wallets & Cases",
    "travelling bags":          "Apparel & Accessories > Handbags, Wallets & Cases",
    "trolly bag":               "Apparel & Accessories > Handbags, Wallets & Cases",
    "bag pack":                 "Apparel & Accessories > Handbags, Wallets & Cases",
    "duffel bag":               "Apparel & Accessories > Handbags, Wallets & Cases",
    "laptop bags":              "Apparel & Accessories > Handbags, Wallets & Cases",
    "bags":                     "Apparel & Accessories > Handbags, Wallets & Cases",
    # Wallets & Belts
    "wallet":                   "Apparel & Accessories > Handbags, Wallets & Cases",
    "women wallet":             "Apparel & Accessories > Handbags, Wallets & Cases",
    "wallets and belts":        "Apparel & Accessories > Handbags, Wallets & Cases",
    "belts":                    "Apparel & Accessories > Clothing Accessories",
    # Clothing
    "hoodies":                  "Apparel & Accessories > Clothing > Activewear",
    "premium sweatshirts":      "Apparel & Accessories > Clothing > Activewear",
    "sweatshirts":              "Apparel & Accessories > Clothing > Activewear",
    "shirts":                   "Apparel & Accessories > Clothing > Clothing Tops",
    "women's shirts":           "Apparel & Accessories > Clothing > Clothing Tops",
    "t-shirts":                 "Apparel & Accessories > Clothing > Clothing Tops",
    "women's t-shirts":         "Apparel & Accessories > Clothing > Clothing Tops",
    "tops":                     "Apparel & Accessories > Clothing > Clothing Tops",
    "jackets":                  "Apparel & Accessories > Clothing > Outerwear",
    "jeans":                    "Apparel & Accessories > Clothing > Pants",
    "trousers":                 "Apparel & Accessories > Clothing > Pants",
    "shorts and 3/4ths":        "Apparel & Accessories > Clothing > Shorts",
    "cargos":                   "Apparel & Accessories > Clothing > Pants",
    "track pants":              "Apparel & Accessories > Clothing > Activewear",
    "premium track suits":      "Apparel & Accessories > Clothing > Activewear",
    "pant shirt combo pair":    "Apparel & Accessories > Clothing > Outfit Sets",
    "combo shorts and t-shirts":"Apparel & Accessories > Clothing > Outfit Sets",
    "cord sets":                "Apparel & Accessories > Clothing > Outfit Sets",
    "premium womens clothing":  "Apparel & Accessories > Clothing",
    # Accessories
    "scarf":                    "Apparel & Accessories > Clothing Accessories > Scarves & Shawls",
    "cap":                      "Apparel & Accessories > Clothing Accessories",
    "womens accessories":       "Apparel & Accessories > Clothing Accessories",
    # Fragrance
    "unisex perfume":           "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    "fragrance":                "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    "fragrance gift set":       "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    "perfume for women":        "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    "perfume for men":          "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    "perfume combo":            "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    "perfume":                  "Health & Beauty > Personal Care > Cosmetics > Perfumes & Colognes",
    # Electronics
    "i watch and airpods":      "Electronics > Wearable Technology",
    # Kids
    "junior vibes":             "Apparel & Accessories > Clothing > Baby & Children's Clothing",
}


# ==========================================
#              UTILITY
# ==========================================

def clean_handle(title):
    handle = title.lower().strip()
    handle = re.sub(r'[^a-z0-9\s-]', '', handle)
    handle = re.sub(r'[\s-]+', '-', handle)
    return handle.strip('-')


def normalize_size(raw):
    raw = raw.strip()
    uk_eur = re.search(r'uk[- ](\d+(?:\.\d+)?)\s+eur[- ](\d+)', raw, re.IGNORECASE)
    if uk_eur:
        return f"Euro {uk_eur.group(2)} / UK {uk_eur.group(1)}"
    euro_uk = re.search(r'euro\s*(\d+)[^a-z0-9]*(?:uk|u\.k\.?)\s*(\d+(?:\.\d+)?)', raw, re.IGNORECASE)
    if euro_uk:
        return f"Euro {euro_uk.group(1)} / UK {euro_uk.group(2)}"
    num_match = re.match(r'^(\d+(?:\.\d+)?)$', raw)
    if num_match:
        val = float(num_match.group(1))
        return str(int(val)) if val == int(val) else str(val)
    return raw


class AdaptiveDelay:
    def __init__(self):
        self.current = BASE_DELAY

    def success(self):
        self.current = max(BASE_DELAY, self.current * 0.9)

    def failure(self):
        self.current = min(MAX_DELAY, self.current * 1.5)

    def sleep(self):
        time.sleep(self.current)


# ==========================================
#           CATEGORY DISCOVERY
# ==========================================

def discover_categories():
    try:
        response = requests.get(ALLCATEGORY_URL, headers=HEADERS, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"❌ Failed to fetch category page: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    categories = []
    seen_urls = set()

    for a in soup.find_all('a', href=True):
        href = a['href']
        if not href.startswith('http'):
            href = f"{BASE_DOMAIN}{href}"
        if href in seen_urls:
            continue
        if any(x in href for x in ['/cms/', 'allcategory', 'allproduct', 'store_login', 'privacy', 'refund', 'contact', 'about', 'wishlist', 'cart', 'checkout']):
            continue
        if not href.endswith('.html'):
            continue

        name = a.get_text(strip=True)
        if not name or len(name) < 3:
            continue
        if name.lower() in {'products', 'wishlist', 'login', 'signup', 'home', 'cart', 'search', 'account'}:
            continue

        normalized_name = name.lower().replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
        taxonomy = TAXONOMY_MAP.get(normalized_name, "Apparel & Accessories")
        categories.append({"name": name, "url": href, "taxonomy": taxonomy})
        seen_urls.add(href)

    return categories


# ==========================================
#           PRODUCT URL DISCOVERY
# ==========================================

def _extract_web_token(category_url):
    """Extract the web_token CartPe embeds in the category page JS."""
    try:
        r = requests.get(category_url, headers=HEADERS, timeout=10)
        match = re.search(r'web_token\s*=\s*["\']([a-f0-9]{60,})["\']', r.text)
        if match:
            return match.group(1)
    except Exception:
        pass
    return None


def _extract_category_slug(category_url):
    """Derive the CartPe category slug from its URL."""
    return category_url.rstrip('/').split('/')[-1].replace('.html', '')


def discover_product_urls(category_meta):
    """Use CartPe's AJAX load-more endpoint to discover all product URLs + prices.
    Returns (list_of_urls, dict_of_url_to_prices).
    Prices come from category cards — reliable since they're server-rendered in the
    AJAX response, unlike product detail pages which load prices via JS.
    """
    cat_url = category_meta["url"]
    cat_slug = _extract_category_slug(cat_url)
    all_urls = []
    url_prices = {}   # url → {"selling_price": str, "compare_price": str|None}
    seen = set()

    print(f"  Fetching web_token from category page...")
    web_token = _extract_web_token(cat_url)
    if not web_token:
        print(f"  ⚠️  Could not extract web_token — falling back to page pagination")
        urls = _discover_via_pagination(cat_url)
        return urls, {}
    print(f"  Token: {web_token[:16]}...")

    print(f"  Discovering product URLs + prices via AJAX endpoint...")
    offset = 0
    BATCH = 24
    consecutive_empty = 0

    while True:
        try:
            resp = requests.post(
                f"{BASE_DOMAIN}/store_product_loadmore_builder",
                data={
                    "getresult": offset,
                    "searchkeyword": "",
                    "orderby": "featured",
                    "category_slug": cat_slug,
                    "min_price": "",
                    "max_price": "",
                    "size_ids": "",
                    "variant_status": 0,
                    "web_token": web_token,
                },
                headers={**HEADERS, "X-Requested-With": "XMLHttpRequest",
                         "Referer": cat_url},
                timeout=15,
            )

            if resp.status_code != 200 or resp.text.strip() == '0':
                break

            soup = BeautifulSoup(resp.text, 'html.parser')

            # Extract prices from product-productMetaInfo cards first
            card_price_map = {}
            for card in soup.find_all(class_='product-productMetaInfo'):
                # Walk up to find the product link
                ancestor = card.parent
                href = None
                while ancestor:
                    a = ancestor.find('a', href=True)
                    if a:
                        h = a['href']
                        if not h.startswith('http'):
                            h = f"{BASE_DOMAIN}{h}"
                        slug = h.split('/')[-1].replace('.html', '')
                        if 'shoesmaster' in slug.lower():
                            href = h
                            break
                    ancestor = ancestor.parent

                prices = re.findall(r'Rs\s*([\d.]+)', card.get_text())
                prices = [p.split('.')[0] for p in prices if int(p.split('.')[0]) > 99]
                if href and prices:
                    card_price_map[href] = {
                        "selling_price": prices[0],
                        "compare_price": prices[1] if len(prices) >= 2 else None,
                    }

            links_found = 0
            for a in soup.find_all('a', href=True):
                href = a['href']
                if not href.startswith('http'):
                    href = f"{BASE_DOMAIN}{href}"
                slug = href.split('/')[-1].replace('.html', '')
                if 'shoesmaster' not in slug.lower():
                    continue
                links_found += 1
                if href not in seen:
                    seen.add(href)
                    all_urls.append(href)
                    if href in card_price_map:
                        url_prices[href] = card_price_map[href]

            if links_found == 0:
                consecutive_empty += 1
                if consecutive_empty >= 3:
                    break
            else:
                consecutive_empty = 0

            offset += BATCH
            if offset % (BATCH * 20) == 0:
                print(f"    Offset {offset}: {len(all_urls)} URLs so far "
                      f"({len(url_prices)} with prices)...")

        except Exception as e:
            print(f"  ⚠️  AJAX error at offset {offset}: {e}")
            break

        time.sleep(0.2)

    print(f"  Found {len(all_urls)} product URLs, {len(url_prices)} with prices.")
    return all_urls, url_prices


def _discover_via_pagination(cat_url):
    """Fallback: old page-based pagination (caps ~600)."""
    all_urls = []
    seen = set()
    for page in range(1, 500):
        try:
            r = requests.get(f"{cat_url}?page={page}&size_id=", headers=HEADERS, timeout=10)
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, 'html.parser')
            cards = soup.find_all('a', href=lambda x: x and x.endswith('.html') and '-' in x)
            found_new = False
            for c in cards:
                href = c['href']
                if not href.startswith('http'):
                    href = f"{BASE_DOMAIN}{href}"
                slug = href.split('/')[-1].replace('.html', '')
                if 'shoesmaster' not in slug.lower():
                    continue
                if href not in seen:
                    seen.add(href)
                    all_urls.append(href)
                    found_new = True
            if not found_new:
                break
        except Exception:
            break
        time.sleep(0.3)
    return all_urls


# ==========================================
#           PRODUCT DETAIL SCRAPING
# ==========================================

def scrape_product_details(product_url, delay: AdaptiveDelay):
    title = None
    description = None
    selling_price = None
    compare_price = None
    sizes = []
    images = []

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(product_url, headers=HEADERS, timeout=10)
            if response.status_code != 200:
                delay.failure()
                if attempt < MAX_RETRIES - 1:
                    delay.sleep()
                continue

            soup = BeautifulSoup(response.text, 'html.parser')

            # TITLE
            name_el = soup.find(class_='product-name')
            if name_el:
                title = name_el.get_text(strip=True)
            if not title:
                phone_re = re.compile(r'\+?\d[\d\s\-]{7,}')
                skip_kw = ['cash on delivery', 'easy exchange', 'free shipping', 'whatsapp', 'related products']
                for h1 in soup.find_all('h1'):
                    candidate = h1.get_text(strip=True)
                    if len(candidate) < 5:
                        continue
                    if phone_re.search(candidate):
                        continue
                    if any(kw in candidate.lower() for kw in skip_kw):
                        continue
                    if candidate.startswith('Rs.') or candidate.startswith('₹'):
                        continue
                    title = candidate
                    break

            # DESCRIPTION
            for sel in [{'class': re.compile(r'description|product-desc|product-detail|product-info', re.I)}]:
                desc_el = soup.find(['div', 'p', 'section'], sel)
                if desc_el:
                    text = desc_el.get_text(separator=' ', strip=True)
                    if len(text) > 20:
                        description = text
                        break

            # PRICES — target CartPe's specific price elements first to avoid
            # picking up model numbers or related-product prices from the page
            def extract_rs(text):
                m = re.search(r'Rs\.?\s*([\d,]+)', text, re.I)
                return m.group(1).replace(',', '') if m else None

            # CartPe selling price classes (in priority order)
            for cls in ['selling_price', 'offer-price', 'offer_price',
                        'product-price', 'price-box', 'sale-price']:
                el = soup.find(class_=re.compile(cls, re.I))
                if el:
                    val = extract_rs(el.get_text())
                    if val and int(val) > 99:
                        selling_price = val
                        break

            # CartPe compare/MRP price (struck-through original price)
            for cls in ['compare_price', 'compare-price', 'original-price',
                        'mrp', 'old-price', 'regular-price']:
                el = soup.find(class_=re.compile(cls, re.I))
                if el:
                    val = extract_rs(el.get_text())
                    if val and int(val) > 99:
                        compare_price = val
                        break

            # Fallback: find the two largest Rs. values inside the price section only
            if not selling_price:
                price_section = (soup.find(class_=re.compile(r'price', re.I)) or
                                 soup.find(id=re.compile(r'price', re.I)))
                if price_section:
                    vals = [m.replace(',', '') for m in
                            re.findall(r'Rs\.?\s*([\d,]+)', price_section.get_text(), re.I)]
                    vals = [v for v in vals if int(v) > 99]
                    if vals:
                        selling_price = vals[0]
                    if len(vals) >= 2:
                        compare_price = vals[1]

            # SIZES
            seen_sizes = set()
            size_els = soup.find_all(class_='size_clickk')
            if not size_els:
                container = (soup.find('div', class_='size_smallbox') or
                             soup.find('div', class_=lambda x: x and 'product_size' in ' '.join(x)))
                if container:
                    size_els = container.find_all(['span', 'li', 'button'])
            for el in size_els:
                text = el.get_text(strip=True)
                if not text or len(text) > 40:
                    continue
                normalized = normalize_size(text)
                if normalized not in seen_sizes:
                    seen_sizes.add(normalized)
                    sizes.append(normalized)
            if not sizes:
                sizes = ["One Size"]

            # IMAGES
            all_imgs = soup.find_all('img')
            def extract_src(img):
                src = (img.get('data-zoom-image') or img.get('data-high-res-src') or
                       img.get('data-lazy') or img.get('data-src') or img.get('src') or '')
                src = src.split('?')[0].strip()
                if src.startswith('/'):
                    src = f"{BASE_DOMAIN}{src}"
                return src

            skip_terms = ['logo', 'favicon', 'star.', 'cart-icon', 'loader']
            for img in all_imgs:
                src = extract_src(img)
                if not src or any(x in src.lower() for x in skip_terms):
                    continue
                if 'gallery_md' in src and src not in images:
                    images.append(src)
            if not images:
                for img in all_imgs:
                    src = extract_src(img)
                    if not src or any(x in src.lower() for x in skip_terms):
                        continue
                    if 'gallery_lg' in src and src not in images:
                        images.append(src)

            delay.success()
            return title, description, selling_price, compare_price, sizes, images

        except (requests.Timeout, requests.ConnectionError):
            delay.failure()
            if attempt < MAX_RETRIES - 1:
                delay.sleep()
        except Exception as e:
            delay.failure()
            if attempt < MAX_RETRIES - 1:
                delay.sleep()

    return None, None, None, None, [], []


# ==========================================
#           CATEGORY CRAWLER
# ==========================================

def crawl_category(category_meta, checkpoint_path: Path, skipped_path: Path, fresh: bool, rediscover: bool = False):
    cat_name = category_meta["name"]
    cat_slug = clean_handle(cat_name)
    taxonomy = category_meta["taxonomy"]
    delay = AdaptiveDelay()

    # Load or initialise checkpoint
    checkpoint = {"discovered_urls": [], "url_prices": {}, "scraped": {}, "scraped_urls": [], "skipped": []}
    if not fresh and checkpoint_path.exists():
        with open(checkpoint_path, 'r', encoding='utf-8') as f:
            checkpoint = json.load(f)
        if "url_prices" not in checkpoint:
            checkpoint["url_prices"] = {}
        # Back-compat: older checkpoints may lack scraped_urls — reconstruct from discovered_urls
        if "scraped_urls" not in checkpoint:
            existing_handles = set(checkpoint.get("scraped", {}).keys())
            recovered = []
            for u in checkpoint.get("discovered_urls", []):
                s = u.split('/')[-1].replace('.html', '')
                s = re.sub(r'-npi\d+-shoesmaster', '', s)
                h = clean_handle(s.replace('-', ' ').title())
                if h in existing_handles:
                    recovered.append(u)
            checkpoint["scraped_urls"] = recovered
            print(f"  (Migrated checkpoint: recovered {len(recovered)} scraped URLs)")
        print(f"Resuming from checkpoint: {len(checkpoint['scraped'])} already scraped, "
              f"{len(checkpoint['skipped'])} skipped.")

    # Phase 1 — discover all product URLs (skip if already in checkpoint)
    if rediscover:
        print(f"\nRe-discovering all product URLs (keeping {len(checkpoint['scraped'])} scraped)...")
        checkpoint["discovered_urls"] = []
        checkpoint["scraped_urls"] = []
        checkpoint["url_prices"] = {}

    if not checkpoint["discovered_urls"]:
        print(f"\nPhase 1: Discovering all product URLs for [{cat_name}]...")
        urls, prices = discover_product_urls(category_meta)
        checkpoint["discovered_urls"] = urls
        checkpoint["url_prices"] = prices
        _save_checkpoint(checkpoint, checkpoint_path)
    else:
        print(f"\nUsing {len(checkpoint['discovered_urls'])} URLs from checkpoint.")

    all_urls = checkpoint["discovered_urls"]
    url_prices = checkpoint.get("url_prices", {})
    scraped = checkpoint["scraped"]
    scraped_urls = set(checkpoint["scraped_urls"])
    skipped_set = set(checkpoint["skipped"])

    remaining = [u for u in all_urls if u not in scraped_urls and u not in skipped_set]
    print(f"\nPhase 2: Scraping {len(remaining)} remaining products "
          f"({len(scraped)} done, {len(skipped_set)} skipped)...")

    skipped_file = open(skipped_path, 'a', encoding='utf-8')
    products_since_save = 0

    with tqdm(total=len(remaining), unit='product', dynamic_ncols=True) as pbar:
        for url in remaining:
            slug = url.split('/')[-1].replace('.html', '')
            slug = re.sub(r'-npi\d+-shoesmaster', '', slug)
            handle_key = clean_handle(slug.replace('-', ' ').title())

            title, desc, sell_price, cmp_price, sizes, images = scrape_product_details(url, delay)

            if title is None and not sizes:
                skipped_set.add(url)
                checkpoint["skipped"] = list(skipped_set)
                skipped_file.write(url + '\n')
                skipped_file.flush()
                pbar.update(1)
                pbar.set_postfix(delay=f"{delay.current:.1f}s", skipped=len(skipped_set))
                delay.sleep()
                continue

            # Use prices from discovery (reliable, server-rendered in AJAX cards)
            # Product pages load prices via JS so requests.get() can't see them
            discovered = url_prices.get(url, {})
            final_sell = discovered.get("selling_price") or sell_price or FALLBACK_PRICE
            final_cmp = discovered.get("compare_price") or cmp_price

            fallback_title = slug.replace('-', ' ').title()
            scraped[handle_key] = {
                "title": title or fallback_title,
                "description": desc or f"Premium quality {title or fallback_title} available now.",
                "selling_price": final_sell,
                "compare_price": final_cmp,
                "sizes": sizes,
                "images": images,
                "tags": cat_name,
                "taxonomy": taxonomy,
            }
            scraped_urls.add(url)
            checkpoint["scraped"] = scraped
            checkpoint["scraped_urls"] = list(scraped_urls)
            products_since_save += 1

            if products_since_save >= CHECKPOINT_SAVE_INTERVAL:
                _save_checkpoint(checkpoint, checkpoint_path)
                products_since_save = 0

            pbar.update(1)
            pbar.set_postfix(delay=f"{delay.current:.1f}s", skipped=len(skipped_set), done=len(scraped))
            delay.sleep()

    skipped_file.close()
    _save_checkpoint(checkpoint, checkpoint_path)
    print(f"\nDone. {len(scraped)} scraped, {len(skipped_set)} skipped.")
    if skipped_set:
        print(f"Skipped URLs written to: {skipped_path}")
    return scraped


def _save_checkpoint(checkpoint, path: Path):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(checkpoint, f, ensure_ascii=False)


# ==========================================
#           CSV BUILDER
# ==========================================

def build_shopify_csvs(scraped_registry: dict, category_slug: str):
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    template_df = pd.read_csv('product_template.csv')
    products = list(scraped_registry.items())
    total_products = len(products)
    chunks = [products[i:i + PRODUCTS_PER_FILE] for i in range(0, total_products, PRODUCTS_PER_FILE)]

    print(f"\nBuilding {len(chunks)} CSV file(s) from {total_products} products...")

    for idx, chunk in enumerate(chunks):
        start_num = idx * PRODUCTS_PER_FILE + 1
        end_num = min(start_num + len(chunk) - 1, total_products)
        filename = output_dir / f"{category_slug}_{start_num}-{end_num}.csv"

        shopify_rows = []
        for handle, item in chunk:
            sizes = item['sizes']
            images = item['images']
            for i, size in enumerate(sizes):
                row = {
                    'URL handle': handle,
                    'Vendor': VENDOR,
                    'Fulfillment service': 'manual',
                    'Requires shipping': True,
                    'Continue selling when out of stock': 'DENY',
                    'Option1 name': 'Size' if size != 'One Size' else 'Title',
                    'Option1 value': size,
                    'Price': item['selling_price'],
                }
                if item['compare_price']:
                    row['Compare-at price'] = item['compare_price']
                if i == 0:
                    row['Title'] = item['title']
                    row['Description'] = item['description']
                    row['Product category'] = item['taxonomy']
                    row['Tags'] = item['tags']
                    row['Status'] = 'Active'
                    row['Published on online store'] = True
                if i < len(images):
                    row['Product image URL'] = images[i]
                    row['Image position'] = i + 1
                shopify_rows.append(row)

        output_df = pd.DataFrame(shopify_rows)
        final_df = pd.DataFrame(columns=template_df.columns)
        for col in final_df.columns:
            if col in output_df.columns:
                final_df[col] = output_df[col]
            else:
                for scraped_col in output_df.columns:
                    if col.strip().lower() == scraped_col.strip().lower():
                        final_df[col] = output_df[scraped_col]
                        break

        final_df.insert(0, 'Handle', output_df['URL handle'].values)
        final_df.to_csv(filename, index=False, encoding='utf-8')
        print(f"  {filename}  ({len(chunk)} products, {len(shopify_rows)} rows)")

    print("Done.")


# ==========================================
#                  MAIN
# ==========================================

def main():
    parser = argparse.ArgumentParser(description="Luxerio product scraper for Shopify CSV import")
    parser.add_argument('--category', type=str, help='Exact category name to scrape (case-insensitive)')
    parser.add_argument('--fresh', action='store_true', help='Ignore existing checkpoint and start fresh')
    parser.add_argument('--rediscover', action='store_true', help='Re-run URL discovery but keep already-scraped products')
    args = parser.parse_args()

    print("Fetching category list from site...")
    categories = discover_categories()
    if not categories:
        print("❌ No categories found. Exiting.")
        return

    # No category specified — print list and exit
    if not args.category:
        print("\nAvailable categories:\n")
        for i, cat in enumerate(categories, 1):
            print(f"  {i:3}. {cat['name']}")
        print(f'\nUsage: python scraper.py --category "Men\'s Shoe"')
        print(f'       python scraper.py --category "Men\'s Shoe" --fresh   # ignore checkpoint')
        return

    def norm(s):
        return s.lower().replace('’', "'").replace('‘', "'")

    target = next((c for c in categories if norm(c['name']) == norm(args.category)), None)
    if not target:
        print(f"\n❌ Category '{args.category}' not found. Valid options:\n")
        for i, cat in enumerate(categories, 1):
            print(f"  {i:3}. {cat['name']}")
        return

    cat_slug = clean_handle(target['name'])
    checkpoint_path = Path(f"checkpoint_{cat_slug}.json")
    skipped_path = Path(f"skipped_{cat_slug}.txt")

    print(f"\nTarget category : {target['name']}")
    print(f"Taxonomy        : {target['taxonomy']}")
    print(f"Checkpoint file : {checkpoint_path}")
    print(f"Output dir      : output/")

    scraped = crawl_category(target, checkpoint_path, skipped_path, args.fresh, args.rediscover)
    if scraped:
        build_shopify_csvs(scraped, cat_slug)
    else:
        print("Nothing scraped.")


if __name__ == "__main__":
    main()
