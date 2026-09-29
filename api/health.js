// Reports only whether config is present (never values).
export default function handler(req, res) {
  const url = new URL(req.url, 'https://x');
  const expected = (process.env.ADMIN_TOKEN || '').replace(/[`'"\s]/g, '');
  const t = url.searchParams.get('t');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    adminToken: Boolean(process.env.ADMIN_TOKEN),
    adminTokenLength: (process.env.ADMIN_TOKEN || '').length,
    tokenMatches: t == null ? null : t.trim() === expected,
    airroiKey: Boolean(process.env.AIRROI_API_KEY),
    resendKey: Boolean(process.env.RESEND_API_KEY),
    supabaseSecret: Boolean(process.env.SUPABASE_SECRET_KEY),
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
  });
}
