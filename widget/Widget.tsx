import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function CsecWidget({ history }: { history: any[] }) {
  const recentItems = history ? history.slice(0, 4) : [];

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#16202A', // Premium dark blue-gray
        borderRadius: 24,
        padding: 16,
        flexDirection: 'column',
      }}
    >
      {/* HEADER */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: 8,
          backgroundColor: '#1E293B',
          borderRadius: 16,
        }}
      >
        <TextWidget
          text="🛡️ C-SEC"
          style={{ fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' }}
        />
        <FlexWidget
          style={{
            backgroundColor: '#3B82F6',
            borderRadius: 8,
            padding: 4,
          }}
        >
          <TextWidget
            text="LIVE SCAN"
            style={{ fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* RECENT SCANS LIST */}
      {recentItems.length === 0 ? (
        <FlexWidget style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text="No scans detected yet." style={{ fontSize: 14, color: '#A9B4C0' }} />
        </FlexWidget>
      ) : (
        recentItems.map((item, index) => {
          const isSafe = item.verdict === 'Safe';
          const isWarning = item.verdict === 'Suspicious';
          const verdictColor = isSafe ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444';
          const emoji = isSafe ? '✅' : isWarning ? '⚠️' : '🚨';

          return (
            <FlexWidget
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#1F2D3D',
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <FlexWidget style={{ flexDirection: 'column', flex: 1 }}>
                <TextWidget
                  text={item.url.length > 25 ? item.url.substring(0, 25) + '...' : item.url}
                  maxLines={1}
                  style={{ fontSize: 13, color: '#FFFFFF', fontWeight: 'bold' }}
                />
                <TextWidget
                  text={item.date}
                  style={{ fontSize: 10, color: '#8A9AA9', marginTop: 2 }}
                />
              </FlexWidget>
              
              <FlexWidget
                style={{
                  backgroundColor: '#2D4356', 
                  borderRadius: 8,
                  padding: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                }}
              >
                <TextWidget
                  text={emoji}
                  style={{ fontSize: 14 }}
                />
              </FlexWidget>
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
