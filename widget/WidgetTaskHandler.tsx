"use no memo";
import React from 'react';
import { Platform } from 'react-native';
import { WidgetTaskHandlerProps, requestWidgetUpdate } from 'react-native-android-widget';
import { CsecWidget } from './Widget';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkServerStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://csec-sentinel-api.onrender.com/', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const isOnline = res.status >= 200 && res.status < 400;
    await AsyncStorage.setItem('csec_server_status', isOnline ? 'ONLINE' : 'OFFLINE');
    return isOnline;
  } catch (e) {
    try {
      const cached = await AsyncStorage.getItem('csec_server_status');
      return cached === 'ONLINE';
    } catch {
      return false;
    }
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': {
      try {
        const [existingData, isServerOnline] = await Promise.all([
          AsyncStorage.getItem('csec_history'),
          checkServerStatus(),
        ]);
        const history = existingData ? JSON.parse(existingData) : [];
        const safeHistory = Array.isArray(history) ? history : [];
        renderWidget(<CsecWidget history={safeHistory} isServerOnline={isServerOnline} />);
      } catch (e) {
        console.warn('[C-SEC Widget] Failed to fetch scan history in headless task:', e);
        renderWidget(<CsecWidget history={[]} isServerOnline={false} />);
      }
      break;
    }
    case 'WIDGET_DELETED':
    default:
      break;
  }
}

export async function updateWidget() {
  if (Platform.OS !== 'android') return;
  try {
    const [existingData, isServerOnline] = await Promise.all([
      AsyncStorage.getItem('csec_history'),
      checkServerStatus(),
    ]);
    const history = existingData ? JSON.parse(existingData) : [];
    const safeHistory = Array.isArray(history) ? history : [];

    await requestWidgetUpdate({
      widgetName: 'CsecWidget',
      renderWidget: () => <CsecWidget history={safeHistory} isServerOnline={isServerOnline} />,
      widgetNotFound: () => {
        // Widget not currently added to home screen, safe to ignore
      },
    });
  } catch (e) {
    console.warn('[C-SEC Widget] Failed to update home screen widget:', e);
  }
}
