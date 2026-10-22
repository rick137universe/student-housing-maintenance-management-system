import {workspaceTitle} from '@/utils/page-title';

export async function generateMetadata({params}: {params: Promise<{role: string}>}) {
  const {role} = await params;
  return {title: workspaceTitle(`/workspace/${role}`)};
}

// The root layout hosts the stable workspace shell across overview and feature routes.
export default function Page() { return null; }
