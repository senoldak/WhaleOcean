import React from 'react';
import { getGraveyardData } from '@/services/app-service';
import { GraveyardTable } from '@/components/graveyard/GraveyardTable';

export const dynamic = 'force-dynamic';

export default async function GraveyardPage() {
  const data = await getGraveyardData();
  const casualties = data.casualties;

  return <GraveyardTable initialCasualties={casualties} />;
}

