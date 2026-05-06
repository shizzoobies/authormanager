import { z } from "zod";

export const penNameSchema = z.enum(["alexi-hart", "alexandra-knight"]);
export type PenName = z.infer<typeof penNameSchema>;

export const contentFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  penName: penNameSchema,
  publishedAt: z.string().datetime().optional(),
  membersOnly: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  excerpt: z.string().optional()
});

export type ContentFrontmatter = z.infer<typeof contentFrontmatterSchema>;

export const releaseSchema = z.object({
  title: z.string(),
  slug: z.string(),
  penName: penNameSchema,
  releaseDate: z.string(),
  blurb: z.string().optional(),
  buyLinks: z.record(z.string(), z.string().url()).default({})
});

export type Release = z.infer<typeof releaseSchema>;
