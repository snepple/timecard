import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home,
  FileText,
  UserCheck,
  Users,
  BarChart3,
  Settings,
  Calendar as CalendarIcon,
  Shield,
  LogOut,
  Activity,
  Mail,
  Lock,
  Sliders,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  active?: boolean;
  children?: SidebarItem[];
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(['reports']);

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const sidebarItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <Home className="h-5 w-5" />,
      active: location === '/admin'
    },
    {
      label: 'Reports',
      icon: <BarChart3 className="h-5 w-5" />,
      children: [
        {
          label: 'Timecard Summary',
          href: '/admin/timecard-summary',
          icon: <FileText className="h-4 w-4" />,
          active: location === '/admin/timecard-summary'
        },
        {
          label: 'Rescue Coverage',
          href: '/admin/rescue-coverage',
          icon: <UserCheck className="h-4 w-4" />,
          active: location === '/admin/rescue-coverage'
        }
      ]
    },
    {
      label: 'Activity Logs',
      href: '/admin/activity-logs',
      icon: <Activity className="h-5 w-5" />,
      active: location === '/admin/activity-logs'
    },
    {
      label: 'Member Management',
      href: '/admin/member-management',
      icon: <Users className="h-5 w-5" />,
      active: location === '/admin/member-management'
    },
    {
      label: 'Email Settings',
      href: '/admin/email-settings',
      icon: <Mail className="h-5 w-5" />,
      active: location === '/admin/email-settings'
    },
    {
      label: 'Schedule Management',
      href: '/admin/schedule',
      icon: <CalendarIcon className="h-5 w-5" />,
      active: location === '/admin/schedule'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
              <p className="text-xs text-gray-600">Oakland Fire Department</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  // Parent item with children
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.label.toLowerCase())}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </div>
                      {expandedItems.includes(item.label.toLowerCase()) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {expandedItems.includes(item.label.toLowerCase()) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link key={child.href || child.label} href={child.href}>
                            <div className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                              child.active 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            )}>
                              {child.icon}
                              {child.label}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  // Regular item
                  <Link href={item.href!}>
                    <div className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                      item.active 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    )}>
                      {item.icon}
                      {item.label}
                    </div>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
              <LogOut className="h-5 w-5" />
              Back to Timesheets
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}