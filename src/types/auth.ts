export type RoleId = 'student' | 'dormManager' | 'maintenance' | 'admin';
export interface Account {
  id: string; role: RoleId; username: string; displayName: string;
  roleName: string; scope: string; studentNumber: string | null; csrfToken?: string;
}
