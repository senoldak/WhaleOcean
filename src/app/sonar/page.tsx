import React from 'react';
import { SonarWorkspace } from '@/components/sonar/SonarWorkspace';

export const dynamic = 'force-dynamic';

export default async function SonarPage({
  searchParams,
}: {
  searchParams?: Promise<{ wallet?: string; asset?: string }>;
}) {
  const resolved = searchParams ? await searchParams : {};

  return (
    <div className="space-y-6">
      <SonarWorkspace
        initialWallet={resolved?.wallet}
        initialAsset={resolved?.asset}
      />
    </div>
  );
}
