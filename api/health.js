// Reports only whether config is present (never values).
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, adminToken: Boolean(process.env.ADMIN_TOKEN), airroiKey: Boolean(process.env.AIRROI_API_KEY), resendKey: Boolean(process.env.RESEND_API_KEY), supabaseSecret: Boolean(process.env.SUPABASE_SECRET_KEY) });
}
