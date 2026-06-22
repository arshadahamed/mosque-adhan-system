import { z } from "zod";

const clampLimit = (n: number) => Math.min(Math.max(Math.trunc(n), 1), 100);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().default(20).transform(clampLimit),
  sort: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
