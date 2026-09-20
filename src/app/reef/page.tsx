import React from 'react';
import { getReefData } from '@/services/app-service';
import { ReefMatrix } from '@/components/reef/ReefMatrix';

export const dynamic = 'force-dynamic';

export default async function ReefPage() {
  const data = await getReefData();
  const barriers = data.barriers;

  return <ReefMatrix initialBarriers={barriers} />;
}

