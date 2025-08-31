import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { EmailSettings } from '@/components/admin/EmailSettings';

export default function EmailSettingsPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Email Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure email notifications and templates</p>
        </div>
        <EmailSettings />
      </div>
    </AdminLayout>
  );
}