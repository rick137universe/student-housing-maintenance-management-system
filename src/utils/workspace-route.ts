import { roleFeatures } from '@/data/role-features';
import type { RoleId } from '@/types/auth';

export function workspacePath(role: RoleId) {
  const first = roleFeatures[role][0];
  return `/workspace/${role}/${first.id}/${first.actions[0].id}`;
}
