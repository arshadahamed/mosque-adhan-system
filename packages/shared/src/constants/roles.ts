export const ROLES = ["SUPER_ADMIN", "MOSQUE_ADMIN", "STAFF", "PUBLIC"] as const;
export type Role = (typeof ROLES)[number];

export const MOSQUE_ROLES = ["MOSQUE_ADMIN", "STAFF"] as const;
export type MosqueRole = (typeof MOSQUE_ROLES)[number];
