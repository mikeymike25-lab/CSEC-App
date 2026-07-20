import React from 'react';
import { WidgetTaskHandlerProps, requestWidgetUpdate } from 'react-native-android-widget';
import { CsecWidget } from './Widget';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  try {
    const existingData = await AsyncStorage.getItem('csec_history');
    const history = existingData ? JSON.parse(existingData) : [];
    
    props.renderWidget(<CsecWidget history={history} />);
  } catch (e) {
    props.renderWidget(<CsecWidget history={[]} />);
  }
}

export async function updateWidget() {
  requestWidgetUpdate({
    widgetName: 'CsecWidget',
    renderWidget: () => null, // this will trigger the task handler
    widgetNotFound: () => {
      // Widget not added to home screen, ignore
    },
  });
}
