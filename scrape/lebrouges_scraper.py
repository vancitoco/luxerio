import requests
import pandas as pd
from pathlib import Path

BASE_URL = "https://lebrouges.in"
VENDOR = "Vancito.co"
PRODUCTS_TARGET = 40

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# collection handle → name, price discount (subtracted from source), Shopify taxonomy
COLLECTIONS = [
    {
        "handle":   "t-shirts",
        "name":     "T-Shirts",
        "discount": 400,
        "taxonomy": "Apparel & Accessories > Clothing > Clothing Tops",
    },
    {
        "handle":   "shirts",
        "name":     "Shirts",
        "discount": 400,
        "taxonomy": "Apparel & Accessories > Clothing > Clothing Tops",
    },
    {
        "handle":   "denims",
        "name":     "Jeans",
        "discount": 400,
        "taxonomy": "Apparel & Accessories > Clothing > Pants",
    },
    {
        "handle":   "jeans-trousers",
        "name":     "Trousers",
        "discount": 400,
        "taxonomy": "Apparel & Accessories > Clothing > Pants",
    },
    {
        "handle":   "watches-for-women",
        "name":     "Watches for Women",
        "discount": 200,
        "taxonomy": "Apparel & Accessories > Jewelry > Watches",
    },
    {
        "handle":   "watches-for-men",
        "name":     "Watches for Men",
        "discount": 200,
        "taxonomy": "Apparel & Accessories > Jewelry > Watches",
    },
    {
        "handle":   "mens-footwear",
        "name":     "Men's Shoes",
        "discount": 500,
        "taxonomy": "Apparel & Accessories > Shoes",
    },
    {
        "handle":   "nike-womens",
        "name":     "Women's Shoes",
        "discount": 500,
        "taxonomy": "Apparel & Accessories > Shoes",
    },
    {
        "handle":   "sunglasses",
        "name":     "Sunglasses",
        "discount": 100,
        "taxonomy": "Apparel & Accessories > Clothing Accessories > Sunglasses",
    },
]


def fetch_products(handle: str) -> list:
    """Pull up to 250 products from a Shopify collection, sorted by best-selling."""
    url = f"{BASE_URL}/collections/{handle}/products.json"
    resp = requests.get(
        url,
        params={"sort_by": "best-selling", "limit": 250},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("products", [])


def is_available(product: dict) -> bool:
    return any(v["available"] for v in product["variants"])


def compute_prices(price_str: str, discount: int) -> tuple[int, int]:
    """Returns (selling_price, compare_at_price). Selling uses X99 psychological pricing."""
    original = int(float(price_str))
    selling = max(1, original - discount)
    # Psychological pricing: X00 -> X99 (subtract 1)
    if selling > 1:
        selling -= 1
    return selling, original


def build_rows(product: dict, discount: int, taxonomy: str, tag: str) -> list:
    rows = []
    handle = product["handle"]
    title = product["title"]
    description = product.get("body_html", "")
    images = [img["src"] for img in product.get("images", [])]

    options = product.get("options", [])
    option1_name = options[0]["name"] if options else "Title"

    for i, variant in enumerate(product["variants"]):
        size = variant.get("option1") or "One Size"
        selling, compare = compute_prices(variant["price"], discount)

        row = {
            "URL handle":                       handle,
            "Vendor":                           VENDOR,
            "Fulfillment service":              "manual",
            "Requires shipping":                True,
            "Continue selling when out of stock": "DENY",
            "Option1 name":                     option1_name if size != "One Size" else "Title",
            "Option1 value":                    size,
            "Price":                            selling,
            "Compare-at price":                 compare,
        }

        if i == 0:
            row["Title"]                       = title
            row["Description"]                 = description
            row["Product category"]            = taxonomy
            row["Tags"]                        = tag
            row["Status"]                      = "Active"
            row["Published on online store"]   = True

        if i < len(images):
            row["Product image URL"] = images[i]
            row["Image position"]    = i + 1

        rows.append(row)

    return rows


def write_csv(rows: list, name: str, template_df: pd.DataFrame) -> Path:
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    slug = name.lower().replace(" ", "-").replace("'", "")
    filename = output_dir / f"lebrouges-{slug}.csv"

    output_df = pd.DataFrame(rows)
    final_df = pd.DataFrame(columns=template_df.columns)

    for col in final_df.columns:
        if col in output_df.columns:
            final_df[col] = output_df[col].values
        else:
            for scraped_col in output_df.columns:
                if col.strip().lower() == scraped_col.strip().lower():
                    final_df[col] = output_df[scraped_col].values
                    break

    final_df.insert(0, "Handle", output_df["URL handle"].values)
    final_df.to_csv(filename, index=False, encoding="utf-8")
    return filename


def scrape_collection(col: dict, template_df: pd.DataFrame):
    handle   = col["handle"]
    name     = col["name"]
    discount = col["discount"]
    taxonomy = col["taxonomy"]

    print(f"\n[{name}]  collection: {handle}")

    try:
        all_products = fetch_products(handle)
    except Exception as e:
        print(f"  ERROR fetching: {e}")
        return

    available = [p for p in all_products if is_available(p)]
    selected  = available[:PRODUCTS_TARGET]

    print(f"  {len(all_products)} total | {len(available)} in-stock | {len(selected)} selected")

    if not selected:
        print("  Skipping — no available products.")
        return

    rows = []
    for product in selected:
        rows.extend(build_rows(product, discount, taxonomy, name))

    filename = write_csv(rows, name, template_df)
    print(f"  -> {filename}  ({len(selected)} products, {len(rows)} rows)")


def main():
    template_df = pd.read_csv("product_template.csv")
    print("Scraping lebrouges.in — 9 collections\n")

    for col in COLLECTIONS:
        scrape_collection(col, template_df)

    print("\nDone.")


if __name__ == "__main__":
    main()
