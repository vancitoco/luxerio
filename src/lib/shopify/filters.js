/*
  Maps UI filter state (from URL search params) to Shopify query string + sortKey/reverse.
  Single place so ShopAll and future search pages stay in sync.
*/

export const SORT_OPTIONS = [
  { label: "Newest Drops",       value: "newest",     sortKey: "CREATED_AT",   reverse: true  },
  { label: "Best Selling",       value: "best",        sortKey: "BEST_SELLING", reverse: false },
  { label: "Price: Low to High", value: "price-asc",  sortKey: "PRICE",        reverse: false },
  { label: "Price: High to Low", value: "price-desc", sortKey: "PRICE",        reverse: true  },
  { label: "A to Z",             value: "alpha",       sortKey: "TITLE",        reverse: false },
];

export const CATEGORY_OPTIONS = [
  { label: "All Items",        value: "" },
  { label: "Men’s Shoe",       value: "mens-shoe" },
  { label: "Flipflops / Crocs",  value: "flipflops-crocs" },
  { label: "Ladies Watch",       value: "ladies-watch" },
  { label: "Mens Watch",         value: "mens-watch" },
  { label: "Sunglasses",         value: "sunglasses" },
  { label: "T-Shirts",           value: "t-shirts" },
  { label: "Women’s Shoes",      value: "womens-shoes" },
];

// Maps URL-safe category values to exact Shopify product tag strings.
// Add entries here as you add tags in Shopify admin.
const CATEGORY_TAG_MAP = {};
CATEGORY_TAG_MAP["mens-shoe"] = "Men’s Shoe";
CATEGORY_TAG_MAP["womens-shoes"] = "Women’s Shoes";
CATEGORY_TAG_MAP["flipflops-crocs"] = "Flipflops/Crocs";
CATEGORY_TAG_MAP["ladies-watch"] = "Ladies Watch";
CATEGORY_TAG_MAP["mens-watch"] = "Mens Watch";
CATEGORY_TAG_MAP["sunglasses"] = "Sunglasses";
CATEGORY_TAG_MAP["t-shirts"] = "T-Shirts";

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export function buildShopifyQuery({ category, sizes, searchQuery }) {
  sizes = sizes || [];
  searchQuery = searchQuery || "";
  var parts = [];
  if (searchQuery) parts.push(searchQuery);
  if (category) {
    var tag = CATEGORY_TAG_MAP[category] !== undefined ? CATEGORY_TAG_MAP[category] : category;
    parts.push("tag:\"" + tag + "\"");
  }
  if (sizes.length) {
    var sizePart = sizes.map(function(s) { return "tag:size-" + s.toLowerCase(); }).join(" OR ");
    parts.push(sizes.length === 1 ? sizePart : "(" + sizePart + ")");
  }
  return parts.join(" AND ") || undefined;
}

export function getSortConfig(value) {
  return SORT_OPTIONS.find(function(o) { return o.value === value; }) || SORT_OPTIONS[0];
}
