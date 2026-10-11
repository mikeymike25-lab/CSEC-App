"use no memo";
import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';

const ICONS = {
  shield: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="#38BDF8" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>`,
  safe: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="#34D399" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="#FBBF24" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  danger: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="#F87171" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="100%" height="100%"><path fill="#38BDF8" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
  dotOnline: `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="7" fill="#34D399"/></svg>`,
  dotOffline: `<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="7" fill="#9CA3AF"/></svg>`,
};

export function CsecWidget({
  history,
  isServerOnline = true,
}: {
  history?: any[];
  isServerOnline?: boolean;
}) {
  const safeHistory = Array.isArray(history) ? history : [];
  const recentItems = safeHistory.slice(0, 3);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0B1120', // Midnight obsidian
        borderColor: '#1E293B',
        borderWidth: 1,
        borderRadius: 20,
        padding: 7,
        flexDirection: 'column',
      }}
    >
      {/* ── HEADER BAR ────────────────────────────────────── */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          backgroundColor: '#131D31',
          borderColor: '#1E293B',
          borderWidth: 1,
          borderRadius: 10,
        }}
      >
        {/* Brand & Shield Icon */}
        <FlexWidget style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <SvgWidget
            svg={ICONS.shield}
            style={{ width: 14, height: 14, marginRight: 5 }}
          />
          <TextWidget
            text="C-SEC"
            style={{ fontSize: 11, color: '#38BDF8', fontWeight: 'bold' }}
          />
          <TextWidget
            text=" • SENTINEL"
            style={{ fontSize: 8, color: '#64748B', fontWeight: 'bold', marginLeft: 3 }}
          />
        </FlexWidget>

        {/* Server Status Pill (Online / Offline) */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isServerOnline ? '#064E3B' : '#374151',
            borderColor: isServerOnline ? '#059669' : '#4B5563',
            borderWidth: 1,
            borderRadius: 8,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <SvgWidget
            svg={isServerOnline ? ICONS.dotOnline : ICONS.dotOffline}
            style={{ width: 7, height: 7, marginRight: 4 }}
          />
          <TextWidget
            text={isServerOnline ? "ONLINE" : "OFFLINE"}
            style={{
              fontSize: 8,
              color: isServerOnline ? "#34D399" : "#9CA3AF",
              fontWeight: 'bold',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* ── BODY: 3 SCAN CARDS OR EMPTY STATE ─────────────── */}
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
            borderRadius: 12,
            padding: 8,
          }}
        >
          <SvgWidget
            svg={ICONS.shield}
            style={{ width: 20, height: 20, marginBottom: 3 }}
          />
          <TextWidget
            text="Real-Time Protection Active"
            style={{ fontSize: 11, color: '#F8FAFC', fontWeight: 'bold' }}
          />
          <TextWidget
            text="Tap widget to analyze a suspicious link"
            style={{ fontSize: 9, color: '#64748B', marginTop: 1, textAlign: 'center' }}
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
            const displayUrl = cleanUrl.length > 25 ? cleanUrl.substring(0, 25) + '...' : cleanUrl;

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

            const iconSvg = isSafe ? ICONS.safe : isSuspicious ? ICONS.warning : ICONS.danger;
            const boxBg = isSafe ? '#064E3B' : isSuspicious ? '#78350F' : '#7F1D1D';
            const boxBorder = isSafe ? '#059669' : isSuspicious ? '#D97706' : '#DC2626';
            const badgeColor = isSafe ? '#34D399' : isSuspicious ? '#FBBF24' : '#F87171';
            const badgeText = isSafe ? 'SECURE' : isSuspicious ? 'CAUTION' : 'BLOCKED';
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
                  borderRadius: 9,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                  marginBottom: index < recentItems.length - 1 ? 3 : 0,
                }}
              >
                {/* Vector SVG Icon Box */}
                <FlexWidget
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    backgroundColor: boxBg,
                    borderColor: boxBorder,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SvgWidget
                    svg={iconSvg}
                    style={{ width: 12, height: 12 }}
                  />
                </FlexWidget>

                {/* Details */}
                <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 6, marginRight: 5 }}>
                  <TextWidget
                    text={displayUrl}
                    maxLines={1}
                    truncate="END"
                    style={{ fontSize: 10, color: '#F8FAFC', fontWeight: 'bold' }}
                  />
                  <TextWidget
                    text={subtitleText}
                    style={{ fontSize: 8, color: subtitleColor, marginTop: 1 }}
                  />
                </FlexWidget>

                {/* Status Pill */}
                <FlexWidget
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: boxBg,
                    borderColor: boxBorder,
                    borderWidth: 1,
                    borderRadius: 6,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                  }}
                >
                  <TextWidget
                    text={badgeText}
                    style={{ fontSize: 8, color: badgeColor, fontWeight: 'bold' }}
                  />
                </FlexWidget>
              </FlexWidget>
            );
          })}

          {/* If only 1 scan exists, companion "New Scan" tile with SVG search icon */}
          {recentItems.length === 1 && (
            <FlexWidget
              style={{
                width: 'match_parent',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#131D31',
                borderColor: '#1E293B',
                borderWidth: 1,
                borderRadius: 9,
                paddingHorizontal: 7,
                paddingVertical: 3,
                marginTop: 3,
              }}
            >
              <FlexWidget
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: '#075985',
                  borderColor: '#0284C7',
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SvgWidget
                  svg={ICONS.search}
                  style={{ width: 12, height: 12 }}
                />
              </FlexWidget>

              <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: 6, marginRight: 5 }}>
                <TextWidget
                  text="Analyze New URL"
                  style={{ fontSize: 10, color: '#F8FAFC', fontWeight: 'bold' }}
                />
                <TextWidget
                  text="Tap to open scanner"
                  style={{ fontSize: 8, color: '#64748B', marginTop: 1 }}
                />
              </FlexWidget>

              <FlexWidget
                style={{
                  backgroundColor: '#0C4A6E',
                  borderRadius: 5,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                }}
              >
                <TextWidget text="SCAN >" style={{ fontSize: 8, color: '#38BDF8', fontWeight: 'bold' }} />
              </FlexWidget>
            </FlexWidget>
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
