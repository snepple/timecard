import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { ActivityLog } from '@/components/ActivityLog';

export default function ActivityLogsPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-600 mt-1">Track system activities and user actions</p>
        </div>
        <ActivityLog />
      </div>
    </AdminLayout>
  );
}