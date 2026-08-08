import { GraphQLScalarType } from "graphql";
import { deepDecodeHtmlEntities } from "./decodeHtmlEntities.js";

type ResolverFn = (...args: unknown[]) => unknown;

function wrapResolver(resolver: ResolverFn): ResolverFn {
  return async (...args: unknown[]) => {
    const result = await resolver(...args);
    return deepDecodeHtmlEntities(result);
  };
}

/**
 * Wrap every resolver function so returned string data is HTML-entity decoded.
 * Leaves GraphQL scalar types untouched.
 */
export function wrapResolversWithHtmlDecode<T extends Record<string, unknown>>(
  resolvers: T,
): T {
  const wrapped: Record<string, unknown> = {};

  for (const [typeName, typeResolvers] of Object.entries(resolvers)) {
    if (typeResolvers instanceof GraphQLScalarType) {
      wrapped[typeName] = typeResolvers;
      continue;
    }

    if (!typeResolvers || typeof typeResolvers !== "object") {
      wrapped[typeName] = typeResolvers;
      continue;
    }

    const fields: Record<string, unknown> = {};
    for (const [fieldName, resolver] of Object.entries(
      typeResolvers as Record<string, unknown>,
    )) {
      fields[fieldName] =
        typeof resolver === "function" ? wrapResolver(resolver as ResolverFn) : resolver;
    }
    wrapped[typeName] = fields;
  }

  return wrapped as T;
}
