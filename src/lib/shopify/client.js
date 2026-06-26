import { GraphQLClient } from 'graphql-request';

/*
  Shopify Storefront API client — single source of truth for products,
  variants, inventory, cart and checkout. No separate product DB.
*/
const DOMAIN = import.meta.env.VITE_SHOPIFY_DOMAIN;
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || '2024-10';

export const storefront = new GraphQLClient(
  `https://${DOMAIN}/api/${API_VERSION}/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': TOKEN,
      'Content-Type': 'application/json',
    },
  },
);

// Thin wrapper so callers get a consistent error surface.
export async function storefrontQuery(document, variables) {
  return storefront.request(document, variables);
}
