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

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.warn('⚠️ Sommige omgevingsvariabelen ontbreken of zijn ongeldig:', _env.error.format());
}

export const env = (_env.success ? _env.data : process.env) as any;
