import React, { useState } from 'react';
import { TabRoute } from '../types/briefing';
import { USER_AVATAR_URL } from '../data/mockBriefings';

interface HeaderProps {
  activeTab: TabRoute;
  onSelectTab: (tab: TabRoute) => void;
  bookmarkCount: number;
  dateLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  bookmarkCount,
  dateLabel = '전기신문 실시간 RSS 연동',
}) => {
  const [imgError, setImgError] = useState(false);

  const navItems: { id: TabRoute; label: string }[] = [
    { id: 'daily-briefing', label: '오늘의 브리핑' },
    { id: 'bookmarks', label: `북마크 (저장됨 ${bookmarkCount})` },
    { id: 'search-filter', label: '검색' },
    { id: 'system-updates', label: '업데이트 안내' },
  ];

  const mobileNavItems: { id: TabRoute; label: string; icon: string }[] = [
    { id: 'daily-briefing', label: '오늘 브리핑', icon: 'bolt' },
    { id: 'bookmarks', label: '북마크', icon: 'bookmark' },
    { id: 'search-filter', label: '검색', icon: 'search' },
    { id: 'system-updates', label: '아카이브', icon: 'inventory_2' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-card/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-14 lg:h-16 max-w-7xl mx-auto px-gutter-mobile sm:px-gutter flex items-center justify-between gap-space-sm">
          {/* Left: Brand + Timestamp */}
          <div className="flex items-center gap-space-md min-w-0">
            <button
              type="button"
              onClick={() => onSelectTab('daily-briefing')}
              className="flex items-center gap-space-sm text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-lg min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-sm shrink-0">
                <span className="material-symbols-outlined text-volt-amber text-[20px]">bolt</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[15px] sm:text-[16px] leading-[20px] font-bold text-primary tracking-tight whitespace-nowrap truncate">
                  전기 데일리 브리핑
                </span>
                <span className="text-[11px] leading-[14px] font-semibold tracking-[0.04em] text-neutral-slate-600 hidden sm:inline-block whitespace-nowrap">
                  Daily Electric Briefing
                </span>
              </div>
            </button>

            <div className="hidden xl:flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-full text-on-surface-variant whitespace-nowrap shrink-0">
              <span className="material-symbols-outlined text-[15px] text-electric-blue-dark">schedule</span>
              <span className="text-[11px] leading-[14px] font-bold tracking-[0.02em] tabular-nums">
                {dateLabel}
              </span>
            </div>
          </div>

          {/* Center: Desktop Primary Navigation */}
          <nav
            aria-label="주 메뉴"
            className="hidden lg:flex items-center gap-1 p-1 bg-surface-container-low rounded-xl shrink-0"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelectTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-[14px] leading-[20px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Partner Badge & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-space-sm shrink-0">
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-secondary-fixed/50 text-on-secondary-fixed rounded-lg whitespace-nowrap shrink-0">
              <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-secondary">rss_feed</span>
              <span className="text-[11px] leading-[14px] font-bold">
                <span className="sm:hidden">실시간 RSS</span>
                <span className="hidden sm:inline">전기신문 RSS 연동</span>
              </span>
            </div>

            <button
              type="button"
              aria-label="기사 검색"
              onClick={() => onSelectTab('search-filter')}
              className={`hidden sm:inline-flex p-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'search-filter'
                  ? 'bg-secondary-fixed/60 text-secondary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>

            <button
              type="button"
              aria-label="북마크 확인"
              onClick={() => onSelectTab('bookmarks')}
              className={`relative hidden sm:inline-flex p-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'bookmarks'
                  ? 'bg-secondary-fixed/60 text-secondary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">bookmark</span>
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-secondary text-on-secondary text-[10px] rounded-full flex items-center justify-center font-bold tabular-nums">
                {bookmarkCount}
              </span>
            </button>

            {!imgError ? (
              <img
                alt="사용자 프로필"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-8 h-8 rounded-full object-cover shadow-sm shrink-0 bg-surface-container"
                src={USER_AVATAR_URL}
              />
            ) : (
              <div
                aria-label="사용자 프로필"
                className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[12px] font-bold shadow-sm shrink-0"
              >
                EP
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile / Tablet Bottom Navigation Bar */}
      <nav
        aria-label="모바일 하단 메뉴"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-card/95 backdrop-blur-md border-t border-neutral-slate-200/80 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 grid grid-cols-4 gap-1"
      >
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-neutral-slate-600 hover:bg-surface-container-low'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[20px] ${
                    isActive ? 'material-symbols-filled text-volt-amber' : ''
                  }`}
                >
                  {item.icon}
                </span>
                {item.id === 'bookmarks' && bookmarkCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center tabular-nums ${
                      isActive ? 'bg-volt-amber text-primary' : 'bg-secondary text-on-secondary'
                    }`}
                  >
                    {bookmarkCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-[14px] font-bold mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
