import { createClient } from "@/lib/supabase/server";

export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface UserMembership {
  station_id: string;
  role: UserRole;
  division_ids: string[] | null;
}

/**
 * Get the current user's membership and role
 */
export async function getCurrentUserMembership(): Promise<UserMembership | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from('memberships')
    .select('station_id, role, division_ids')
    .eq('user_id', user.id)
    .single();

  return membership;
}

/**
 * Check if user has one of the required roles
 */
export function hasRequiredRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Role hierarchy for permissions
 * ADMIN > EDITOR > VIEWER
 */
export const ROLE_HIERARCHY = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

/**
 * Check if user has at least the minimum required role
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
