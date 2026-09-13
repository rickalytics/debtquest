import { createClient } from 'npm:@supabase/supabase-js@2.100.0';

// Authenticate inside the function so current asymmetric JWT projects work too.
// Only the verified token owner can be deleted; never accept a user ID from input.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, { error: 'Sign in required' });
    const url = Deno.env.get('SUPABASE_URL')!;
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
    const { data: { user }, error: userError } = await auth.auth.getUser(token);
    if (userError || !user?.email) return reply(401, { error: 'Sign in required' });
    const { password } = await req.json();
    if (typeof password !== 'string' || !password || password.length > 1024) return reply(400, { error: 'Password required' });
    const { data: verification, error: passwordError } = await auth.auth.signInWithPassword({ email: user.email, password });
    if (passwordError || verification.user?.id !== user.id) return reply(401, { error: 'Password verification failed' });
    // Revoke the short-lived verification session before deleting the user.
    await auth.auth.signOut({ scope: 'local' });
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    // debtquest_data.user_id uses ON DELETE CASCADE in schema.sql.
    if (error) return reply(500, { error: 'Account deletion failed. Please try again.' });
    return reply(200, { deleted: true });
  } catch {
    return reply(400, { error: 'Unable to process account deletion' });
  }
});
