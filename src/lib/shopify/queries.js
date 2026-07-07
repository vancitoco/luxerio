const PRODUCT_FIELDS = /* GraphQL */ `
  id handle title tags productType
  featuredImage { url altText }
  images(first: 2) { edges { node { url altText } } }
  priceRange { minVariantPrice { amount currencyCode } }
  variants(first: 50) {
    edges { node { id availableForSale selectedOptions { name value } } }
  }
`;

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
      edges { node { ${PRODUCT_FIELDS} } }
    }
  }
`;

export const SEARCH_PRODUCTS_QUERY = /* GraphQL */ `
  query SearchProducts(
    $query: String!
    $first: Int = 24
    $sortKey: SearchSortKeys
    $reverse: Boolean
    $after: String
    $productFilters: [ProductFilter!]
  ) {
    search(
      query: $query
      first: $first
      sortKey: $sortKey
      reverse: $reverse
      after: $after
      productFilters: $productFilters
      types: [PRODUCT]
    ) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          ... on Product { ${PRODUCT_FIELDS} }
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
          images(first: 2) { edges { node { url altText } } }
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
      images(first: 2) { edges { node { url altText } } }
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
