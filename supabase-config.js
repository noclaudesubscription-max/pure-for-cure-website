/* ════════════════════════════════════════════
   SUPABASE CONFIG
   Shared across donate.html, dashboard.html and
   index.html. Loaded after the Supabase JS CDN
   script, before any page-specific script.
═══════════════════════════════════════════════ */
const SUPABASE_URL = 'https://icadpdzapgkxqbvqldzy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ixhOWTq03Zm4gP6eChBhDg_0RYsmO7_';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
