import React from 'react';
import { User, Calendar, Clock, Shield, CheckSquare, PenTool } from 'lucide-react';

interface TimesheetSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  active?: boolean;
}

interface TimesheetSidebarProps {
  sections: TimesheetSection[];
  onSectionClick: (sectionId: string) => void;
  activeSection: string;
}

export function TimesheetSidebar({ sections, onSectionClick, activeSection }: TimesheetSidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Timesheet Sections</h2>
      </div>
      
      {/* Navigation Items */}
      <nav className="flex-1 p-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionClick(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 mb-1 rounded-lg text-left transition-all duration-200 ${
              activeSection === section.id
                ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            data-testid={`sidebar-${section.id}`}
          >
            {/* Status Indicator */}
            <div 
              className={`w-3 h-3 rounded-full ${
                section.completed ? 'bg-blue-500' : 'bg-red-500'
              }`}
            />
            
            {/* Icon */}
            <div className={`${
              activeSection === section.id ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {section.icon}
            </div>
            
            {/* Label */}
            <span className={`font-medium ${
              activeSection === section.id ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {section.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Helper function to generate sections data
export function generateTimesheetSections({
  hasEmployee,
  hasWeekEnding,
  hasTimeEntries,
  hasRescueCoverage,
  hasSignature,
}: {
  hasEmployee: boolean;
  hasWeekEnding: boolean;
  hasTimeEntries: boolean;
  hasRescueCoverage: boolean;
  hasSignature: boolean;
}): TimesheetSection[] {
  return [
    {
      id: 'employee',
      label: 'Employee Info',
      icon: <User className="w-4 h-4" />,
      completed: hasEmployee,
    },
    {
      id: 'week',
      label: 'Week Selection',
      icon: <Calendar className="w-4 h-4" />,
      completed: hasWeekEnding,
    },
    {
      id: 'timeentry',
      label: 'Time Entry',
      icon: <Clock className="w-4 h-4" />,
      completed: hasTimeEntries,
    },
    {
      id: 'rescue',
      label: 'Rescue Coverage',
      icon: <Shield className="w-4 h-4" />,
      completed: hasRescueCoverage,
    },
    {
      id: 'finalization',
      label: 'Digital Signature',
      icon: <PenTool className="w-4 h-4" />,
      completed: hasSignature,
    },
  ];
}