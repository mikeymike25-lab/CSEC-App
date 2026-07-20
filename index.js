import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widget/WidgetTaskHandler';

registerWidgetTaskHandler(widgetTaskHandler);

export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
