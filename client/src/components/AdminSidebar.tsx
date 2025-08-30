import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Users,
  Shield,
  Settings,
  Mail,
  Lock,
  Sliders,
  ChevronDown,
  LogOut,
  BarChart3,
  Activity
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    children: [
      {
        id: "timecard-summary",
        label: "Timecard Summary",
        icon: FileText,
      },
      {
        id: "rescue-coverage",
        label: "Rescue Coverage",
        icon: Shield,
      },
      {
        id: "activity-log",
        label: "Activity Log",
        icon: Activity,
      },
    ],
  },
  {
    id: "management",
    label: "Management",
    icon: Users,
    children: [
      {
        id: "employee-management",
        label: "Employee Management",
        icon: Users,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      {
        id: "email-settings",
        label: "Email Settings",
        icon: Mail,
      },
      {
        id: "security-settings",
        label: "Security Settings",
        icon: Lock,
      },
      {
        id: "system-settings",
        label: "System Settings",
        icon: Sliders,
      },
    ],
  },
];

export function AdminSidebar({ activeSection, onSectionChange, onLogout }: AdminSidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>(["reports", "management", "settings"]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openSections.includes(item.id);
    const isActive = activeSection === item.id;

    if (hasChildren) {
      return (
        <Collapsible key={item.id} open={isOpen} onOpenChange={() => toggleSection(item.id)}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between h-10 px-3",
                depth > 0 && "ml-4",
                isActive && "bg-primary/10 text-primary"
              )}
            >
              <div className="flex items-center">
                <item.icon className="h-4 w-4 mr-3" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-4 mt-1 space-y-1">
              {item.children?.map(child => renderMenuItem(child, depth + 1))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          "w-full justify-start h-10 px-3",
          depth > 0 && "ml-4",
          isActive && "bg-primary/10 text-primary"
        )}
        onClick={() => onSectionChange(item.id)}
      >
        <item.icon className="h-4 w-4 mr-3" />
        <span className="text-sm font-medium">{item.label}</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Oakland Fire Department</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-2">
        <nav className="space-y-1">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onLogout}
          data-testid="button-sidebar-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
