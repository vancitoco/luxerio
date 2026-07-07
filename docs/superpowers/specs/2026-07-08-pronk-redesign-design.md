# Vancito.co — Pronk-Reference Redesign

**Date:** 2026-07-08
**Reference:** https://pronk.in/ (client-provided screenshots)
**Approach:** Restyle in place. All working logic untouched — Shopify Storefront queries, search-based size filtering, cart context, customer auth, checkout redirect. Design tokens + per-page layout rework only.

## 1. Design System

- **Light mode (new default):** white base `#ffffff`, surface `#fafafa`, near-black text `#111111`, secondary gray `#6b6b6b`, hairline `rgba(0,0,0,0.08)`.
- **Dark mode (toggle stays):** inverted — base `#0f0f0f`, surface `#171717`, white text, hairline `rgba(255,255,255,0.1)`.
- **Sale red** (`#e53935` family): sale price + "Save X%" only. No other reds.
- **Gold:** logo mark only. No gold UI accents.
- **Acid green removed entirely** (tokens, hovers, badges, strips, focus states).
- **Typography:** uppercase + wide letterspacing for nav/headings (pronk-style). Archivo for headings at medium/semibold weights (drop the all-900 brutalist look), Inter for body/prices.
- Theme flip stays class-based (`.dark` on `<html>`), tokens live in `src/index.css` CSS variables, Tailwind config unchanged structurally.

## 2. Header Stack

Top→bottom:
1. **Announcement bar:** black bg, white uppercase letterspaced text. Copy is a single editable constant (placeholder: free-shipping/offer line — client supplies final copy). Replaces the acid GreenStrip.
2. **Main header (white/base bg):** logo mark + "VANCITO.CO" wordmark left · center nav `MEN ▾` `WOMEN ▾` `ACCESSORIES ▾` `CATEGORIES` · right icons account / search / cart / theme toggle.
3. **Dropdowns:** plain panels (base bg, hairline border), text links:
   - MEN → T-Shirts, Shirts, Jeans, Trousers, Men's Shoes, Watches for Men
   - WOMEN → Women's Shoes, Watches for Women
   - ACCESSORIES → Sunglasses, Watches for Men, Watches for Women
   - Links go to `/shop?categories=<value>` using existing URL-param filter system.
4. **Mobile:** hamburger → slide sheet, accordion groups for MEN/WOMEN/ACCESSORIES + flat links.

## 3. Home Page

Section order:
1. **Story-bubble row:** 9 circular category thumbnails + uppercase label below each. Image = featured image of first product in that category (fetched from Shopify, no manual assets). Horizontally scrollable, snap. Links to `/shop?categories=<value>`.
2. **Hero:** ~60vh lifestyle banner (not full viewport). Light-appropriate placeholder image (client can swap URL later). Headline + single CTA button to /shop.
3. **BEST SELLERS:** centered uppercase heading, "VIEW ALL" outline button under it, product grid (existing FeaturedProducts data source, restyled cards).
4. **Bento collection tiles:** 2–3 large lifestyle-image tiles with corner/bottom labels (e.g. T-SHIRTS, JEANS, SHOES) linking to category-filtered shop.
5. **Footer.**

Removed: WhatsApp float (client declined), acid GreenStrip, dark industrial grid texture.

## 4. Product Cards

- Image with existing hover-swap (second product image) + existing perf work (srcSet, lazy, fade-in) kept.
- **"New Arrival" badge:** product `createdAt` within 30 days. Black chip, white text.
- Title (normal case or light uppercase, pronk-style), then pricing line:
  - `compareAtPrice > price` → strikethrough compare-at · sale price · red "Save X%".
  - else → plain price.
- Requires adding `compareAtPriceRange`/variant `compareAtPrice` + `createdAt` to product queries. Verify at implementation start whether imported products carry compare-at values; if none do, pricing renders plain price and the sale layout stays dormant until data exists.
- No ratings, no EMI, no bundle badges (no data systems for them).

## 5. Product Page

- Light restyle of existing layout (gallery, variant selector, accordions).
- **BUY NOW** (solid black, primary) beside **ADD TO BAG** (outline, secondary).
- Buy Now behavior: `cartCreate` with only that variant+qty → immediate redirect to returned `checkoutUrl`. Existing bag cart id/localStorage untouched. Disabled state mirrors Add To Bag (sold out / no variant selected).
- GA4 `begin_checkout` fires on Buy Now with single-item payload.

## 6. Remaining Pages

Shop/filter rail, Categories page (kept, per client), Cart, Auth modal, Account, Footer: same structure/logic, restyled to the new token system. Sort dropdown, filter behavior, pagination untouched.

## Out of Scope

- Announcement bar final copy, hero/bento final imagery (client assets later; placeholders shipped).
- Reviews, EMI, bundle offers.
- Any backend/Shopify config change. Checkout/payment (Razorpay) already live and untouched.

## Success Criteria

- Site visually reads as pronk-family: white, minimal, letterspaced streetwear commerce.
- Dark toggle still works across every page with inverted tokens.
- All existing flows still pass: category/size filtering, search, cart ops, discount codes, auth, checkout redirect, Buy Now lands on Shopify checkout with correct single item.
- No acid green pixel anywhere; red only on sale pricing.
