import React from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/api/user";
import { AuthHydrator } from "@/components/authHydrator";
import ProtectedFragment from "./components/protected-fragment";
import { RequestTimeoutError } from "@/lib/withTimeout";
import Timeout from "../time-out";
import { DashboardSubLayout } from "@/components/dashboard-layout";

const ProtectedLayout = async ({ children }: { children: React.ReactNode }) => {
  let userData;
  try {
    userData = await getUser();
  } catch (err) {
    if (err instanceof RequestTimeoutError) {
      return <Timeout />;
    }
    redirect("/login");
  }
  if (!userData) {
    redirect("/login");
  }
  if (userData.data.user.profile_completed === false) {
    redirect("/onboard");
  }

  return (
    <ProtectedFragment>
      <AuthHydrator user={userData.data.user}>
        {/* <ProtectedHeader /> */}
        <DashboardSubLayout>{children}</DashboardSubLayout>
      </AuthHydrator>
    </ProtectedFragment>
  );
};

export default ProtectedLayout;
