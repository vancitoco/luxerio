/*
  Maps UI filter state (from URL search params) to Shopify query string + sortKey/reverse.
  Single place so ShopAll and future search pages stay in sync.

  Catalog reality (360 products, 9 tags, exact Size variant values):
    T-Shirts / Shirts      → letter sizes  S M L XL XXL 4XL 5XL
    Jeans / Trousers       → waist sizes   30 32 34 36 38
    Men's Shoes            → "41 EU Or 7 Uk" … "45 EU Or 10 Uk"
    Women's Shoes          → "UK 3 / Euro 36" … "UK 6 / Euro 40"
    Watches (M/W), Sunglasses → no Size axis (Style only)

  Size filter UI values ARE the exact Shopify variant Size strings, so
  buildSizeFilters is a straight pass-through into search productFilters.
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
  { label: "T-Shirts",         value: "t-shirts" },
  { label: "Shirts",           value: "shirts" },
  { label: "Jeans",            value: "jeans" },
  { label: "Trousers",         value: "trousers" },
  { label: "Men's Shoes",      value: "mens-shoes" },
  { label: "Women's Shoes",    value: "womens-shoes" },
  { label: "Watches for Men",  value: "watches-men" },
  { label: "Watches for Women",value: "watches-women" },
  { label: "Sunglasses",       value: "sunglasses" },
];

// Maps URL-safe category values to exact Shopify product tag strings.
const CATEGORY_TAG_MAP = {
  "t-shirts":      "T-Shirts",
  "shirts":        "Shirts",
  "jeans":         "Jeans",
  "trousers":      "Trousers",
  "mens-shoes":    "Men's Shoes",
  "womens-shoes":  "Women's Shoes",
  "watches-men":   "Watches for Men",
  "watches-women": "Watches for Women",
  "sunglasses":    "Sunglasses",
};

// ── Size option groups (UI value === exact Shopify variant Size value) ──

// T-Shirts + Shirts
export const CLOTHING_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL", "4XL", "5XL"];

// Jeans + Trousers (waist)
export const WAIST_SIZE_OPTIONS = ["30", "32", "34", "36", "38"];

// Men's Shoes — label is the short display, value is the exact variant string.
export const MENS_SHOE_OPTIONS = [
  { label: "41 / UK 7",   value: "41 EU Or 7 Uk" },
  { label: "42 / UK 7.5", value: "42 EU Or 7.5Uk" },
  { label: "43 / UK 8.5", value: "43 EU Or 8.5 Uk" },
  { label: "44 / UK 9",   value: "44 EU Or 9 Uk" },
  { label: "45 / UK 10",  value: "45 EU Or 10 Uk" },
];

// Women's Shoes
export const WOMENS_SHOE_OPTIONS = [
  { label: "UK 3 / EU 36",   value: "UK 3 / Euro 36" },
  { label: "UK 4 / EU 37",   value: "UK 4 / Euro 37" },
  { label: "UK 5 / EU 38",   value: "UK 5 / Euro 38" },
  { label: "UK 5.5 / EU 39", value: "UK 5.5 / Euro 39" },
  { label: "UK 6 / EU 40",   value: "UK 6 / Euro 40" },
];

// Sets used to infer which categories a size belongs to (fallback narrowing).
var _LETTER_SET = new Set(CLOTHING_SIZE_OPTIONS);
var _WAIST_SET  = new Set(WAIST_SIZE_OPTIONS);
var _MENS_SHOE_SET   = new Set(MENS_SHOE_OPTIONS.map(function (o) { return o.value; }));
var _WOMENS_SHOE_SET = new Set(WOMENS_SHOE_OPTIONS.map(function (o) { return o.value; }));

// Converts UI size values to Shopify ProductFilter objects for server-side filtering.
// Values are already the exact variant Size strings — straight pass-through.
export function buildSizeFilters(sizes) {
  if (!sizes || !sizes.length) return [];
  return sizes.map(function (s) {
    return { variantOption: { name: "Size", value: s } };
  });
}

function _tagToken(tag) {
  return "tag:" + JSON.stringify(tag);
}

function _tagsToOrQuery(tags) {
  return tags.map(_tagToken).join(" OR ");
}

// Expand selected category values → exact tag strings.
function _categoryTags(categories) {
  var out = [];
  (categories || []).forEach(function (cat) {
    var t = CATEGORY_TAG_MAP[cat] !== undefined ? CATEGORY_TAG_MAP[cat] : cat;
    if (Array.isArray(t)) out = out.concat(t);
    else out.push(t);
  });
  return out;
}

export function buildShopifyQuery({ categories, searchQuery }) {
  categories = categories || [];
  searchQuery = searchQuery || "";
  var parts = [];
  if (searchQuery) parts.push(searchQuery);
  if (categories.length) {
    var tags = _categoryTags(categories);
    var tagQuery = _tagsToOrQuery(tags);
    parts.push(tags.length === 1 ? tagQuery : "(" + tagQuery + ")");
  }
  return parts.join(" AND ") || undefined;
}

export function getSortConfig(value) {
  return SORT_OPTIONS.find(function (o) { return o.value === value; }) || SORT_OPTIONS[0];
}

// SearchSortKeys — this store only supports PRICE and RELEVANCE.
var _SEARCH_SORT_MAP = {
  "newest":     "RELEVANCE",
  "best":       "RELEVANCE",
  "price-asc":  "PRICE",
  "price-desc": "PRICE",
  "alpha":      "RELEVANCE",
};

export function getSearchSortKey(value) {
  return _SEARCH_SORT_MAP[value] || "RELEVANCE";
}

// Given active sizes, infer the tags they can belong to (used when no category
// is selected — search wildcard ignores productFilters, so we narrow by tag).
function _fallbackTagsForSizes(sizes) {
  var tags = [];
  var s = sizes || [];
  if (s.some(function (x) { return _LETTER_SET.has(x); }))      tags.push("T-Shirts", "Shirts");
  if (s.some(function (x) { return _WAIST_SET.has(x); }))       tags.push("Jeans", "Trousers");
  if (s.some(function (x) { return _MENS_SHOE_SET.has(x); }))   tags.push("Men's Shoes");
  if (s.some(function (x) { return _WOMENS_SHOE_SET.has(x); })) tags.push("Women's Shoes");
  return tags;
}

// Builds { query, productFilters } for Shopify's search endpoint.
// Used when size filters are active. The search API supports productFilters,
// but ignores them for a wildcard query — so we always supply a real tag query.
export function buildSearchParams(categories, sizes, searchQuery) {
  var productFilters = buildSizeFilters(sizes || []);

  var queryParts = [];
  if (searchQuery) queryParts.push(searchQuery);

  if ((categories || []).length) {
    queryParts.push("(" + _tagsToOrQuery(_categoryTags(categories)) + ")");
  } else {
    var fallbackTags = _fallbackTagsForSizes(sizes);
    if (fallbackTags.length) queryParts.push("(" + _tagsToOrQuery(fallbackTags) + ")");
  }

  var query = queryParts.join(" AND ") || "*";
  return { query: query, productFilters: productFilters };
}
