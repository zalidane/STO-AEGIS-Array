import { GraphQLError } from "graphql";
import type { Prisma, PrismaClient } from "@sto-aegis/database";
import {
  contentHashFromPayload,
  fillCount,
  fillsFromPayload,
  isEligibleForPublic,
  isPublicListRateLimited,
  MIN_PUBLIC_FILLS,
  parseSharePayload,
  pickFeaturedBuildId,
  SHARE_VISIBILITY,
  utcDateString,
  wasFeaturedRecently,
  type SharePayload,
  type ShareVisibility,
} from "../logic/sharePayload.js";
import {
  generateEditToken,
  generatePublicCode,
  hashClientIp,
  hashEditToken,
  verifyEditToken,
} from "../logic/shareTokens.js";

export type GraphQLContext = {
  request?: Request;
};

function clientIpFromContext(context: GraphQLContext | undefined): string | null {
  const request = context?.request;
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

type BuildRow = {
  publicCode: string;
  title: string;
  shipName: string;
  payload: Prisma.JsonValue;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
};

function fail(message: string, code: string): never {
  throw new GraphQLError(message, { extensions: { code } });
}

function requirePayload(raw: unknown): SharePayload {
  const parsed = parseSharePayload(raw);
  if (parsed.ok) return parsed.payload;
  fail("Share payload is not a versioned name-keyed snapshot.", "BAD_PAYLOAD");
}

async function lookupShipId(
  prisma: PrismaClient,
  shipName: string,
): Promise<number | null> {
  const ship = await prisma.ship.findUnique({
    where: { name: shipName },
    select: { id: true },
  });
  return ship?.id ?? null;
}

async function mintPublicCode(prisma: PrismaClient): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const publicCode = generatePublicCode();
    const clash = await prisma.build.findUnique({
      where: { publicCode },
      select: { id: true },
    });
    if (!clash) return publicCode;
  }
  fail("Could not allocate a share code.", "CODE_COLLISION");
}

async function replacePublicFills(
  prisma: PrismaClient,
  buildId: string,
  payload: SharePayload,
  contentHash: string,
  visibility: ShareVisibility,
): Promise<void> {
  await prisma.buildFill.deleteMany({ where: { buildId } });
  if (visibility !== SHARE_VISIBILITY.public) return;
  const fills = fillsFromPayload(payload, contentHash);
  if (fills.length === 0) return;
  await prisma.buildFill.createMany({
    data: fills.map((fill) => ({
      buildId,
      contentHash: fill.contentHash,
      catalogKind: fill.catalogKind,
      name: fill.name,
      type: fill.type,
      shipName: fill.shipName,
    })),
  });
}

async function recentPublicListings(
  prisma: PrismaClient,
  ipHash: string | null,
  at: Date,
): Promise<Date[]> {
  if (!ipHash) return [];
  const windowStart = new Date(at.getTime() - 24 * 60 * 60 * 1000);
  const rows = await prisma.build.findMany({
    where: {
      listIpHash: ipHash,
      listedAt: { gte: windowStart },
    },
    select: { listedAt: true },
  });
  return rows
    .map((row) => row.listedAt)
    .filter((stamp): stamp is Date => stamp != null);
}

async function resolveVisibility(input: {
  prisma: PrismaClient;
  payload: SharePayload;
  wantPublic: boolean;
  clientIp: string | null;
  at?: Date;
  alreadyPublic?: boolean;
}): Promise<{ visibility: ShareVisibility; listingError: string | null; ipHash: string | null }> {
  if (!input.wantPublic) {
    return { visibility: SHARE_VISIBILITY.unlisted, listingError: null, ipHash: null };
  }
  if (!isEligibleForPublic(input.payload)) {
    return {
      visibility: SHARE_VISIBILITY.unlisted,
      listingError: `Public listing needs at least ${MIN_PUBLIC_FILLS} seated items.`,
      ipHash: null,
    };
  }
  if (input.alreadyPublic) {
    return {
      visibility: SHARE_VISIBILITY.public,
      listingError: null,
      ipHash: hashClientIp(input.clientIp),
    };
  }
  const at = input.at ?? new Date();
  const ipHash = hashClientIp(input.clientIp);
  const listed = await recentPublicListings(input.prisma, ipHash, at);
  if (ipHash && isPublicListRateLimited(listed, at)) {
    return {
      visibility: SHARE_VISIBILITY.unlisted,
      listingError: "Public listing is rate-limited. The unlisted link still works.",
      ipHash,
    };
  }
  return { visibility: SHARE_VISIBILITY.public, listingError: null, ipHash };
}

function asSharedBuild(row: BuildRow) {
  const parsed = parseSharePayload(row.payload);
  return {
    ...row,
    fillCount: parsed.ok ? fillCount(parsed.payload) : 0,
  };
}

async function loadBuild(prisma: PrismaClient, publicCode: string) {
  const row = await prisma.build.findUnique({ where: { publicCode } });
  if (!row) fail("No build uses that code.", "NOT_FOUND");
  return row;
}

async function requireOwner(
  prisma: PrismaClient,
  publicCode: string,
  editToken: string,
) {
  const row = await loadBuild(prisma, publicCode);
  if (!verifyEditToken(editToken, row.editTokenHash)) {
    fail("That edit token does not match this build.", "FORBIDDEN");
  }
  return row;
}

function utcMidnight(at: Date): Date {
  return new Date(`${utcDateString(at)}T00:00:00.000Z`);
}

async function ensureBuildOfTheDay(prisma: PrismaClient, at = new Date()) {
  const date = utcMidnight(at);
  const cached = await prisma.buildFeatured.findUnique({
    where: { date },
    include: { build: true },
  });
  if (cached?.build.visibility === SHARE_VISIBILITY.public) {
    return cached.build;
  }

  const publicRows = await prisma.build.findMany({
    where: { visibility: SHARE_VISIBILITY.public },
    select: { id: true, payload: true },
  });
  const eligible = publicRows.filter((row) => {
    const parsed = parseSharePayload(row.payload);
    return parsed.ok && isEligibleForPublic(parsed.payload);
  });
  if (eligible.length === 0) return null;

  const featured = await prisma.buildFeatured.findMany({
    where: { date: { lt: date } },
    select: { buildId: true, date: true },
  });
  const featuredById = new Map<string, string[]>();
  for (const row of featured) {
    const iso = utcDateString(row.date);
    const list = featuredById.get(row.buildId) ?? [];
    list.push(iso);
    featuredById.set(row.buildId, list);
  }
  const fresh = eligible.filter(
    (row) => !wasFeaturedRecently(featuredById.get(row.id) ?? [], at),
  );
  const pool = (fresh.length > 0 ? fresh : eligible).map((row) => row.id);
  const pickId = pickFeaturedBuildId(pool, at);
  if (!pickId) return null;

  try {
    await prisma.buildFeatured.create({
      data: { date, buildId: pickId },
    });
  } catch {
    const raced = await prisma.buildFeatured.findUnique({
      where: { date },
      include: { build: true },
    });
    return raced?.build ?? null;
  }
  return prisma.build.findUnique({ where: { id: pickId } });
}

export async function countPublicUsage(
  prisma: PrismaClient,
  filter: {
    catalogKind?: string;
    name: string;
    type?: string | null;
    shipName?: string;
  },
): Promise<number> {
  const where: Prisma.BuildFillWhereInput = {
    build: { visibility: SHARE_VISIBILITY.public },
  };
  if (filter.shipName) {
    where.shipName = filter.shipName;
  } else if (filter.catalogKind) {
    where.catalogKind = filter.catalogKind;
    where.name = filter.name;
    if (filter.type != null && filter.type.length > 0) {
      where.type = filter.type;
    }
  }
  const rows = await prisma.buildFill.findMany({
    where,
    distinct: ["contentHash"],
    select: { contentHash: true },
  });
  return rows.length;
}

export function createBuildResolver(prisma: PrismaClient) {
  return {
    Query: {
      sharedBuild: async (_parent: unknown, args: { code: string }) => {
        const row = await prisma.build.findUnique({
          where: { publicCode: args.code.trim() },
        });
        return row ? asSharedBuild(row) : null;
      },
      buildOfTheDay: async () => {
        const row = await ensureBuildOfTheDay(prisma);
        return row ? asSharedBuild(row) : null;
      },
      catalogUsage: (
        _parent: unknown,
        args: { catalogKind: string; name: string; type?: string | null },
      ) => {
        if (args.catalogKind === "ship") {
          return countPublicUsage(prisma, { name: args.name, shipName: args.name });
        }
        return countPublicUsage(prisma, {
          catalogKind: args.catalogKind,
          name: args.name,
          type: args.type ?? null,
        });
      },
    },
    Mutation: {
      publishBuild: async (
        _parent: unknown,
        args: { payload: unknown; listPublic?: boolean | null },
        context: GraphQLContext | undefined,
      ) => {
        const payload = requirePayload(args.payload);
        const decision = await resolveVisibility({
          prisma,
          payload,
          wantPublic: args.listPublic === true,
          clientIp: clientIpFromContext(context),
        });
        const contentHash = contentHashFromPayload(payload);
        const publicCode = await mintPublicCode(prisma);
        const editToken = generateEditToken();
        const shipId = await lookupShipId(prisma, payload.shipName);
        const listedAt =
          decision.visibility === SHARE_VISIBILITY.public ? new Date() : null;

        const row = await prisma.build.create({
          data: {
            publicCode,
            editTokenHash: hashEditToken(editToken),
            title: payload.title,
            shipName: payload.shipName,
            shipId,
            payload: payload as unknown as Prisma.InputJsonValue,
            schemaVersion: payload.v,
            contentHash,
            visibility: decision.visibility,
            listedAt,
            listIpHash: decision.visibility === SHARE_VISIBILITY.public
              ? decision.ipHash
              : null,
          },
        });
        await replacePublicFills(
          prisma,
          row.id,
          payload,
          contentHash,
          decision.visibility,
        );
        return {
          build: asSharedBuild(row),
          editToken,
          listingError: decision.listingError,
        };
      },
      updateBuild: async (
        _parent: unknown,
        args: {
          publicCode: string;
          editToken: string;
          payload?: unknown | null;
          listPublic?: boolean | null;
        },
        context: GraphQLContext | undefined,
      ) => {
        const existing = await requireOwner(
          prisma,
          args.publicCode.trim(),
          args.editToken,
        );
        const payload = args.payload == null
          ? requirePayload(existing.payload)
          : requirePayload(args.payload);
        const wantPublic =
          args.listPublic == null
            ? existing.visibility === SHARE_VISIBILITY.public
            : args.listPublic === true;
        const alreadyPublic = existing.visibility === SHARE_VISIBILITY.public;
        const decision = await resolveVisibility({
          prisma,
          payload,
          wantPublic,
          clientIp: clientIpFromContext(context),
          alreadyPublic: alreadyPublic && wantPublic,
        });
        const visibility = decision.visibility;
        const listingError = decision.listingError;
        const contentHash = contentHashFromPayload(payload);
        const shipId = await lookupShipId(prisma, payload.shipName);
        const stayPublic = visibility === SHARE_VISIBILITY.public;
        const listedAt = stayPublic
          ? existing.listedAt ?? new Date()
          : null;

        const row = await prisma.build.update({
          where: { id: existing.id },
          data: {
            title: payload.title,
            shipName: payload.shipName,
            shipId,
            payload: payload as unknown as Prisma.InputJsonValue,
            schemaVersion: payload.v,
            contentHash,
            visibility,
            listedAt,
            listIpHash: stayPublic
              ? existing.listIpHash ?? decision.ipHash
              : null,
          },
        });
        await replacePublicFills(prisma, row.id, payload, contentHash, visibility);
        return {
          build: asSharedBuild(row),
          editToken: args.editToken,
          listingError,
        };
      },
      unlistBuild: async (
        _parent: unknown,
        args: { publicCode: string; editToken: string },
      ) => {
        const existing = await requireOwner(
          prisma,
          args.publicCode.trim(),
          args.editToken,
        );
        const row = await prisma.build.update({
          where: { id: existing.id },
          data: {
            visibility: SHARE_VISIBILITY.unlisted,
            listedAt: null,
            listIpHash: null,
          },
        });
        await prisma.buildFill.deleteMany({ where: { buildId: row.id } });
        return asSharedBuild(row);
      },
    },
    SharedBuild: {
      ship: (parent: { shipName: string }) =>
        prisma.ship.findUnique({ where: { name: parent.shipName } }),
    },
  };
}
