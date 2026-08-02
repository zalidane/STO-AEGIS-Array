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

const yoga = createYoga({ schema });
const server = createServer(yoga);

server.listen(4000, () => {
  console.log("GraphQL is running on http://localhost:4000/graphql");
});
