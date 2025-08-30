import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Save } from "lucide-react";

export function EmailSettings() {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");

  // Fetch current email settings
  const emailSettingsQuery = useQuery<{recipient_email: string; email_template: string}>({
    queryKey: ["/api/settings/email"],
  });

  // Update email settings mutation
  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (data: { recipient_email?: string; email_template?: string }) => {
      return apiRequest("PUT", "/api/settings/email", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/email"] });
      toast({
        title: "Email settings updated",
        description: "Email configuration has been updated successfully.",
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
      setEmailTemplate(emailSettingsQuery.data.email_template || "");
    }
  }, [emailSettingsQuery.data]);

  const handleEmailSettingsUpdate = () => {
    if (!recipientEmail.trim() || !emailTemplate.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both the recipient email and email template.",
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
      email_template: emailTemplate,
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
      
      <Card>
        <CardHeader>
          <CardTitle>Notification Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="recipient-email">Recipient Email Address</Label>
            <Input
              id="recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="admin@oaklandfire.gov"
              className="mt-1"
              data-testid="input-recipient-email"
            />
            <p className="text-sm text-gray-600 mt-1">
              Email address that will receive timecard submission notifications.
            </p>
          </div>

          <div>
            <Label htmlFor="email-template">Email Template</Label>
            <Textarea
              id="email-template"
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              placeholder="Subject: Timecard Submitted\n\nA new timecard has been submitted by {employeeName} for the week ending {weekEnding}."
              rows={6}
              className="mt-1"
              data-testid="textarea-email-template"
            />
            <p className="text-sm text-gray-600 mt-1">
              Available placeholders: {'{employeeName}'}, {'{weekEnding}'}, {'{submissionDate}'}
            </p>
          </div>

          <Button
            onClick={handleEmailSettingsUpdate}
            disabled={updateEmailSettingsMutation.isPending}
            className="flex items-center"
            data-testid="button-save-email-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateEmailSettingsMutation.isPending ? "Saving..." : "Save Email Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
