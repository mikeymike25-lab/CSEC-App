"use no memo";
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function CsecWidget({ history }: { history?: any[] }) {
  const safeHistory = Array.isArray(history) ? history : [];
  const recentItems = safeHistory.slice(0, 3);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0F172A', // Slate 900 dark theme
        borderRadius: 20,
        padding: 12,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* HEADER BAR */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: '#1E293B',
          borderRadius: 12,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="🛡️ C-SEC"
            style={{ fontSize: 14, color: '#38BDF8', fontWeight: 'bold' }}
          />
          <TextWidget
            text=" • SHIELD"
            style={{ fontSize: 10, color: '#94A3B8', fontWeight: 'bold', marginLeft: 4 }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            backgroundColor: '#0284C7',
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text="LIVE"
            style={{ fontSize: 9, color: '#FFFFFF', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* CONTENT: RECENT SCANS OR PROTECTION STATUS */}
      {recentItems.length === 0 ? (
        <FlexWidget
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#1E293B',
            borderRadius: 14,
            padding: 10,
          }}
        >
          <TextWidget
            text="🛡️ Protection Active"
            style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 'bold', marginBottom: 4 }}
          />
          <TextWidget
            text="Tap here to open C-SEC and scan a URL."
            style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'space-around' }}>
          {recentItems.map((item: any, index: number) => {
            const rawUrl = typeof item?.url === 'string' && item.url.trim().length > 0 ? item.url.trim() : 'Unknown URL';
            const cleanUrl = rawUrl.replace(/^https?:\/\//i, '');
            const displayUrl = cleanUrl.length > 26 ? cleanUrl.substring(0, 26) + '...' : cleanUrl;

            let dateStr = 'Recent';
            if (typeof item?.date === 'string' && item.date.length > 0) {
              dateStr = item.date;
            } else if (typeof item?.timestamp === 'number') {
              const d = new Date(item.timestamp);
              dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }

            const rawVerdict = String(item?.verdict || '').toLowerCase();
            const isSafe = rawVerdict === 'safe' || rawVerdict.includes('clean');
            const isSuspicious = rawVerdict === 'suspicious' || rawVerdict === 'warning';

            const verdictEmoji = isSafe ? '✅' : isSuspicious ? '⚠️' : '🚨';
            const badgeBg = isSafe ? '#064E3B' : isSuspicious ? '#78350F' : '#7F1D1D';
            const badgeText = isSafe ? 'SAFE' : isSuspicious ? 'WARN' : 'RISK';
            const badgeColor = isSafe ? '#34D399' : isSuspicious ? '#FBBF24' : '#F87171';

            return (
              <FlexWidget
                key={index}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#1E293B',
                  borderRadius: 10,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  marginBottom: index < recentItems.length - 1 ? 4 : 0,
                }}
              >
                <FlexWidget style={{ flexDirection: 'column', flex: 1, marginRight: 6 }}>
                  <TextWidget
                    text={displayUrl}
                    maxLines={1}
                    truncate="END"
                    style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 'bold' }}
                  />
                  <TextWidget
                    text={dateStr}
                    style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}
                  />
                </FlexWidget>

                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: badgeBg,
                    borderRadius: 6,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                  }}
                >
                  <TextWidget
                    text={verdictEmoji}
                    style={{ fontSize: 10, marginRight: 3 }}
                  />
                  <TextWidget
                    text={badgeText}
                    style={{ fontSize: 9, color: badgeColor, fontWeight: 'bold' }}
                  />
                </FlexWidget>
              </FlexWidget>
            );
          })}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
