import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type SupabaseHealthResult =
  | { ok: true; latencyMs: number }
  | { ok: false; message: string };

export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message:
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variable.',
    };
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);
  const startedAt = performance.now();

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`,
      {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        message: `Supabase health check returned HTTP ${response.status}.`,
      };
    }

    return {
      ok: true,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, message: 'Supabase health check timed out after 12s.' };
    }
    const detail = err instanceof Error ? err.message : 'Network request failed.';
    return { ok: false, message: detail };
  } finally {
    window.clearTimeout(timeoutId);
  }
}
