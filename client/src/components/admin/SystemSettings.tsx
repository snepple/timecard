import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sliders, Save, Clock } from "lucide-react";

export function SystemSettings() {
  const { toast } = useToast();
  const [overtimeThreshold, setOvertimeThreshold] = useState(42);

  // Fetch current overtime settings
  const overtimeSettingsQuery = useQuery<{overtime_threshold: number}>({
    queryKey: ["/api/settings/overtime"],
  });

  // Update overtime settings mutation
  const updateOvertimeSettingsMutation = useMutation({
    mutationFn: async (data: { overtime_threshold?: number }) => {
      return apiRequest("PUT", "/api/settings/overtime", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/overtime"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/timecard-summary"] });
      toast({
        title: "Overtime settings updated",
        description: "Overtime threshold has been updated successfully.",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("Overtime settings update error:", error);
      toast({
        title: "Error",
        description: "Failed to update overtime settings. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  // Load overtime settings when data is available
  useEffect(() => {
    if (overtimeSettingsQuery.data) {
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

  if (overtimeSettingsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading system settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Sliders className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">System Settings</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Overtime Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="overtime-threshold">Weekly Overtime Threshold (hours)</Label>
            <div className="flex items-center space-x-3 mt-2">
              <Input
                id="overtime-threshold"
                type="number"
                min="1"
                max="80"
                value={overtimeThreshold}
                onChange={(e) => setOvertimeThreshold(parseInt(e.target.value) || 42)}
                className="w-32"
                data-testid="input-overtime-threshold"
              />
              <Button
                onClick={handleOvertimeUpdate}
                disabled={updateOvertimeSettingsMutation.isPending}
                className="flex items-center"
                data-testid="button-update-overtime"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateOvertimeSettingsMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-600">
                Hours worked beyond this threshold in a week are considered overtime and will be highlighted in reports.
              </p>
              <p className="text-xs text-gray-500">
                Current setting: {overtimeSettingsQuery.data?.overtime_threshold || 42} hours
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future system settings can be added here */}
      <Card>
        <CardHeader>
          <CardTitle>Additional System Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Additional system configuration options will be available here in future updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
