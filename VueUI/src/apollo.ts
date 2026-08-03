import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: "http://localhost:4000/graphql" }),
  cache: new InMemoryCache(),
});
