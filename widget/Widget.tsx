"use no memo";
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function CsecWidget({ history }: { history?: any[] }) {
  const safeHistory = Array.isArray(history) ? history : [];
  const recentItems = safeHistory.slice(0, 2);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0B1120', // Ultra-deep midnight slate
        borderColor: '#1E293B',
        borderWidth: 1,
        borderRadius: 22,
        padding: 10,
        flexDirection: 'column',
      }}
    >
      {/* ── HEADER BAR ────────────────────────────────────── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: '#131D31',
          borderColor: '#1E293B',
          borderWidth: 1,
          borderRadius: 12,
        }}
      >
        <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="🛡️ C-SEC"
            style={{ fontSize: 13, color: '#38BDF8', fontWeight: 'bold' }}
          />
          <TextWidget
            text=" • SENTINEL"
            style={{ fontSize: 9, color: '#64748B', fontWeight: 'bold', marginLeft: 4 }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#064E3B',
            borderColor: '#059669',
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 7,
            paddingVertical: 2,
          }}
        >
          <TextWidget
            text="● LIVE"
            style={{ fontSize: 9, color: '#34D399', fontWeight: 'bold' }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── BODY: CARDS OR EMPTY STATE ───────────────────── */}
      {recentItems.length === 0 ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#131D31',
            borderColor: '#1E293B',
            borderWidth: 1,
            borderRadius: 14,
            padding: 10,
          }}
        >
          <TextWidget
            text="🛡️"
            style={{ fontSize: 22, marginBottom: 2 }}
          />
          <TextWidget
            text="Real-Time Protection Active"
            style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 'bold' }}
          />
          <TextWidget
            text="Tap widget to scan a link with AI"
            style={{ fontSize: 10, color: '#64748B', marginTop: 2, textAlign: 'center' }}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          {recentItems.map((item: any, index: number) => {
            const rawUrl = typeof item?.url === 'string' && item.url.trim().length > 0 ? item.url.trim() : 'Unknown URL';
            const cleanUrl = rawUrl.replace(/^https?:\/\/(www\.)?/i, '');
            const displayUrl = cleanUrl.length > 24 ? cleanUrl.substring(0, 24) + '...' : cleanUrl;

            let dateStr = 'Recent';
            if (typeof item?.timestamp === 'number') {
              const d = new Date(item.timestamp);
              const now = new Date();
              const isToday = d.toDateString() === now.toDateString();
              const hours = d.getHours().toString().padStart(2, '0');
              const minutes = d.getMinutes().toString().padStart(2, '0');
              dateStr = isToday ? `${hours}:${minutes}` : `${d.getMonth() + 1}/${d.getDate()} ${hours}:${minutes}`;
            } else if (typeof item?.date === 'string' && item.date.length > 0) {
              dateStr = item.date;
            }

            const rawVerdict = String(item?.verdict || '').toLowerCase();
            const isSafe = rawVerdict === 'safe' || rawVerdict.includes('clean');
            const isSuspicious = rawVerdict === 'suspicious' || rawVerdict === 'warning';

            const verdictEmoji = isSafe ? '✅' : isSuspicious ? '⚠️' : '🚨';
            const iconBg = isSafe ? '#064E3B' : isSuspicious ? '#78350F' : '#7F1D1D';
            const badgeBg = isSafe ? '#064E3B' : isSuspicious ? '#78350F' : '#7F1D1D';
            const badgeBorder = isSafe ? '#059669' : isSuspicious ? '#D97706' : '#DC2626';
            const badgeText = isSafe ? '✓ SAFE' : isSuspicious ? '⚠ WARN' : '✕ RISK';
            const badgeColor = isSafe ? '#34D399' : isSuspicious ? '#FBBF24' : '#F87171';
            const subtitleText = isSafe ? `Clean • ${dateStr}` : isSuspicious ? `Caution • ${dateStr}` : `Threat • ${dateStr}`;
            const subtitleColor = isSafe ? '#10B981' : isSuspicious ? '#F59E0B' : '#EF4444';

            return (
              <FlexWidget
                key={index}
                style={{
                  width: 'match_parent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#131D31',
                  borderColor: '#1E293B',
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 9,
                  paddingVertical: 7,
                  marginBottom: index === 0 && recentItems.length > 1 ? 5 : 0,
                }}
              >
                {/* Icon box */}
                <FlexWidget
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    backgroundColor: iconBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TextWidget text={verdictEmoji} style={{ fontSize: 12 }} />
                </FlexWidget>

                {/* Details */}
                <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 8, marginRight: 6 }}>
                  <TextWidget
                    text={displayUrl}
                    maxLines={1}
                    truncate="END"
                    style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 'bold' }}
                  />
                  <TextWidget
                    text={subtitleText}
                    style={{ fontSize: 9, color: subtitleColor, marginTop: 1 }}
                  />
                </FlexWidget>

                {/* Status Badge */}
                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: badgeBg,
                    borderColor: badgeBorder,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <TextWidget
                    text={badgeText}
                    style={{ fontSize: 9, color: badgeColor, fontWeight: 'bold' }}
                  />
                </FlexWidget>
              </FlexWidget>
            );
          })}

          {/* If only 1 scan exists, show a companion "Tap to scan" slot so it fills beautifully */}
          {recentItems.length === 1 && (
            <FlexWidget
              style={{
                width: 'match_parent',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#131D31',
                borderColor: '#1E293B',
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 9,
                paddingVertical: 7,
                marginTop: 5,
              }}
            >
              <FlexWidget
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  backgroundColor: '#0369A1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TextWidget text="🔍" style={{ fontSize: 12 }} />
              </FlexWidget>

              <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 8, marginRight: 6 }}>
                <TextWidget
                  text="Scan New URL"
                  style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 'bold' }}
                />
                <TextWidget
                  text="Tap to open AI scanner"
                  style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}
                />
              </FlexWidget>

              <TextWidget text="➜" style={{ fontSize: 12, color: '#38BDF8', fontWeight: 'bold' }} />
            </FlexWidget>
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
