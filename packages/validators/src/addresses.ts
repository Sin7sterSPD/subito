import { z } from "zod";

export const addressTypeSchema = z.enum(["HOME", "OFFICE", "OTHER"]);

export const createAddressSchema = z.object({
  name: z.string().max(100).optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  landmark: z.string().optional(),
  area: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  type: addressTypeSchema.default("HOME"),
  bhk: z.number().optional(),
  bathroom: z.number().optional(),
  balcony: z.number().optional(),
  floor: z.number().optional(),
  buildingName: z.string().optional(),
  houseNo: z.string().optional(),
  otherName: z.string().optional(),
  otherPhone: z.string().optional(),
});

export const updateAddressSchema = createAddressSchema.partial().extend({
  id: z.string().uuid(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
