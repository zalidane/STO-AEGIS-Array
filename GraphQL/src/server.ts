import { createServer } from "node:http";
import { createYoga, createSchema } from "graphql-yoga";
import { createPrismaClient } from "@sto-aegis/database";
import { loadTypeDefs } from "./schema/index.js";
import { createResolvers } from "./resolvers/index.js";

const { prisma } = createPrismaClient();

const schema = createSchema({
  typeDefs: loadTypeDefs(),
  resolvers: createResolvers(prisma),
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
});

const server = createServer(yoga);
const port = Number(process.env.PORT ?? 4000);

server.listen(port, "0.0.0.0", () => {
  console.log(`GraphQL is running on http://0.0.0.0:${port}/graphql`);
});
