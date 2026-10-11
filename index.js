import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widget/WidgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (error) {
    console.warn('Failed to register Android widget task handler:', error);
  }
}

export function App() {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
