import { HomePageSkeleton } from '../pages/skeletons/home.skeleton.page';
import { useMe } from '../queries/me.query';
import ProfileError from "./profileError.component";

export function AuthGate({ children }) {
  const { data: user, isLoading, isError, error, refetch } = useMe();

  if (isLoading) return <HomePageSkeleton />;
  if (isError || !user) return <ProfileError error={error} onRetry={refetch} />;
  return children;
}