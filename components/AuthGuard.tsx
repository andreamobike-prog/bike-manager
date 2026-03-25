"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const isLoginPage = pathname === "/login";

    if (!session && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (session && isLoginPage) {
      router.replace("/");
      return;
    }

    setChecking(false);
  }

  if (checking) {
    return <div style={{ padding: 40 }}>Verifica accesso...</div>;
  }

  return <>{children}</>;
}