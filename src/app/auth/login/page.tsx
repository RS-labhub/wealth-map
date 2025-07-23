"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyRegistrationForm } from "@/components/custom-components/auth/CompanyRegistrationForm";
import { LoginForm } from "@/components/custom-components/auth/LoginForm";
import { Suspense } from "react";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "signin";

  const handleTabChange = (value: string) => {
    router.push(`/auth/login?tab=${value}`);
  };

  return (
    <div className="max-w-md w-full">
      <h1 className="text-2xl font-bold mb-8 text-center">Welcome to Wealth Map</h1>
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <LoginForm />
        </TabsContent>
        <TabsContent value="register">
          <CompanyRegistrationForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  );
} 