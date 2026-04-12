import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export const uuidSchema = z.string().uuid();

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
