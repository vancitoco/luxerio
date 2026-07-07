import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FilterRail from '../components/FilterRail.jsx';
import SortDropdown from '../components/SortDropdown.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import { useProducts, prefetchProducts, useSearchProducts, prefetchSearchProducts } from '../lib/shopify/hooks.js';
import { buildShopifyQuery, getSortConfig, buildSearchParams, getSearchSortKey } from '../lib/shopify/filters.js';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

const PAGE_SIZE = 24;

export default function ShopAll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const urlCategories = searchParams.get('categories')?.split(',').filter(Boolean) ?? [];
  const urlSizes      = searchParams.get('sizes')?.split(',').filter(Boolean) ?? [];
  const urlSort       = searchParams.get('sort') ?? 'newest';
  const urlQuery      = searchParams.get('q') ?? '';

  const [pendingCategories, setPendingCategories] = useState(urlCategories);
  const [pendingSizes, setPendingSizes]           = useState(urlSizes);

  useEffect(() => {
    setPendingCategories(urlCategories);
    setPendingSizes(urlSizes);
  }, [location.key]); // reset pending state on every navigation push (not on in-page replace)

  useEffect(() => {
    document.body.style.overflow = filterSheetOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [filterSheetOpen]);

  const sortConfig    = getSortConfig(urlSort);
  const shopifyQuery  = buildShopifyQuery({ categories: urlCategories, searchQuery: urlQuery });
  const useSizeFilter = urlSizes.length > 0;
  const sizeSearchParams = useSizeFilter ? buildSearchParams(urlCategories, urlSizes, urlQuery) : null;
  const searchSortKey    = getSearchSortKey(urlSort);

  const [cursor, setCursor]           = useState(null);
  const [allProducts, setAll]         = useState([]);
  const [isFetchingMore, setFetchMore] = useState(false);

  // Root products query (no size filter active)
  const { data: productsData, isLoading: prodLoading, isFetching: prodFetching } = useProducts({
    first:   PAGE_SIZE,
    sortKey: sortConfig.sortKey,
    reverse: sortConfig.reverse,
    after:   cursor,
    query:   shopifyQuery,
    enabled: !useSizeFilter,
  });

  // Search query (size filter active — search endpoint supports productFilters)
  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useSearchProducts({
    query:          sizeSearchParams?.query,
    first:          PAGE_SIZE,
    sortKey:        searchSortKey,
    reverse:        sortConfig.reverse,
    after:          cursor,
    productFilters: sizeSearchParams?.productFilters,
    enabled:        useSizeFilter,
  });

  const data       = useSizeFilter ? searchData    : productsData;
  const isLoading  = useSizeFilter ? searchLoading : prodLoading;
  const isFetching = useSizeFilter ? searchFetching : prodFetching;


  useEffect(() => {
    setCursor(null);
    setAll([]);
    setFetchMore(false);
  }, [shopifyQuery, urlSort, urlSizes.join(',')]);

  useEffect(() => {
    if (!data?.edges) return;
    const nodes = data.edges.map((e) => e.node).filter(Boolean);
    setAll((prev) => {
      if (!cursor) return nodes;
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...nodes.filter((n) => !ids.has(n.id))];
    });
    setFetchMore(false);
  }, [data]);

  useEffect(() => {
    if (!data?.pageInfo?.hasNextPage || !data?.pageInfo?.endCursor) return;
    if (useSizeFilter) {
      prefetchSearchProducts(queryClient, {
        query: sizeSearchParams?.query, first: PAGE_SIZE, sortKey: searchSortKey,
        reverse: sortConfig.reverse, after: data.pageInfo.endCursor,
        productFilters: sizeSearchParams?.productFilters,
      });
    } else {
      prefetchProducts(queryClient, {
        first: PAGE_SIZE, sortKey: sortConfig.sortKey, reverse: sortConfig.reverse,
        after: data.pageInfo.endCursor, query: shopifyQuery,
      });
    }
  }, [data?.pageInfo?.endCursor]);

  const handleLoadMore = useCallback(() => {
    if (!data?.pageInfo?.hasNextPage) return;
    setFetchMore(true);
    setCursor(data.pageInfo.endCursor);
  }, [data]);

  const handleApply = () => {
    const params = {};
    if (pendingCategories.length) params.categories = pendingCategories.join(',');
    if (pendingSizes.length) params.sizes = pendingSizes.join(',');
    if (urlSort !== 'newest') params.sort = urlSort;
    if (urlQuery) params.q = urlQuery;
    setSearchParams(params, { replace: true });
    trackEvent(EVENTS.FILTER_APPLY, { categories: pendingCategories.join(','), sizes: pendingSizes.join(',') });
  };

  const handleSort = (val) => {
    setSearchParams(
      (p) => { const next = new URLSearchParams(p); next.set('sort', val); return next; },
      { replace: true }
    );
    trackEvent(EVENTS.SORT_CHANGE, { sort_value: val });
  };

  const displayProducts = allProducts;
  const activeFilterCount = urlCategories.length + urlSizes.length;
  const totalShown  = displayProducts.length;
  const hasNextPage = data?.pageInfo?.hasNextPage ?? false;

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-16">
      {/* Page header */}
      <div className="mb-8 border-b border-hairline pb-6">
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-primary md:text-5xl">
          {urlQuery ? `"${urlQuery}"` : 'Shop'}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wider text-secondary">
          {isLoading
            ? 'Loading...'
            : totalShown > 0
            ? `Showing ${totalShown} technical garment${totalShown !== 1 ? 's' : ''}${hasNextPage ? '+' : ''}.`
            : 'No garments found.'}
        </p>
      </div>

      {/* Mobile toolbar */}
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

      {/* Desktop sort bar */}
      <div className="mb-6 hidden justify-end md:flex">
        <SortDropdown value={urlSort} onChange={handleSort} />
      </div>

      {/* Layout */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="hidden md:block">
          <FilterRail
            categories={pendingCategories}
            sizes={pendingSizes}
            onCategoriesChange={setPendingCategories}
            onSizesChange={setPendingSizes}
            onApply={handleApply}
          />
        </div>

        <ProductGrid
          products={displayProducts}
          isLoading={isLoading && !isFetchingMore}
          isFetchingMore={isFetchingMore || (isFetching && !!cursor)}
          hasNextPage={hasNextPage}
          onLoadMore={handleLoadMore}
        />
      </div>

      {/* Mobile filter sheet backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setFilterSheetOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
          filterSheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      {/* Mobile filter sheet */}
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
          categories={pendingCategories}
          sizes={pendingSizes}
          onCategoriesChange={setPendingCategories}
          onSizesChange={setPendingSizes}
          onApply={handleApply}
          onClose={() => setFilterSheetOpen(false)}
        />
      </div>
    </div>
  );
}
