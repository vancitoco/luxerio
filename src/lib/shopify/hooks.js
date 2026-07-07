import { useQuery } from '@tanstack/react-query';
import { storefrontQuery } from './client.js';
import {
  PRODUCTS_QUERY,
  SEARCH_PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  FEATURED_PRODUCTS_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from './queries.js';

export function useProducts({ first = 24, sortKey = 'CREATED_AT', reverse = true, after, query, enabled = true } = {}) {
  return useQuery({
    queryKey: ['products', first, sortKey, reverse, after, query],
    queryFn: () => storefrontQuery(PRODUCTS_QUERY, { first, sortKey, reverse, after, query }),
    select: (d) => d.products,
    enabled,
  });
}

export function prefetchProducts(queryClient, { first, sortKey, reverse, after, query }) {
  return queryClient.prefetchQuery({
    queryKey: ['products', first, sortKey, reverse, after, query],
    queryFn: () => storefrontQuery(PRODUCTS_QUERY, { first, sortKey, reverse, after, query }),
  });
}

export function useSearchProducts({ query, first = 24, sortKey = 'PUBLISHED_AT', reverse = true, after, productFilters, enabled = true } = {}) {
  const filtersKey = productFilters?.length ? JSON.stringify(productFilters) : null;
  return useQuery({
    queryKey: ['search-products', query, first, sortKey, reverse, after, filtersKey],
    queryFn: () => storefrontQuery(SEARCH_PRODUCTS_QUERY, {
      query, first, sortKey, reverse, after,
      productFilters: productFilters?.length ? productFilters : undefined,
    }),
    select: (d) => d.search,
    enabled: enabled && !!query,
  });
}

export function prefetchSearchProducts(queryClient, { query, first, sortKey, reverse, after, productFilters }) {
  const filtersKey = productFilters?.length ? JSON.stringify(productFilters) : null;
  return queryClient.prefetchQuery({
    queryKey: ['search-products', query, first, sortKey, reverse, after, filtersKey],
    queryFn: () => storefrontQuery(SEARCH_PRODUCTS_QUERY, {
      query, first, sortKey, reverse, after,
      productFilters: productFilters?.length ? productFilters : undefined,
    }),
  });
}

export function useFeaturedProducts({ first = 4 } = {}) {
  return useQuery({
    queryKey: ['featured-products', first],
    queryFn: () => storefrontQuery(FEATURED_PRODUCTS_QUERY, { first }),
    select: (d) => d.products?.edges?.map((e) => e.node) ?? [],
  });
}

export function useProduct(handle) {
  return useQuery({
    queryKey: ['product', handle],
    queryFn: () => storefrontQuery(PRODUCT_BY_HANDLE_QUERY, { handle }),
    enabled: !!handle,
    select: (d) => d.product,
  });
}

export function useProductRecommendations(productId) {
  return useQuery({
    queryKey: ['recommendations', productId],
    queryFn: () => storefrontQuery(PRODUCT_RECOMMENDATIONS_QUERY, { productId }),
    enabled: !!productId,
    select: (d) => d.productRecommendations?.slice(0, 3) ?? [],
  });
}
