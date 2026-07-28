// src/utils/validators/schemas/zod/SyncSchema.js

import { z } from "zod";

const ViagemSyncSchema = z.object({
    _id: z.string().uuid(),
    is_deleted: z.boolean().optional().default(false),
}).passthrough();

const DespesaSyncSchema = z.object({
    _id: z.string().uuid(),
    viagem_id: z.string().uuid().optional(),
    is_deleted: z.boolean().optional().default(false),
}).passthrough();

export const SyncPayloadSchema = z.object({
    viagens: z.array(ViagemSyncSchema).optional().default([]),
    despesas: z.array(DespesaSyncSchema).optional().default([])
});
