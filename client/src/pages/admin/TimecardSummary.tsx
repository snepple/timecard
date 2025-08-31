import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { TimecardSummaryReport } from '@/components/TimecardSummaryReport';

export default function TimecardSummaryPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Timecard Summary</h1>
          <p className="text-sm text-gray-600 mt-1">View and manage timecard submissions</p>
        </div>
        <TimecardSummaryReport />
      </div>
    </AdminLayout>
  );
}