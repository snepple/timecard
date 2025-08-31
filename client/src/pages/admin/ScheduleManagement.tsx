import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';

export default function ScheduleManagementPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Schedule Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage work schedules and assignments</p>
        </div>
        <div className="bg-white rounded-lg p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Schedule Management</h3>
          <p className="text-gray-600">Schedule management functionality will be implemented here.</p>
        </div>
      </div>
    </AdminLayout>
  );
}