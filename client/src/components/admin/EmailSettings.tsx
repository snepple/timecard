import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Save, FileText, Edit, UserPlus } from "lucide-react";

export function EmailSettings() {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [newTimecardTemplate, setNewTimecardTemplate] = useState("");
  const [employeeEditTemplate, setEmployeeEditTemplate] = useState("");
  const [supervisorEditTemplate, setSupervisorEditTemplate] = useState("");

  // Fetch current email settings
  const emailSettingsQuery = useQuery<{
    recipient_email: string; 
    email_template: string;
    employee_edit_template?: string;
    supervisor_edit_template?: string;
  }>({
    queryKey: ["/api/settings/email"],
  });

  // Update email settings mutation
  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (data: { 
      recipient_email?: string; 
      email_template?: string;
      employee_edit_template?: string;
      supervisor_edit_template?: string;
    }) => {
      return apiRequest("PUT", "/api/settings/email", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/email"] });
      toast({
        title: "Email settings updated",
        description: "Email templates have been updated successfully.",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error("Email settings update error:", error);
      toast({
        title: "Error",
        description: "Failed to update email settings. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  // Load email settings when data is available
  useEffect(() => {
    if (emailSettingsQuery.data) {
      setRecipientEmail(emailSettingsQuery.data.recipient_email || "");
      setNewTimecardTemplate(emailSettingsQuery.data.email_template || "");
      setEmployeeEditTemplate(emailSettingsQuery.data.employee_edit_template || "");
      setSupervisorEditTemplate(emailSettingsQuery.data.supervisor_edit_template || "");
    }
  }, [emailSettingsQuery.data]);

  const handleEmailSettingsUpdate = () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a recipient email address.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    if (!newTimecardTemplate.trim() || !employeeEditTemplate.trim() || !supervisorEditTemplate.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all email templates.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    updateEmailSettingsMutation.mutate({
      recipient_email: recipientEmail,
      email_template: newTimecardTemplate,
      employee_edit_template: employeeEditTemplate,
      supervisor_edit_template: supervisorEditTemplate,
    });
  };

  if (emailSettingsQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading email settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Email Settings</h2>
      </div>
      
      {/* Recipient Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipient-email">Fire Chief / Supervisor Email Address</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="firechief@oaklandfire.gov"
              className="mt-1"
              data-testid="input-recipient-email"
            />
            <p className="text-sm text-gray-600 mt-1">
              The fire chief or supervisor who will receive all timesheet submissions as attachments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* New Timecard Submission Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            New Timecard Submission Email Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new-timecard-template">Email Template</Label>
            <Textarea
              id="new-timecard-template"
              value={newTimecardTemplate}
              onChange={(e) => setNewTimecardTemplate(e.target.value)}
              placeholder="Subject: New Timecard Submitted

A new timecard has been submitted by {employeeName} for the week ending {weekEnding}."
              rows={6}
              className="mt-1"
              data-testid="textarea-new-timecard-template"
            />
            <p className="text-sm text-gray-600 mt-1">
              Template used for initial timecard submissions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Employee Edited Timecard Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Edit className="h-4 w-4 mr-2" />
            Employee Initiated Edited Timecard Submission Email Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="employee-edit-template">Email Template</Label>
            <Textarea
              id="employee-edit-template"
              value={employeeEditTemplate}
              onChange={(e) => setEmployeeEditTemplate(e.target.value)}
              placeholder="Subject: Edited Timecard Submitted by Employee

{employeeName} has submitted an edited timecard for the week ending {weekEnding}.

Edit Reason: {editComments}"
              rows={6}
              className="mt-1"
              data-testid="textarea-employee-edit-template"
            />
            <p className="text-sm text-gray-600 mt-1">
              Template used when employee edits and resubmits their own timecard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supervisor Edited Timecard Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="h-4 w-4 mr-2" />
            Supervisor Initiated Edited Timecard Submission Email Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="supervisor-edit-template">Email Template</Label>
            <Textarea
              id="supervisor-edit-template"
              value={supervisorEditTemplate}
              onChange={(e) => setSupervisorEditTemplate(e.target.value)}
              placeholder="Subject: Timecard Edited by Supervisor

A timecard for {employeeName} has been edited by supervisor {supervisorName} for the week ending {weekEnding}.

Edit Reason: {editComments}"
              rows={6}
              className="mt-1"
              data-testid="textarea-supervisor-edit-template"
            />
            <p className="text-sm text-gray-600 mt-1">
              Template used when supervisor edits an employee's timecard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Placeholders Information */}
      <Card>
        <CardHeader>
          <CardTitle>Available Placeholders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Common placeholders for all templates:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>{'{employeeName}'}</code> - Employee's full name</li>
              <li><code>{'{weekEnding}'}</code> - Week ending date</li>
              <li><code>{'{submissionDate}'}</code> - Date timecard was submitted</li>
            </ul>
            <p className="mt-3"><strong>Edit-specific placeholders:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><code>{'{editComments}'}</code> - Comments provided when editing</li>
              <li><code>{'{supervisorName}'}</code> - Name of supervisor (supervisor edit template only)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleEmailSettingsUpdate}
          disabled={updateEmailSettingsMutation.isPending}
          className="flex items-center"
          data-testid="button-save-email-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateEmailSettingsMutation.isPending ? "Saving..." : "Save All Email Templates"}
        </Button>
      </div>
    </div>
  );
}