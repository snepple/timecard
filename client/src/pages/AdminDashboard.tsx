import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText, Clock, TrendingUp, AlertCircle, CheckCircle, BarChart3, Settings, Download, UserCheck, Calendar as CalendarIcon } from 'lucide-react';
import { Link } from 'wouter';

interface DashboardStats {
  currentWeek: {
    submitted: number;
    scheduled: number;
    weekEnding: string;
  };
  pending: number;
  approved: number;
  totalEmployees: number;
  avgHoursPerWeek: number;
}

export default function AdminDashboard() {
  // Fetch dashboard statistics
  const statsQuery = useQuery({
    queryKey: ['/api/admin/dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard-stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  });

  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading;

  const quickLinks = [
    {
      title: 'Timecard Summary Report',
      description: 'View detailed timecard summaries',
      icon: <FileText className="h-5 w-5" />,
      href: '/admin/timecard-summary',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Rescue Coverage Report',
      description: 'Monitor rescue coverage assignments',
      icon: <UserCheck className="h-5 w-5" />,
      href: '/admin/rescue-coverage',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Member Management',
      description: 'Manage employee information',
      icon: <Users className="h-5 w-5" />,
      href: '/admin/member-management',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Activity Logs',
      description: 'View system activity and changes',
      icon: <BarChart3 className="h-5 w-5" />,
      href: '/admin/activity-logs',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Email Settings',
      description: 'Configure email templates and settings',
      icon: <Settings className="h-5 w-5" />,
      href: '/admin/email-settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      title: 'Schedule Management',
      description: 'Manage work schedules and assignments',
      icon: <CalendarIcon className="h-5 w-5" />,
      href: '/admin/schedule',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  const getSubmissionRate = () => {
    if (!stats) return 0;
    return stats.currentWeek.scheduled > 0 
      ? Math.round((stats.currentWeek.submitted / stats.currentWeek.scheduled) * 100)
      : 0;
  };

  const getSubmissionRateColor = () => {
    const rate = getSubmissionRate();
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Oakland Fire Department Timesheet Management</p>
        </div>

        {/* Key Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Current Week Submission Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week Submissions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.currentWeek.submitted || 0}/{stats?.currentWeek.scheduled || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className={`font-medium ${getSubmissionRateColor()}`}>
                      {getSubmissionRate()}% submission rate
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Week ending {stats?.currentWeek.weekEnding || 'N/A'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.pending === 0 ? 'All caught up!' : 'Requires attention'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.totalEmployees || 0}</div>
                  <p className="text-xs text-muted-foreground">Active members</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Average Hours */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Hours/Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-7 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.avgHoursPerWeek?.toFixed(1) || '0.0'}</div>
                  <p className="text-xs text-muted-foreground">Per employee</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Links */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickLinks.map((link, index) => (
                    <Link key={index} href={link.href}>
                      <div className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${link.bgColor}`}>
                            <div className={link.color}>
                              {link.icon}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {link.title}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {link.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* This Week Status */}
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full ${getSubmissionRate() >= 90 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      {getSubmissionRate() >= 90 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {getSubmissionRate() >= 90 ? 'Excellent submission rate!' : 'Some timecards missing'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getSubmissionRate()}% of scheduled employees submitted timecards
                      </p>
                    </div>
                  </div>

                  {/* Pending Items */}
                  {stats?.pending && stats.pending > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-1 rounded-full bg-blue-100">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {stats.pending} timecard{stats.pending !== 1 ? 's' : ''} awaiting approval
                        </p>
                        <p className="text-xs text-gray-500">
                          Review and approve when ready
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Buttons */}
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    <Link href="/admin/timecard-summary">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        View All Timecards
                      </Button>
                    </Link>
                    <Link href="/admin/member-management">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Members
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}