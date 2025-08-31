import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Clock, Save } from 'lucide-react';

export default function ScheduleManagementPage() {
  const { toast } = useToast();
  const [overtimeThreshold, setOvertimeThreshold] = useState(42);

  // Fetch current overtime settings
  const overtimeSettingsQuery = useQuery({
    queryKey: ['/api/settings/overtime'],
  });

  const updateOvertimeSettingsMutation = useMutation({
    mutationFn: async (data: { overtime_threshold: number }) => {
      const response = await fetch('/api/settings/overtime', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/overtime'] });
      toast({
        title: "Settings Updated",
        description: "Overtime threshold has been updated successfully.",
        duration: 2000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update overtime settings. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  useEffect(() => {
    if (overtimeSettingsQuery.data?.overtime_threshold) {
      setOvertimeThreshold(overtimeSettingsQuery.data.overtime_threshold);
    }
  }, [overtimeSettingsQuery.data]);

  const handleOvertimeUpdate = () => {
    if (overtimeThreshold < 1 || overtimeThreshold > 80) {
      toast({
        title: "Validation Error",
        description: "Overtime threshold must be between 1 and 80 hours.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    updateOvertimeSettingsMutation.mutate({
      overtime_threshold: overtimeThreshold,
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Schedule Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage work schedules and assignments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overtime Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Overtime Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="overtime-threshold">Overtime Threshold (hours per week)</Label>
                <Input
                  id="overtime-threshold"
                  type="number"
                  min="1"
                  max="80"
                  value={overtimeThreshold}
                  onChange={(e) => setOvertimeThreshold(parseInt(e.target.value) || 0)}
                  placeholder="Enter overtime threshold"
                />
                <p className="text-sm text-gray-500">
                  Hours worked above this threshold will be considered overtime.
                </p>
              </div>
              <Button
                onClick={handleOvertimeUpdate}
                disabled={updateOvertimeSettingsMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateOvertimeSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Future Schedule Features */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Schedule Features</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-4">
                Additional schedule management features will be implemented here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}