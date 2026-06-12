/**
 * Maps common Postgres errors to actionable migration hints.
 * Keeps finance GL flows readable when the DB lags the Prisma schema.
 *
 * @param {unknown} error
 * @returns {string}
 */
export function userFacingPostgresError(error) {
    const err = /** @type {{ code?: string; message?: string }} */ (error);
    const msg = typeof err?.message === 'string' ? err.message : String(error);

    if (err?.code === '42703') {
        if (msg.includes('sub_type')) {
            return `${msg} — Apply pending migrations so gl_accounts matches the app (npm run db:migrate). See docs/DATABASE_MIGRATIONS.md (gl_accounts.sub_type / updated_at).`;
        }
        if (msg.includes('updated_at') && msg.toLowerCase().includes('gl_accounts')) {
            return `${msg} — Apply pending migrations (npm run db:migrate). See docs/DATABASE_MIGRATIONS.md.`;
        }
    }

    return msg;
}
