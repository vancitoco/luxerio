export const PRODUCTS_QUERY = /* GraphQL */ `
  query Products(
    $first: Int = 24
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $after: String
    $query: String
  ) {
    products(
      first: $first
      sortKey: $sortKey
      reverse: $reverse
      after: $after
      query: $query
    ) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          handle
          title
          tags
          productType
          featuredImage { url altText }
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 1) {
            edges { node { id availableForSale } }
          }
        }
      }
    }
  }
`;

export const FEATURED_PRODUCTS_QUERY = /* GraphQL */ `
  query FeaturedProducts($first: Int = 4) {
    products(first: $first, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          handle
          title
          description
          tags
          featuredImage { url altText }
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 1) {
            edges { node { id availableForSale } }
          }
        }
      }
    }
  }
`;

export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  query Recommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id
      handle
      title
      featuredImage { url altText }
      priceRange { minVariantPrice { amount currencyCode } }
      tags
    }
  }
`;

export const PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      images(first: 8) { edges { node { url altText } } }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            quantityAvailable
            price { amount currencyCode }
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;
