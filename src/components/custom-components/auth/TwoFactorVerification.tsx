"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export function TwoFactorVerification() {
  const [token, setToken] = useState('');
  const { toast } = useToast();

  const verify2FA = async () => {
    try {
      const response = await fetch('/api/auth/2fa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      // Set 2FA verification cookie
      document.cookie = '2fa_verified=true; path=/';
      
      // Redirect to dashboard
      window.location.href = '/app/employee';
    } catch (error) {
      toast({
        title: "Error",
        children: "Invalid verification code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Enter verification code"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <Button onClick={verify2FA} className="w-full">Verify</Button>
    </div>
  );
}
