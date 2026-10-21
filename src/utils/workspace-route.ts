import type { RoleId } from '@/types/auth';

export function workspacePath(role: RoleId) { return `/workspace/${role}`; }
