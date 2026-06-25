import { prisma } from "../../config/db.js";
import type { Prisma } from "@prisma/client";

export const MOSQUE_PUBLIC_SELECT = {
  id: true, slug: true, name: true, type: true,
  address: true, city: true, zipcode: true, countryCode: true,
  latitude: true, longitude: true, timezone: true,
  phone: true, email: true, website: true, logoUrl: true,
  showOnMap: true, status: true, facilities: true,
  capacityMen: true, capacityWomen: true, associationName: true,
  createdAt: true, updatedAt: true,
  config: true,
} as const;

export async function listMosques(opts: {
  page: number;
  limit: number;
  search?: string;
  city?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  radius?: number; // km
}) {
  const { page, limit, search, city, countryCode } = opts;
  const where: Prisma.MosqueWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }
  if (city) where.city = { equals: city, mode: "insensitive" };
  if (countryCode) where.countryCode = countryCode.toUpperCase();

  const [items, total] = await prisma.$transaction([
    prisma.mosque.findMany({
      where,
      select: MOSQUE_PUBLIC_SELECT,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.mosque.count({ where }),
  ]);

  return { items, total };
}

export const findMosqueBySlug = (slug: string) =>
  prisma.mosque.findUnique({ where: { slug }, include: { config: true, subscription: true } });

export const findMosqueById = (id: string) =>
  prisma.mosque.findUnique({ where: { id }, include: { config: true, subscription: true } });

export const createMosque = (data: Prisma.MosqueCreateInput) =>
  prisma.mosque.create({ data, include: { config: true } });

export const updateMosque = (id: string, data: Prisma.MosqueUpdateInput) =>
  prisma.mosque.update({ where: { id }, data, include: { config: true } });

export const deleteMosque = (id: string) =>
  prisma.mosque.delete({ where: { id } });

export const getMosqueConfig = (mosqueId: string) =>
  prisma.mosqueConfig.findUnique({ where: { mosqueId } });

export const upsertMosqueConfig = (mosqueId: string, data: Prisma.MosqueConfigUpdateInput) =>
  prisma.mosqueConfig.upsert({
    where: { mosqueId },
    create: { mosqueId, ...(data as any) } as Prisma.MosqueConfigUncheckedCreateInput,
    update: data,
  });

export const getMosqueUsers = (mosqueId: string) =>
  prisma.mosqueUser.findMany({
    where: { mosqueId },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
  });

export const findMosqueUser = (userId: string, mosqueId: string) =>
  prisma.mosqueUser.findUnique({ where: { userId_mosqueId: { userId, mosqueId } } });

export const upsertMosqueUser = (userId: string, mosqueId: string, role: string) =>
  prisma.mosqueUser.upsert({
    where: { userId_mosqueId: { userId, mosqueId } },
    create: { userId, mosqueId, role: role as any },
    update: { role: role as any },
  });

export const removeMosqueUser = (userId: string, mosqueId: string) =>
  prisma.mosqueUser.delete({ where: { userId_mosqueId: { userId, mosqueId } } }).catch(() => null);
