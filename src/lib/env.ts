import { z } from 'zod';

const envSchema = z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    ADMIN_EMAIL: z.string().email().optional(),
    FROM_EMAIL: z.string().email().optional(),
    ADMIN_USERNAME: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let _cachedEnv: Env | null = null;

function validateEnv(): Env {
    if (_cachedEnv) return _cachedEnv;

    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        throw new Error(
            `Ongeldige omgevingsvariabelen:\n${JSON.stringify(result.error.format(), null, 2)}`
        );
    }

    _cachedEnv = result.data;
    return _cachedEnv;
}

export const env = new Proxy({} as Env, {
    get(_, prop: string) {
        const validated = validateEnv();
        return validated[prop as keyof Env];
    }
});
