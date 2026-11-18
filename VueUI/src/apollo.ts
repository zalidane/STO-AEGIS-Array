import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";
import { correlationAwareFetch } from "./logic/ops/correlationId";

const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:4000/graphql";

/**
 * Catalog lists (`ships`, traits, items, …) use a single unparameterized
 * query. Apollo's default `cache-first` would keep serving a list loaded
 * before a production Cargo import, while the home search field hits the
 * parameterized `search` query and sees the new rows immediately.
 * `cache-and-network` shows the cached list, then refreshes it.
 */
export const CATALOG_WATCH_FETCH_POLICY = "cache-and-network" as const;

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphqlUrl, fetch: correlationAwareFetch }),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: CATALOG_WATCH_FETCH_POLICY,
    },
  },
});
