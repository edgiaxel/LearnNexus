import type { AuthUser, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  DEMO_PROFILE_DESCRIPTORS,
  type DemoProfileKey,
  type StudentProfile,
  type StudentRole,
} from '../types/contracts';
import type {
  AuthRepository,
  ProfileRow,
  RepositoryResult,
} from '../types/database';
import { createAppError, mapSupabaseError } from './errorMapper';

const DEMO_CAMPUS_PASSWORD = 'DemoCampus2026!';

function requireSupabaseClient():
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: ReturnType<typeof createAppError> } {
  if (!supabase) {
    return {
      ok: false,
      error: createAppError(
        'network',
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect.',
        true,
      ),
    };
  }
  return { ok: true, client: supabase };
}

function normalizeStudentRole(value: unknown): StudentRole {
  if (value === 'team_lead' || value === 'guest_demo' || value === 'student') {
    return value;
  }
  return 'student';
}

function parseDemoFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', 't', '1', 'yes'].includes(value.trim().toLowerCase());
  }
  return false;
}

function buildFallbackProfile(user: AuthUser): StudentProfile {
  const metadata =
    typeof user.user_metadata === 'object' && user.user_metadata !== null
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const rawDisplayName =
    typeof metadata.display_name === 'string'
      ? metadata.display_name.trim()
      : '';
  const emailHandle = user.email ? user.email.split('@')[0] : '';
  const displayName =
    rawDisplayName.length > 0
      ? rawDisplayName
      : emailHandle.length > 0
        ? emailHandle
        : 'Student';

  return {
    id: user.id,
    displayName,
    email: user.email ?? undefined,
    role: normalizeStudentRole(metadata.role),
    isDemo: parseDemoFlag(metadata.is_demo),
  };
}

async function loadProfileForUser(
  client: SupabaseClient,
  user: AuthUser,
): Promise<RepositoryResult<StudentProfile>> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, role, is_demo')
      .eq('id', user.id)
      .maybeSingle()
      .overrideTypes<Pick<ProfileRow, 'id' | 'display_name' | 'role' | 'is_demo'>, { merge: false }>();

    if (error) {
      return {
        ok: false,
        error: mapSupabaseError(
          error,
          'Signed in, but could not load your student profile.',
        ),
      };
    }

    if (!data) {
      return {
        ok: true,
        data: buildFallbackProfile(user),
      };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        displayName: data.display_name,
        email: user.email ?? undefined,
        role: normalizeStudentRole(data.role),
        isDemo: Boolean(data.is_demo),
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: mapSupabaseError(
        err,
        'Unable to load your student profile right now.',
      ),
    };
  }
}

export class SupabaseAuthRepository implements AuthRepository {
  async getCurrentProfile(): Promise<RepositoryResult<StudentProfile | null>> {
    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } = await clientCheck.client.auth.getSession();
      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Could not verify your active session.',
          ),
        };
      }

      const sessionUser = data.session?.user ?? null;
      if (!sessionUser) {
        return { ok: true, data: null };
      }

      return await loadProfileForUser(clientCheck.client, sessionUser);
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(err, 'Could not restore your active session.'),
      };
    }
  }

  async signInWithPassword(
    email: string,
    password: string,
  ): Promise<RepositoryResult<StudentProfile>> {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (trimmedEmail.length === 0 || trimmedPassword.length === 0) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Please enter both your email address and password.',
          false,
        ),
      };
    }

    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { data, error } =
        await clientCheck.client.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to sign in. Check your email and password and try again.',
          ),
        };
      }

      if (!data.user) {
        return {
          ok: false,
          error: createAppError(
            'auth',
            'Authentication completed without returning an active user session.',
            false,
          ),
        };
      }

      return await loadProfileForUser(clientCheck.client, data.user);
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to reach the authentication service. Please try again.',
        ),
      };
    }
  }

  async signInAsDemoProfile(
    demoKey: DemoProfileKey,
  ): Promise<RepositoryResult<StudentProfile>> {
    const descriptor = DEMO_PROFILE_DESCRIPTORS.find(
      (item) => item.key === demoKey,
    );

    if (!descriptor) {
      return {
        ok: false,
        error: createAppError(
          'validation',
          'Selected demonstration profile was not found.',
          false,
        ),
      };
    }

    return this.signInWithPassword(descriptor.email, DEMO_CAMPUS_PASSWORD);
  }

  async signOut(): Promise<RepositoryResult<void>> {
    const clientCheck = requireSupabaseClient();
    if (!clientCheck.ok) {
      return { ok: false, error: clientCheck.error };
    }

    try {
      const { error } = await clientCheck.client.auth.signOut();
      if (error) {
        return {
          ok: false,
          error: mapSupabaseError(
            error,
            'Unable to sign out right now. Please try again.',
          ),
        };
      }

      return { ok: true, data: undefined };
    } catch (err) {
      return {
        ok: false,
        error: mapSupabaseError(
          err,
          'Unable to sign out cleanly. Please try again.',
        ),
      };
    }
  }
}

export const authService: AuthRepository = new SupabaseAuthRepository();
