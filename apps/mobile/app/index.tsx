import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to dashboard for now
  // In production, this would check auth state and redirect accordingly
  return <Redirect href="/(tabs)/dashboard" />;
}
