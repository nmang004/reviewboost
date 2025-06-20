// Re-export the browser client for backward compatibility
// This file is deprecated - use supabase-browser.ts or supabase-server.ts instead
import { createSupabaseBrowser } from './supabase-browser'

export const supabase = createSupabaseBrowser()