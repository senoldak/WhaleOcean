import React from 'react';
import { getPodsData } from '@/services/app-service';
import { PodGrid } from '@/components/pods/PodGrid';

export const dynamic = 'force-dynamic';

export default async function PodsPage() {
  const data = await getPodsData();
  const pods = data.pods;

  return <PodGrid initialPods={pods} />;
}

