import { AppError } from '@/server/errors';
import { currentAccount } from '@/server/security';
import { workspacePath } from '@/utils/workspace-route';

export async function GET(request: Request) {
  let destination: string;
  try {
    destination = workspacePath((await currentAccount(request)).role);
  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 401) throw error;
    destination = '/login';
  }
  return new Response(null, { status: 307, headers: { Location: destination, 'Cache-Control': 'no-store', Vary: 'Cookie' } });
}
