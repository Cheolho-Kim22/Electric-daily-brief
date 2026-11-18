import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DailyBriefingView } from './views/DailyBriefingView';
import { BookmarksView } from './views/BookmarksView';
import { SearchView } from './views/SearchView';
import { UpdatesFallbackView } from './views/UpdatesFallbackView';
import { Article, LiveBriefingResponse, TabRoute } from './types/briefing';

const BOOKMARKS_STORAGE_KEY = 'deb_live_bookmarks_v1';

function loadSavedBookmarks(): Article[] {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string');
    }
  } catch {
    // Ignore storage read errors
  }
  return [];
}

function formatKstTimeLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const dateStr = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(d);
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return `${dateStr} · ${timeStr} KST 갱신`;
  } catch {
    return '전기신문 실시간 RSS 갱신';
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabRoute>('daily-briefing');
  const [bookmarkedArticles, setBookmarkedArticles] = useState<Article[]>(loadSavedBookmarks);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [briefing, setBriefing] = useState<LiveBriefingResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const url = forceRefresh ? '/api/briefing?refresh=1' : '/api/briefing';
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `서버 응답 오류 (${res.status})`);
      }
      setBriefing(data as LiveBriefingResponse);
      if (forceRefresh) {
        setToastMessage(
          `전기신문 최신 기사 ${(data.todayArticles?.length || 0) + (data.archiveArticles?.length || 0)}건을 새로 불러왔습니다.`
        );
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : '전기신문 실시간 기사를 불러오는 중 오류가 발생했습니다.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing(false);
  }, [fetchBriefing]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarkedArticles));
    } catch {
      // Ignore storage quota errors
    }
  }, [bookmarkedArticles]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const bookmarkedIds = useMemo(
    () => bookmarkedArticles.map((a) => a.id),
    [bookmarkedArticles]
  );

  const allLiveArticles = useMemo(() => {
    const map = new Map<string, Article>();
    for (const art of briefing?.todayArticles || []) {
      map.set(art.id, art);
    }
    for (const art of briefing?.archiveArticles || []) {
      if (!map.has(art.id)) map.set(art.id, art);
    }
    for (const art of bookmarkedArticles) {
      if (!map.has(art.id)) map.set(art.id, art);
    }
    return Array.from(map.values());
  }, [briefing, bookmarkedArticles]);

  const handleToggleBookmark = useCallback(
    (article: Article) => {
      setBookmarkedArticles((prev) => {
        const exists = prev.some((a) => a.id === article.id);
        if (exists) {
          showToast('북마크에서 제거되었습니다.');
          return prev.filter((a) => a.id !== article.id);
        }
        showToast('기사가 북마크에 저장되었습니다.');
        return [...prev, article];
      });
    },
    [showToast]
  );

  const handleClearAllBookmarks = useCallback(() => {
    setBookmarkedArticles([]);
    showToast('저장된 북마크가 모두 삭제되었습니다.');
  }, [showToast]);

  const handleTagSearch = useCallback((tag: string) => {
    setSearchQuery(tag);
    setActiveTab('search-filter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectTab = useCallback((tab: TabRoute) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const fetchedAtLabel = useMemo(() => {
    if (!briefing?.fetchedAt) return '전기신문 실시간 RSS 연동 중...';
    return formatKstTimeLabel(briefing.fetchedAt);
  }, [briefing]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface overflow-x-clip">
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        bookmarkCount={bookmarkedArticles.length}
        dateLabel={fetchedAtLabel}
      />

      <main className="w-full pt-14 lg:pt-16 flex-1">
        <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter py-space-md sm:py-space-lg">
          {activeTab === 'daily-briefing' && (
            <DailyBriefingView
              todayArticles={briefing?.todayArticles || []}
              allArticles={allLiveArticles}
              coreSummary={briefing?.coreSummary || []}
              fetchedAtLabel={fetchedAtLabel}
              aiEnabled={Boolean(briefing?.aiEnabled)}
              aiWarning={briefing?.aiWarning}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              error={error}
              onRefresh={() => fetchBriefing(true)}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onTagSearch={handleTagSearch}
            />
          )}

          {activeTab === 'bookmarks' && (
            <BookmarksView
              bookmarkedArticles={bookmarkedArticles}
              allArticles={allLiveArticles}
              onToggleBookmark={handleToggleBookmark}
              onClearAllBookmarks={handleClearAllBookmarks}
              onGoToDailyBriefing={() => handleSelectTab('daily-briefing')}
              onTagSearch={handleTagSearch}
            />
          )}

          {activeTab === 'search-filter' && (
            <SearchView
              allArticles={allLiveArticles}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onGoToUpdates={() => handleSelectTab('system-updates')}
            />
          )}

          {activeTab === 'system-updates' && (
            <UpdatesFallbackView
              archiveArticles={briefing?.archiveArticles || []}
              yesterdayCoreSummary={briefing?.yesterdayCoreSummary || []}
              yesterdayDateLabel={briefing?.yesterdayDateLabel || ''}
              fetchedAtLabel={fetchedAtLabel}
              isRefreshing={isRefreshing}
              onRefresh={() => fetchBriefing(true)}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onTagSearch={handleTagSearch}
            />
          )}
        </div>
      </main>

      <Footer />

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-20 lg:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 transition-all duration-200 pointer-events-none flex items-center justify-center sm:justify-start gap-space-sm bg-primary text-on-primary px-space-md py-space-sm rounded-xl shadow-xl ${
          toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        <span className="material-symbols-outlined material-symbols-filled text-volt-amber text-[20px]">
          bookmark
        </span>
        <span className="text-[13px] font-medium text-on-primary">{toastMessage}</span>
      </div>
    </div>
  );
}
