import React, { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { TimecardSummaryReport } from "@/components/TimecardSummaryReport";
import { RescueCoverageReport } from "@/components/RescueCoverageReport";
import { ActivityLog } from "@/components/ActivityLog";
import { EmailSettings } from "@/components/admin/EmailSettings";
import { SecuritySettings } from "@/components/admin/SecuritySettings";
import { SystemSettings } from "@/components/admin/SystemSettings";
import EmployeeManagement from "@/components/EmployeeManagement";

export default function SupervisorDashboard() {
  const [activeSection, setActiveSection] = useState("timecard-summary");

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };

  const handleLogout = () => {
    window.location.href = '/';
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "timecard-summary":
        return <TimecardSummaryReport />;
      case "rescue-coverage":
        return <RescueCoverageReport />;
      case "activity-log":
        return <ActivityLog />;
      case "employee-management":
        return <EmployeeManagement />;
      case "email-settings":
        return <EmailSettings />;
      case "security-settings":
        return <SecuritySettings />;
      case "system-settings":
        return <SystemSettings />;
      default:
        return <TimecardSummaryReport />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {getSectionTitle(activeSection)}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {getSectionDescription(activeSection)}
              </p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}

function getSectionTitle(section: string): string {
  switch (section) {
    case "timecard-summary":
      return "Timecard Summary";
    case "rescue-coverage":
      return "Rescue Coverage Report";
    case "activity-log":
      return "Activity Log";
    case "employee-management":
      return "Employee Management";
    case "email-settings":
      return "Email Settings";
    case "security-settings":
      return "Security Settings";
    case "system-settings":
      return "System Settings";
    default:
      return "Admin Dashboard";
  }
}

function getSectionDescription(section: string): string {
  switch (section) {
    case "timecard-summary":
      return "View and manage submitted timecards for all employees";
    case "rescue-coverage":
      return "Track rescue coverage shifts and analyze duty assignments";
    case "activity-log":
      return "Review system activity and audit trail";
    case "employee-management":
      return "Manage employee records and contact information";
    case "email-settings":
      return "Configure email notifications and templates";
    case "security-settings":
      return "Manage application and admin passwords";
    case "system-settings":
      return "Configure system-wide settings and thresholds";
    default:
      return "Administrative tools and reports";
  }
}