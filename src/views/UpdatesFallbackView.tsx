import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveCategoryKey, Article } from '../types/briefing';
import { ArticleInspectorDrawer } from '../components/ArticleInspectorDrawer';

interface UpdatesFallbackViewProps {
  archiveArticles: Article[];
  yesterdayCoreSummary: { index: string; title: string; body: string }[];
  yesterdayDateLabel: string;
  fetchedAtLabel: string;
  isRefreshing: boolean;
  onRefresh: () => Promise<void> | void;
  bookmarkedIds: string[];
  onToggleBookmark: (article: Article) => void;
  onTagSearch: (tag: string) => void;
}

export const UpdatesFallbackView: React.FC<UpdatesFallbackViewProps> = ({
  archiveArticles,
  yesterdayCoreSummary,
  yesterdayDateLabel,
  fetchedAtLabel,
  isRefreshing,
  onRefresh,
  bookmarkedIds,
  onToggleBookmark,
  onTagSearch,
}) => {
  const [bannerVisible, setBannerVisible] = useState(true);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveCategoryKey>('all');
  const [selectedId, setSelectedId] = useState<string>(archiveArticles[0]?.id || '');
  const [mobileDrawerArticleId, setMobileDrawerArticleId] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(15 * 60);

  useEffect(() => {
    if (archiveArticles.length > 0 && !archiveArticles.some((a) => a.id === selectedId)) {
      setSelectedId(archiveArticles[0].id);
    }
  }, [archiveArticles, selectedId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 15 * 60));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const formattedCountdown = useMemo(() => {
    const h = Math.floor(countdownSeconds / 3600);
    const m = Math.floor((countdownSeconds % 3600) / 60);
    const s = countdownSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  }, [countdownSeconds]);

  const filterTabs = useMemo(() => {
    const counts: Record<ArchiveCategoryKey, number> = {
      all: archiveArticles.length,
      grid: 0,
      market: 0,
      nuclear: 0,
      renewable: 0,
    };
    archiveArticles.forEach((a) => {
      if (a.archiveGroup) counts[a.archiveGroup] += 1;
    });
    return [
      { key: 'all' as const, label: `전체 (${counts.all})` },
      { key: 'grid' as const, label: `계통/망 (${counts.grid})` },
      { key: 'market' as const, label: `시장/경제 (${counts.market})` },
      { key: 'nuclear' as const, label: `원전/정책 (${counts.nuclear})` },
      { key: 'renewable' as const, label: `신재생 (${counts.renewable})` },
    ];
  }, [archiveArticles]);

  const filteredArticles = useMemo(() => {
    if (archiveFilter === 'all') return archiveArticles;
    return archiveArticles.filter((art) => art.archiveGroup === archiveFilter);
  }, [archiveArticles, archiveFilter]);

  const selectedArticle: Article | null = useMemo(() => {
    return archiveArticles.find((a) => a.id === selectedId) || archiveArticles[0] || null;
  }, [archiveArticles, selectedId]);

  const mobileDrawerArticle: Article | null = useMemo(() => {
    if (!mobileDrawerArticleId) return null;
    return archiveArticles.find((a) => a.id === mobileDrawerArticleId) || null;
  }, [archiveArticles, mobileDrawerArticleId]);

  return (
    <div className="flex flex-col w-full">
      {/* Top Notification Banner */}
      {bannerVisible && (
        <div className="w-full bg-status-warning-bg border border-status-warning-border rounded-xl p-space-md shadow-sm mb-space-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex items-start sm:items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-volt-amber/20 flex items-center justify-center shrink-0 text-status-warning-text">
                <span className="material-symbols-outlined text-[24px]">pending_actions</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] font-semibold text-status-warning-text tracking-tight">
                    전기신문 RSS 수집 아카이브 및 갱신 현황 안내
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-volt-amber/25 text-status-warning-text text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-volt-amber" />
                    실시간 RSS 동기화 완료
                  </span>
                </div>
                <p className="text-[14px] leading-[22px] text-status-warning-text/90 mt-0.5">
                  오늘 브리핑 외에 함께 수집된 직전 발행분({yesterdayDateLabel || '직전 아카이브'})을
                  이곳에서 확인할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-space-sm shrink-0 self-end lg:self-center">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card/80 text-status-warning-text shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-volt-amber">alarm</span>
                <span className="text-[13px] font-semibold tabular-nums">{fetchedAtLabel}</span>
              </div>
              <button
                type="button"
                disabled={isRefreshing}
                onClick={onRefresh}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-warning-text text-on-primary text-[13px] font-semibold hover:bg-neutral-slate-900 transition-colors shadow-sm cursor-pointer whitespace-nowrap ${
                  isRefreshing ? 'opacity-75' : ''
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                >
                  sync
                </span>
                <span>{isRefreshing ? '새로고침 중...' : '지금 새로고침'}</span>
              </button>
              <button
                type="button"
                aria-label="배너 닫기"
                onClick={() => setBannerVisible(false)}
                className="p-1.5 rounded-lg text-status-warning-text hover:bg-volt-amber/20 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="relative w-full flex flex-col xl:flex-row gap-space-lg items-start">
        <div className="flex-1 w-full flex flex-col gap-space-lg">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm pb-space-xs">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-sm mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-slate-600">
                  Archived Dispatch
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-neutral-slate-600 text-[11px] font-bold">
                  전기신문 추가 아카이브
                </span>
              </div>
              <h1 className="text-[24px] sm:text-[32px] leading-[32px] sm:leading-[40px] font-extrabold tracking-[-0.02em] text-primary">
                {yesterdayDateLabel || '직전 발행 브리핑'} 아카이브
              </h1>
            </div>
            <div className="flex items-center gap-space-xs text-neutral-slate-600 text-[13px] tabular-nums">
              <span className="material-symbols-outlined text-[16px] text-volt-amber">history</span>
              <span>실시간 RSS 아카이브 {archiveArticles.length}건 연동됨</span>
            </div>
          </div>

          {/* Yesterday Core Summary */}
          {yesterdayCoreSummary.length > 0 && (
            <div className="relative w-full bg-surface-card rounded-xl p-4 sm:p-space-lg shadow-sm overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-volt-amber via-energy-cyan to-secondary" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
                <div className="flex items-center gap-space-sm">
                  <div className="w-7 h-7 rounded-lg bg-volt-amber/15 flex items-center justify-center text-volt-amber shrink-0">
                    <span className="material-symbols-outlined text-[18px]">electric_bolt</span>
                  </div>
                  <span className="text-[17px] sm:text-[18px] font-bold text-primary tracking-tight">
                    아카이브 핵심 3줄 종합 브리핑
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-slate-600 bg-surface-container-low px-2.5 py-1 rounded-full self-start sm:self-center">
                  <span className="material-symbols-outlined text-[15px] text-secondary">
                    psychology
                  </span>
                  <span>전기신문 RSS 기반 요약</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-space-sm pt-space-xs">
                {yesterdayCoreSummary.map((item) => (
                  <div
                    key={item.index}
                    className="flex items-start gap-3 sm:gap-space-md p-3 sm:p-space-sm rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low transition-colors"
                  >
                    <span className="text-[19px] sm:text-[22px] leading-none text-secondary font-black shrink-0 mt-1 tabular-nums">
                      {item.index}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[15.5px] sm:text-[16px] leading-[23px] font-semibold text-primary">
                        {item.title}
                      </span>
                      <p className="text-[14px] leading-[22px] text-on-surface-variant mt-1">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Monitor Card */}
          <div className="w-full bg-primary-container text-on-primary rounded-xl p-space-md shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/10 flex items-center justify-center text-volt-amber shrink-0">
                  <span className="material-symbols-outlined text-[24px]">terminal</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[16px] font-semibold text-on-primary tracking-tight">
                      수집 파이프라인 관제 현황
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-container-lowest/20 text-volt-amber text-[11px] font-semibold">
                      Electimes RSS + Gemini 4 연동
                    </span>
                  </div>
                  <p className="text-[13px] text-on-primary-container mt-0.5">
                    전기신문 섹션별 RSS 피드(S1N41~S1N47)를 15분 캐시 주기로 실시간 수집 및 요약합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-space-lg shrink-0 self-start md:self-center bg-surface-container-lowest/5 px-space-md py-2 rounded-lg tabular-nums">
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-bold text-on-primary-container uppercase">
                    캐시 만료까지
                  </span>
                  <span className="text-[16px] font-mono font-bold text-on-primary">
                    {formattedCountdown}
                  </span>
                </div>
                <div className="h-6 w-px bg-surface-container-lowest/15" />
                <div className="flex flex-col items-start">
                  <span className="text-[11px] font-bold text-on-primary-container uppercase">
                    연동 상태
                  </span>
                  <span className="text-[15px] font-semibold text-volt-amber flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-volt-amber" />
                    CONNECTED
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Archive Article Grid */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs">
            <div className="flex items-center gap-space-sm">
              <h2 className="text-[22px] sm:text-[24px] font-bold text-primary tracking-tight">
                추가 수집 기사 <span className="text-secondary">{archiveArticles.length}건</span>
              </h2>
              <span className="text-[11px] font-bold text-neutral-slate-600 bg-surface-container-high px-2 py-0.5 rounded-full">
                실시간 RSS 기준
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {filterTabs.map((tab) => {
                const isActive = archiveFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setArchiveFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-high text-neutral-slate-600 hover:bg-surface-container'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {filteredArticles.map((art) => {
              const isSelected = selectedArticle?.id === art.id;
              const isBookmarked = bookmarkedIds.includes(art.id);

              return (
                <div
                  key={art.id}
                  onClick={() => {
                    setSelectedId(art.id);
                    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
                      setMobileDrawerArticleId(art.id);
                    }
                  }}
                  className={`group relative bg-surface-card rounded-xl p-4 sm:p-space-md transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-secondary bg-surface-container-low/30 shadow-md'
                      : 'shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between gap-space-sm mb-space-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[15px] font-black text-secondary tabular-nums">
                          {String(art.rankNum).padStart(2, '0')}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-neutral-slate-600 text-[11px] font-bold whitespace-nowrap">
                          {art.categoryName}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-slate-600 truncate tabular-nums">
                          {art.timeLabel}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="북마크"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(art);
                        }}
                        className={`p-1.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer ${
                          isBookmarked
                            ? 'text-volt-amber'
                            : 'text-outline-variant hover:text-volt-amber'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            isBookmarked ? 'material-symbols-filled' : ''
                          }`}
                        >
                          bookmark
                        </span>
                      </button>
                    </div>

                    <h3 className="text-[17px] sm:text-[18px] leading-[25px] font-bold text-primary group-hover:text-secondary transition-colors line-clamp-3 sm:line-clamp-2">
                      {art.title}
                    </h3>

                    <div className="mt-space-sm space-y-2 sm:space-y-1.5 bg-surface-container-low/50 p-3 sm:p-2.5 rounded-lg text-on-surface-variant text-[14px] sm:text-[13px] leading-[22px] sm:leading-[19px]">
                      {art.summary.map((line, i) => (
                        <p key={i} className="line-clamp-2">
                          <strong className="text-primary font-bold text-[12px] mr-1">
                            {i === 0 ? '①' : i === 1 ? '②' : '③'}
                          </strong>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="mt-space-md pt-space-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {art.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded bg-surface-container-high text-electric-blue-dark text-[12px] sm:text-[11px] font-bold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="material-symbols-outlined text-outline text-[18px] group-hover:translate-x-1 transition-transform group-hover:text-secondary">
                      arrow_forward
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Persistent Inspector (Desktop xl+) */}
        {selectedArticle && (
          <aside className="hidden xl:flex w-full xl:w-[440px] shrink-0 sticky top-20 bg-surface-card rounded-xl p-space-lg shadow-sm flex-col gap-space-md transition-all">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-[15px] font-semibold text-primary">
                  기사 3문장 심층 인스펙터
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold tabular-nums">
                  {selectedArticle.rank}
                </span>
                <span className="text-[11px] font-bold text-neutral-slate-600">
                  {selectedArticle.timeLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-neutral-slate-600 text-[11px] font-bold">
                  {selectedArticle.categoryName}
                </span>
                <span className="text-[11px] font-bold text-neutral-slate-600 tabular-nums">
                  {selectedArticle.publishedAt}
                </span>
              </div>
              <h4 className="text-[18px] leading-[26px] font-bold text-primary">
                {selectedArticle.title}
              </h4>
            </div>

            <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center gap-1.5 text-volt-amber">
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span className="text-[13px] font-bold text-primary">요약문</span>
              </div>
              <div className="space-y-space-sm">
                {selectedArticle.summary.map((sentence, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="text-[15px] text-secondary font-black shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <p className="text-[14px] leading-[22px] text-neutral-slate-600">{sentence}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-space-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-slate-600">
                핵심 연관 키워드
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedArticle.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onTagSearch(tag.replace(/^#/, ''))}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-high text-electric-blue-dark text-[13px] font-semibold hover:bg-secondary-fixed transition-colors cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-space-xs flex flex-col gap-space-xs">
              <a
                href={selectedArticle.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-space-md rounded-lg bg-primary text-on-primary text-[15px] font-semibold hover:bg-electric-blue-dark transition-colors shadow-sm"
              >
                <span>전기신문 원문 기사 확인</span>
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              </a>
              <div className="flex items-center justify-between text-neutral-slate-600 text-[12px] px-1 tabular-nums">
                <span>기사 번호: {selectedArticle.articleCode}</span>
                <span className="text-secondary font-semibold">electimes.com</span>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile / Tablet Overlay Inspector */}
      <div className="xl:hidden">
        <ArticleInspectorDrawer
          article={mobileDrawerArticle}
          isOpen={Boolean(mobileDrawerArticle)}
          mode="overlay"
          isBookmarked={
            mobileDrawerArticle ? bookmarkedIds.includes(mobileDrawerArticle.id) : false
          }
          onToggleBookmark={(id) => {
            const found = archiveArticles.find((a) => a.id === id);
            if (found) onToggleBookmark(found);
          }}
          onClose={() => setMobileDrawerArticleId(null)}
          onTagClick={(tag) => {
            setMobileDrawerArticleId(null);
            onTagSearch(tag);
          }}
          onSelectRelated={(id) => setMobileDrawerArticleId(id)}
        />
      </div>
    </div>
  );
};
