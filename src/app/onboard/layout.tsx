import OnboardingNestedLayout from './components/nested-layout';
import { getUser } from '@/api/user';
import { redirect } from 'next/navigation';
import { AuthHydrator } from '@/components/authHydrator';
import { RequestTimeoutError } from '@/lib/withTimeout';
import Timeout from '../time-out';

const OnboardingLayout = async ({ children }: { children: React.ReactNode }) => {
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
  if (userData.data.user.profile_completed) {
    redirect("/dashboard");
  }
  return (
    <AuthHydrator user={userData.data.user}>
      <OnboardingNestedLayout>{children}</OnboardingNestedLayout>
    </AuthHydrator>
  );
};

export default OnboardingLayout;
