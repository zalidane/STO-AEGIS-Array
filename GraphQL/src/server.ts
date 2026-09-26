import { createServer } from "node:http";
import { createYoga, createSchema } from "graphql-yoga";
import { createPrismaClient } from "@sto-aegis/database";
import { loadTypeDefs } from "./schema/index.js";
import { createResolvers } from "./resolvers/index.js";
import { logger } from "./logic/logger.js";
import {
  createOperationNamePlugin,
  withRequestLogging,
} from "./logic/requestLogging.js";

const { prisma } = createPrismaClient();

const schema = createSchema({
  typeDefs: loadTypeDefs(),
  resolvers: createResolvers(prisma),
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
  plugins: [createOperationNamePlugin()],
});

const server = createServer(
  withRequestLogging((req, res) => {
    void yoga(req, res);
  }),
);
const port = Number(process.env.PORT ?? 4000);

server.listen(port, "0.0.0.0", () => {
  logger.info({
    msg: "server_listen",
    host: "0.0.0.0",
    port,
    path: "/graphql",
  });
});
