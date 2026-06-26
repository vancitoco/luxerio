import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterRail from '../components/FilterRail.jsx';
import SortDropdown from '../components/SortDropdown.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { useProducts } from '../lib/shopify/hooks.js';
import { buildShopifyQuery, getSortConfig } from '../lib/shopify/filters.js';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

const PAGE_SIZE = 12;

export default function ShopAll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const urlCategory = searchParams.get('category') ?? '';
  const urlSizes    = searchParams.get('sizes')?.split(',').filter(Boolean) ?? [];
  const urlSort     = searchParams.get('sort') ?? 'newest';
  const urlQuery    = searchParams.get('q') ?? '';

  const [pendingCategory, setPendingCategory] = useState(urlCategory);
  const [pendingSizes, setPendingSizes]         = useState(urlSizes);

  useEffect(() => {
    setPendingCategory(urlCategory);
    setPendingSizes(urlSizes);
  }, [urlCategory, urlSizes.join(','), urlQuery]);

  // Lock body scroll when filter sheet is open on mobile.
  useEffect(() => {
    document.body.style.overflow = filterSheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filterSheetOpen]);

  const sortConfig = getSortConfig(urlSort);
  const shopifyQuery = buildShopifyQuery({ category: urlCategory, sizes: urlSizes, searchQuery: urlQuery });

  const [cursor, setCursor]     = useState(null);
  const [allProducts, setAll]   = useState([]);
  const [isFetchingMore, setFetchMore] = useState(false);

  const { data, isLoading, isFetching } = useProducts({
    first:   PAGE_SIZE,
    sortKey: sortConfig.sortKey,
    reverse: sortConfig.reverse,
    after:   cursor,
    query:   shopifyQuery,
  });

  useEffect(() => {
    setCursor(null);
    setAll([]);
    setFetchMore(false);
  }, [shopifyQuery, urlSort]);

  useEffect(() => {
    if (!data?.edges) return;
    const nodes = data.edges.map((e) => e.node);
    setAll((prev) => {
      if (!cursor) return nodes;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...nodes.filter((n) => !ids.has(n.id))];
    });
    setFetchMore(false);
  }, [data]);

  const handleLoadMore = useCallback(() => {
    if (!data?.pageInfo?.hasNextPage) return;
    setFetchMore(true);
    setCursor(data.pageInfo.endCursor);
  }, [data]);

  const handleApply = () => {
    const params = {};
    if (pendingCategory) params.category = pendingCategory;
    if (pendingSizes.length) params.sizes = pendingSizes.join(',');
    if (urlSort !== 'newest') params.sort = urlSort;
    setSearchParams(params, { replace: true });
    trackEvent(EVENTS.FILTER_APPLY, { category: pendingCategory, sizes: pendingSizes.join(',') });
  };

  const handleSort = (val) => {
    setSearchParams(
      (p) => { const next = new URLSearchParams(p); next.set('sort', val); return next; },
      { replace: true }
    );
    trackEvent(EVENTS.SORT_CHANGE, { sort_value: val });
  };

  const activeFilterCount = [urlCategory && urlCategory !== '', ...urlSizes].filter(Boolean).length;

  const totalShown = allProducts.length;
  const hasNextPage = data?.pageInfo?.hasNextPage ?? false;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-16">
      {/* Page header. */}
      <div className="mb-8 border-b border-hairline pb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-primary md:text-5xl">
          {urlQuery ? `"${urlQuery}"` : 'Shop'}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wider text-secondary">
          {isLoading
            ? 'Loading…'
            : totalShown > 0
            ? `Showing ${totalShown} technical garment${totalShown !== 1 ? 's' : ''}${hasNextPage ? '+' : ''}.`
            : 'No garments found.'}
        </p>
      </div>

      {/* Mobile toolbar: filter button + sort. */}
      <div className="mb-6 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          aria-expanded={filterSheetOpen}
          aria-controls="filter-sheet"
          className="flex items-center gap-2 border border-hairline px-4 py-2 font-display text-[10px] font-black uppercase tracking-widest text-primary transition-colors hover:border-acid hover:text-acid"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center bg-acid text-[9px] font-black text-black">
              {activeFilterCount}
            </span>
          )}
        </button>
        <SortDropdown value={urlSort} onChange={handleSort} />
      </div>

      {/* Desktop sort bar. */}
      <div className="mb-6 hidden justify-end md:flex">
        <SortDropdown value={urlSort} onChange={handleSort} />
      </div>

      {/* Layout: rail (desktop) + grid. */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Desktop filter rail. */}
        <div className="hidden md:block">
          <FilterRail
            category={pendingCategory}
            sizes={pendingSizes}
            onCategoryChange={setPendingCategory}
            onSizesChange={setPendingSizes}
            onApply={handleApply}
          />
        </div>

        <ProductGrid
          products={allProducts}
          isLoading={isLoading && !isFetchingMore}
          isFetchingMore={isFetchingMore || (isFetching && !!cursor)}
          hasNextPage={hasNextPage}
          onLoadMore={handleLoadMore}
        />
      </div>

      {/* Mobile filter bottom sheet. */}
      <div
        aria-hidden="true"
        onClick={() => setFilterSheetOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          filterSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        id="filter-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] overflow-y-auto bg-base transition-transform duration-300 ease-in-out md:hidden ${
          filterSheetOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <FilterRail
          category={pendingCategory}
          sizes={pendingSizes}
          onCategoryChange={setPendingCategory}
          onSizesChange={setPendingSizes}
          onApply={handleApply}
          onClose={() => setFilterSheetOpen(false)}
        />
      </div>
    </div>
  );
}
