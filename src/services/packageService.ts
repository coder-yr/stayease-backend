import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

type PackageJsonInput = Prisma.InputJsonValue | undefined;

export type TourPackageInput = {
  name: string;
  destination: string;
  description?: string;
  price: number;
  inclusions?: unknown;
  images?: unknown;
};

const toJsonInput = (value: unknown): PackageJsonInput => {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
};

export const packageService = {
  async list() {
    return prisma.tourPackage.findMany({
      orderBy: [{ price: "asc" }, { createdAt: "desc" }]
    });
  },

  async getById(id: string) {
    return prisma.tourPackage.findUnique({ where: { id } });
  },

  async create(data: TourPackageInput) {
    return prisma.tourPackage.create({
      data: {
        name: data.name,
        destination: data.destination,
        description: (data.description ?? null) as any,
        price: Number(data.price),
        inclusions: toJsonInput(data.inclusions),
        images: toJsonInput(data.images)
      }
    });
  },

  async update(id: string, data: Partial<TourPackageInput>) {
    const existing = await prisma.tourPackage.findUnique({ where: { id } });
    if (!existing) return null;

    return prisma.tourPackage.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: data.name } : {}),
        ...(data.destination != null ? { destination: data.destination } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.price != null ? { price: Number(data.price) } : {}),
        ...(data.inclusions !== undefined ? { inclusions: toJsonInput(data.inclusions) } : {}),
        ...(data.images !== undefined ? { images: toJsonInput(data.images) } : {})
      }
    });
  },

  async delete(id: string) {
    const existing = await prisma.tourPackage.findUnique({ where: { id } });
    if (!existing) return false;

    await prisma.tourPackage.delete({ where: { id } });
    return true;
  }
};