import React from 'react';
import { getTrailsData } from '@/services/app-service';
import { TrailsStream } from '@/components/trails/TrailsStream';

export const dynamic = 'force-dynamic';

export default async function TrailsPage() {
  const data = await getTrailsData({ limit: 150 });
  const events = data.events;

  return <TrailsStream initialEvents={events} />;
}

