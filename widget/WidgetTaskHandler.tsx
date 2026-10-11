"use no memo";
import React from 'react';
import { Platform } from 'react-native';
import { WidgetTaskHandlerProps, requestWidgetUpdate } from 'react-native-android-widget';
import { CsecWidget } from './Widget';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK': {
      try {
        const existingData = await AsyncStorage.getItem('csec_history');
        const history = existingData ? JSON.parse(existingData) : [];
        const safeHistory = Array.isArray(history) ? history : [];
        renderWidget(<CsecWidget history={safeHistory} />);
      } catch (e) {
        console.warn('[C-SEC Widget] Failed to fetch scan history in headless task:', e);
        renderWidget(<CsecWidget history={[]} />);
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
    const existingData = await AsyncStorage.getItem('csec_history');
    const history = existingData ? JSON.parse(existingData) : [];
    const safeHistory = Array.isArray(history) ? history : [];

    await requestWidgetUpdate({
      widgetName: 'CsecWidget',
      renderWidget: () => <CsecWidget history={safeHistory} />,
      widgetNotFound: () => {
        // Widget not currently added to home screen, safe to ignore
      },
    });
  } catch (e) {
    console.warn('[C-SEC Widget] Failed to update home screen widget:', e);
  }
}
