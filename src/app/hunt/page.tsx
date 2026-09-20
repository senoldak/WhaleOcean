import React from 'react';
import { getHuntData } from '@/services/app-service';
import { HuntZones } from '@/components/hunt/HuntZones';

export const dynamic = 'force-dynamic';

export default async function HuntPage() {
  const data = await getHuntData();
  const zones = data.zones;

  return <HuntZones initialZones={zones} />;
}

