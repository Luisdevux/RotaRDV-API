// src/utils/validators/schemas/zod/GoogleLoginSchema.js

import { z } from 'zod';

const GoogleLoginSchema = z.object({
    idToken: z
        .string()
        .nonempty('O idToken do Google é obrigatório.')
});

export { GoogleLoginSchema };
