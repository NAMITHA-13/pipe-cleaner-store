/* ==========================================================================
   supabase-client.js
   Connects the website to Supabase. The publishable key is safe to be public.
   NEVER put the secret or service_role key in this file.
   ========================================================================== */

const SUPABASE_URL = "https://infpxbmyjhxuwtgxsquc.supabase.co";
const SUPABASE_KEY = "sb_publishable_ZC_N__fIaiMEhTLCMi_pWQ_zO3Zhwik";

const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;