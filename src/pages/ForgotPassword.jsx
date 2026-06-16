import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  return (
    <AuthLayout
      icon={KeyRound}
      title="Password help"
      subtitle="This hunt uses screen names instead of email accounts"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      <div className="space-y-4 text-center">
        <p className="text-sm text-foreground">
          Password reset emails are not available because players do not register
          with an email address.
        </p>
        <p className="text-sm text-muted-foreground">
          Ask the event host or admin to help recover or replace your account.
        </p>
        <Button asChild className="w-full h-12 font-medium">
          <Link to="/login">Return to log in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
