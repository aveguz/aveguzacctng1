export const SUPABASE_URL = 'https://lyjnwghfjdmexutmeubh.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Ta0SUeVOxcAmsShzyl9_Cg_ytyjskMU';

export function supabaseHeaders(accessToken) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json'
  };
}