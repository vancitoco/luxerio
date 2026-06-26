import { useQuery } from '@tanstack/react-query';
import { storefrontQuery } from './client.js';
import {
  PRODUCTS_QUERY,
  PRODUCT_BY_HANDLE_QUERY,
  FEATURED_PRODUCTS_QUERY,
  PRODUCT_RECOMMENDATIONS_QUERY,
} from './queries.js';

export function useProducts({ first = 24, sortKey = 'CREATED_AT', reverse = true, after, query } = {}) {
  return useQuery({
    queryKey: ['products', first, sortKey, reverse, after, query],
    queryFn: () => storefrontQuery(PRODUCTS_QUERY, { first, sortKey, reverse, after, query }),
    select: (d) => d.products,
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
