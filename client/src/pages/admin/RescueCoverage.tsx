import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { RescueCoverageReport } from '@/components/RescueCoverageReport';

export default function RescueCoveragePage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Rescue Coverage</h1>
          <p className="text-sm text-gray-600 mt-1">Monitor rescue coverage and duty assignments</p>
        </div>
        <RescueCoverageReport />
      </div>
    </AdminLayout>
  );
}