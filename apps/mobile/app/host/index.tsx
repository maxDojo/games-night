import { Redirect } from 'expo-router';

export default function HostIndexRoute() {
  return <Redirect href="/host/lobby" />;
}
