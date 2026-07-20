import { Redirect } from 'expo-router';

export default function NotFoundScreen() {
  // When an external URL is intercepted, Expo Router might treat it as a missing route.
  // We simply redirect to the main tabs, and the LinkInterceptor will show the modal on top!
  return <Redirect href="/tabs" />;
}
