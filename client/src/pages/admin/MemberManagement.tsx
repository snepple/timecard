import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import EmployeeManagement from '@/components/EmployeeManagement';

export default function MemberManagementPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Member Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage employee information and access</p>
        </div>
        <EmployeeManagement />
      </div>
    </AdminLayout>
  );
}