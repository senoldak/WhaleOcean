import React from 'react';
import { getCompassRecommendations } from '@/services/app-service';
import { CompassRadar } from '@/components/compass/CompassRadar';

export const dynamic = 'force-dynamic';

export default async function CompassPage() {
  const data = await getCompassRecommendations({ limit: 100 });

  return (
    <div className="space-y-6">
      <CompassRadar initialRecommendations={data.recommendations} />
    </div>
  );
}
