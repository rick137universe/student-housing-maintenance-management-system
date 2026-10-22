import {workspaceTitle} from '@/utils/page-title';

export async function generateMetadata({params}: {params: Promise<{role: string; feature: string; action?: string[]}>}) {
  const {role, feature, action = []} = await params;
  return {title: workspaceTitle(['/workspace', role, feature, ...action].join('/'))};
}

// The root layout hosts the stable workspace shell across feature routes.
export default function Page() { return null; }
