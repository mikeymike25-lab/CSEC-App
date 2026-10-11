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
        backgroundColor: '#0B1120', // Midnight obsidian
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
          <FlexWidget
            style={{
              backgroundColor: '#0369A1',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginRight: 6,
            }}
          >
            <TextWidget
              text="C-SEC"
              style={{ fontSize: 10, color: '#FFFFFF', fontWeight: 'bold' }}
            />
          </FlexWidget>

          <TextWidget
            text="SENTINEL SHIELD"
            style={{ fontSize: 10, color: '#94A3B8', fontWeight: 'bold' }}
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
          <FlexWidget
            style={{
              backgroundColor: '#064E3B',
              borderColor: '#059669',
              borderWidth: 1,
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginBottom: 4,
            }}
          >
            <TextWidget
              text="● SHIELD ACTIVE"
              style={{ fontSize: 9, color: '#34D399', fontWeight: 'bold' }}
            />
          </FlexWidget>

          <TextWidget
            text="Zero Threats Detected"
            style={{ fontSize: 13, color: '#F8FAFC', fontWeight: 'bold' }}
          />
          <TextWidget
            text="Tap widget to analyze a suspicious link"
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

            const statusGlyph = isSafe ? '✓' : isSuspicious ? '!' : '✕';
            const glyphColor = isSafe ? '#34D399' : isSuspicious ? '#FBBF24' : '#F87171';
            const boxBg = isSafe ? '#064E3B' : isSuspicious ? '#78350F' : '#7F1D1D';
            const boxBorder = isSafe ? '#059669' : isSuspicious ? '#D97706' : '#DC2626';

            const badgeText = isSafe ? 'SECURE' : isSuspicious ? 'CAUTION' : 'BLOCKED';
            const subtitleText = isSafe ? `Clean • ${dateStr}` : isSuspicious ? `Suspicious • ${dateStr}` : `Threat • ${dateStr}`;
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
                {/* Minimalist status glyph badge */}
                <FlexWidget
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    backgroundColor: boxBg,
                    borderColor: boxBorder,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TextWidget
                    text={statusGlyph}
                    style={{ fontSize: 12, color: glyphColor, fontWeight: 'bold' }}
                  />
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

                {/* Security Status Pill */}
                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: boxBg,
                    borderColor: boxBorder,
                    borderWidth: 1,
                    borderRadius: 7,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <TextWidget
                    text={badgeText}
                    style={{ fontSize: 9, color: glyphColor, fontWeight: 'bold' }}
                  />
                </FlexWidget>
              </FlexWidget>
            );
          })}

          {/* If only 1 scan exists, companion "New Scan" tile without emojis */}
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
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  backgroundColor: '#075985',
                  borderColor: '#0284C7',
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TextWidget text="+" style={{ fontSize: 14, color: '#38BDF8', fontWeight: 'bold' }} />
              </FlexWidget>

              <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 8, marginRight: 6 }}>
                <TextWidget
                  text="Analyze New URL"
                  style={{ fontSize: 12, color: '#F8FAFC', fontWeight: 'bold' }}
                />
                <TextWidget
                  text="Tap to open scanner"
                  style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}
                />
              </FlexWidget>

              <FlexWidget
                style={{
                  backgroundColor: '#0C4A6E',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <TextWidget text="SCAN >" style={{ fontSize: 9, color: '#38BDF8', fontWeight: 'bold' }} />
              </FlexWidget>
            </FlexWidget>
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
