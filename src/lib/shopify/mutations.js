// Shared fragment — declared first to avoid temporal dead zone.
const CART_LINES_FRAGMENT = /* GraphQL */ `
  fragment CartLines on BaseCartLineConnection {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            product { title featuredImage { url altText } }
          }
        }
      }
    }
  }
`;

export const CART_CREATE = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id checkoutUrl
        lines(first: 50) { ...CartLines }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
  ${CART_LINES_FRAGMENT}
`;

export const CART_LINES_ADD = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id checkoutUrl
        lines(first: 50) { ...CartLines }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
  ${CART_LINES_FRAGMENT}
`;

export const CART_LINES_UPDATE = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id checkoutUrl
        lines(first: 50) { ...CartLines }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
  ${CART_LINES_FRAGMENT}
`;

export const CART_LINES_REMOVE = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id checkoutUrl
        lines(first: 50) { ...CartLines }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
  ${CART_LINES_FRAGMENT}
`;

export const CART_DISCOUNT_CODES_UPDATE = /* GraphQL */ `
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        id checkoutUrl
        lines(first: 50) { ...CartLines }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
        discountCodes { code applicable }
      }
      userErrors { field message }
    }
  }
  ${CART_LINES_FRAGMENT}
`;
