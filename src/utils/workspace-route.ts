import { roleFeatures } from '@/data/role-features';
import type { RoleId } from '@/types/auth';

export function workspacePath(role: RoleId) {
  if (role === 'student' || role === 'dormManager') return `/workspace/${role}`;
  const first = roleFeatures[role][0];
  return `/workspace/${role}/${first.id}/${first.actions[0].id}`;
}
