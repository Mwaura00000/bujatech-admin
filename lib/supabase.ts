import { createClient } from '@supabase/supabase-js';

// We explicitly tell it to look for the exact keys you pasted into Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Create and export the secure bridge
export const supabase = createClient(supabaseUrl, supabaseAnonKey);