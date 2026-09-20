import React from 'react';
import { getMigrationData } from '@/services/app-service';
import { MigrationFlow } from '@/components/migration/MigrationFlow';

export const dynamic = 'force-dynamic';

export default async function MigrationPage() {
  const data = await getMigrationData();
  const flows = data.flows;

  return <MigrationFlow initialFlows={flows} />;
}

