import React, { useMemo, useState } from 'react';
import { Article, CategoryKey, CoreSummaryItem } from '../types/briefing';
import { ArticleInspectorDrawer } from '../components/ArticleInspectorDrawer';

interface DailyBriefingViewProps {
  todayArticles: Article[];
  allArticles: Article[];
  coreSummary: CoreSummaryItem[];
  fetchedAtLabel: string;
  aiEnabled: boolean;
  aiWarning?: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onRefresh: () => void;
  bookmarkedIds: string[];
  onToggleBookmark: (article: Article) => void;
  onTagSearch: (tag: string) => void;
}

const CATEGORY_DEFS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'energy', label: '에너지' },
  { key: 'carbon', label: '탄소중립' },
  { key: 'economy', label: '전기경제' },
  { key: 'plant', label: '시공·플랜트' },
  { key: 'esite', label: 'e-사이트' },
  { key: 'people', label: '피플' },
];

export const DailyBriefingView: React.FC<DailyBriefingViewProps> = ({
  todayArticles,
  allArticles,
  coreSummary,
  fetchedAtLabel,
  aiEnabled,
  aiWarning,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  bookmarkedIds,
  onToggleBookmark,
  onTagSearch,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'rank'>('latest');
  const [showAllToday, setShowAllToday] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: todayArticles.length,
      energy: 0,
      carbon: 0,
      economy: 0,
      plant: 0,
      esite: 0,
      people: 0,
    };
    todayArticles.forEach((art) => {
      counts[art.category] = (counts[art.category] || 0) + 1;
    });
    return counts;
  }, [todayArticles]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = todayArticles.filter((art) => {
      const catMatch = activeCategory === 'all' || art.category === activeCategory;
      if (!catMatch) return false;
      if (!q) return true;
      const haystack = [
        art.title,
        ...art.summary,
        art.insight,
        art.categoryName,
        ...art.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    if (sortOrder === 'rank') {
      list = [...list].sort((a, b) => a.rankNum - b.rankNum);
    }

    if (activeCategory === 'all' && !q && !showAllToday && list.length > 8) {
      return list.slice(0, 8);
    }
    return list;
  }, [todayArticles, activeCategory, searchQuery, sortOrder, showAllToday]);

  const selectedArticle = useMemo(
    () => allArticles.find((a) => a.id === selectedArticleId) || null,
    [allArticles, selectedArticleId]
  );

  const isSplitActive = Boolean(selectedArticle);

  const handleToggleById = (id: string) => {
    const found = allArticles.find((a) => a.id === id);
    if (found) onToggleBookmark(found);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Live Electimes Sync Bar */}
      <div className="w-full bg-surface-container-high rounded-xl p-3 sm:p-space-sm mb-space-md shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-space-sm">
          <div className="flex items-center justify-between sm:justify-start gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-volt-amber shrink-0" />
              <span className="text-[11px] leading-[14px] tracking-[0.04em] text-primary uppercase font-bold">
                전기신문 실시간 RSS 브리핑
              </span>
            </div>
            <span className="text-[11px] sm:text-[13px] text-neutral-slate-600 tabular-nums truncate">
              {fetchedAtLabel}
            </span>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-space-sm text-[12px] sm:text-[13px] font-semibold tabular-nums">
            <div className="flex items-center gap-1.5 bg-surface-card px-2.5 sm:px-space-sm py-1.5 sm:py-1 rounded-lg shadow-sm">
              <span className="text-neutral-slate-600">수집 기사</span>
              <span className="text-primary font-bold">{allArticles.length}건</span>
              <span className="text-electric-blue-dark font-bold">
                {aiEnabled ? 'AI 요약 완료' : '원문 리드'}
              </span>
            </div>
            <button
              type="button"
              disabled={isRefreshing || isLoading}
              onClick={onRefresh}
              className="flex items-center gap-1 bg-surface-card hover:bg-surface-container px-2.5 sm:px-space-sm py-1.5 sm:py-1 rounded-lg shadow-sm text-primary font-bold transition-colors cursor-pointer disabled:opacity-60"
            >
              <span
                className={`material-symbols-outlined text-[16px] text-secondary ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span>{isRefreshing ? '갱신 중...' : '최신 기사 새로고침'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-space-lg bg-error-container/60 border border-error/25 rounded-xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 text-on-error-container text-[14px] font-semibold">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="px-4 py-1.5 rounded-lg bg-error text-on-error text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer self-end sm:self-center"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* AI Warning Banner if Gemini fallback occurred */}
      {aiWarning && !error && (
        <div className="mb-space-lg bg-status-warning-bg border border-status-warning-border rounded-xl p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm text-status-warning-text text-[13px] font-semibold">
          <div className="flex items-start sm:items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 sm:mt-0">
              info
            </span>
            <span>
              전기신문 실제 RSS 기사는 정상 수집되었으나 AI 요약 생성에 일시적 제한이 있어 기사 원문
              발췌로 표시 중입니다. — {aiWarning}
            </span>
          </div>
          <button
            type="button"
            disabled={isRefreshing || isLoading}
            onClick={onRefresh}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-card text-primary border border-status-warning-border text-[12px] font-bold hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-60 self-end sm:self-center"
          >
            <span
              className={`material-symbols-outlined text-[15px] text-secondary ${
                isRefreshing ? 'animate-spin' : ''
              }`}
            >
              refresh
            </span>
            <span>{isRefreshing ? '요약 재시도 중...' : 'AI 요약 다시 시도'}</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-space-lg">
          <div className="bg-surface-card rounded-xl p-space-lg shadow-sm space-y-4 animate-pulse">
            <div className="h-6 w-64 bg-surface-container-high rounded" />
            <div className="h-14 w-full bg-surface-container-low rounded-xl" />
            <div className="h-14 w-full bg-surface-container-low rounded-xl" />
            <div className="h-14 w-full bg-surface-container-low rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-surface-card rounded-xl p-space-md shadow-sm h-52 animate-pulse space-y-3"
              >
                <div className="h-4 w-32 bg-surface-container-high rounded" />
                <div className="h-6 w-full bg-surface-container-high rounded" />
                <div className="h-4 w-5/6 bg-surface-container-low rounded" />
                <div className="h-4 w-4/6 bg-surface-container-low rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className={
            isSplitActive
              ? 'grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start'
              : 'flex flex-col w-full'
          }
        >
          <div
            className={isSplitActive ? 'lg:col-span-7 flex flex-col w-full' : 'flex flex-col w-full'}
          >
            {/* 1. Daily Core Summary Box */}
            {coreSummary.length > 0 && (
              <section className="relative w-full bg-surface-card rounded-xl shadow-sm mb-space-lg overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-volt-amber via-secondary to-electric-blue-dark" />
                <div className="p-4 sm:p-space-lg flex flex-col gap-space-md">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-7 h-7 rounded-lg bg-status-warning-bg flex items-center justify-center text-status-warning-text shadow-sm shrink-0">
                        <span className="material-symbols-outlined material-symbols-filled text-[18px]">
                          bolt
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-[17px] sm:text-[18px] leading-[25px] sm:leading-[26px] font-bold tracking-[-0.01em] text-primary">
                          오늘의 전기 산업 핵심 3줄 브리핑
                        </h1>
                        <span className="bg-secondary-fixed text-on-secondary-fixed text-[11px] leading-[14px] px-2 py-0.5 rounded font-bold whitespace-nowrap">
                          {aiEnabled ? 'Gemini AI 실시간 요약' : '전기신문 주요 헤드라인'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-slate-600 text-[11px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-electric-blue-dark">
                        verified_user
                      </span>
                      <span>electimes.com 실시간 연동</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-space-sm pt-space-xs">
                    {coreSummary.map((item) => (
                      <div
                        key={item.index}
                        className="flex items-start gap-3 sm:gap-space-md bg-surface-container-low p-3.5 sm:p-space-md rounded-xl transition-colors hover:bg-surface-container"
                      >
                        <span className="text-[15px] sm:text-[16px] leading-[25px] text-secondary font-extrabold shrink-0 w-5 sm:w-6 tabular-nums">
                          {item.index}
                        </span>
                        <p className="text-[15px] sm:text-[16px] leading-[25px] sm:leading-[26px] text-on-surface">
                          {item.prefix && (
                            <span className="font-bold text-primary">{item.prefix}</span>
                          )}
                          {item.beforeHighlight}
                          <span
                            className={
                              item.highlightTone === 'amber'
                                ? 'bg-status-warning-bg text-status-warning-text font-semibold px-1 rounded'
                                : 'bg-secondary-fixed/60 text-on-secondary-fixed font-semibold px-1 rounded'
                            }
                          >
                            {item.highlight}
                          </span>
                          {item.afterHighlight}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pt-space-xs text-neutral-slate-600 text-[12px] sm:text-[13px]">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="material-symbols-outlined text-[16px] text-volt-amber shrink-0">
                        update
                      </span>
                      <span>전기신문 RSS 기반 실시간 요약 · 5분 완독 압축 모드</span>
                    </div>
                    <div className="text-neutral-slate-600 text-[12px] sm:text-[13px]">
                      <span>원문 출처: </span>
                      <a
                        href="https://www.electimes.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary underline underline-offset-2 hover:text-secondary transition-colors"
                      >
                        전기신문 (electimes.com)
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 2. Category Filter Bar & Search */}
            <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md mb-space-lg">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {CATEGORY_DEFS.map((cat) => {
                  const count = categoryCounts[cat.key];
                  if (cat.key !== 'all' && count === 0) return null;
                  const isActive = activeCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setActiveCategory(cat.key)}
                      className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container-low text-neutral-slate-600 hover:text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {cat.label}{' '}
                      <span className={`ml-0.5 tabular-nums ${isActive ? 'opacity-80' : ''}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-space-sm shrink-0">
                <div className="relative w-full md:w-56">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-slate-600 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="이슈, 키워드, 기관 검색"
                    className="w-full h-10 pl-9 pr-8 rounded-lg bg-surface-card text-on-surface placeholder:text-neutral-slate-600 text-[13px] shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      aria-label="검색어 초기화"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-slate-600 hover:text-primary cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === 'latest' ? 'rank' : 'latest'))}
                  className="flex items-center gap-1 bg-surface-card px-2.5 h-10 rounded-lg shadow-sm text-[12px] font-bold text-neutral-slate-600 hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">sort</span>
                  <span>{sortOrder === 'latest' ? '속보순' : '중요도순'}</span>
                </button>
              </div>
            </section>

            {/* 3. Article Cards Grid */}
            {filteredArticles.length === 0 ? (
              <div className="bg-surface-card rounded-xl p-space-xl text-center shadow-sm flex flex-col items-center gap-space-sm">
                <span className="material-symbols-outlined text-[36px] text-neutral-slate-600">
                  search_off
                </span>
                <h2 className="text-[18px] font-bold text-primary">
                  일치하는 브리핑 기사가 없습니다
                </h2>
                <p className="text-[14px] text-neutral-slate-600">
                  다른 카테고리나 키워드로 다시 검색해보세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-electric-blue-dark transition-colors cursor-pointer"
                >
                  전체 기사 보기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
                {filteredArticles.map((article) => {
                  const isBookmarked = bookmarkedIds.includes(article.id);
                  const isSelected = selectedArticleId === article.id;

                  return (
                    <article
                      key={article.id}
                      onClick={() => setSelectedArticleId(article.id)}
                      className={`group bg-surface-card rounded-xl p-4 sm:p-space-md transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected ? 'shadow-md ring-2 ring-secondary' : 'shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col gap-space-sm">
                        <div className="flex items-center justify-between gap-space-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-6 h-6 rounded text-[12px] flex items-center justify-center font-bold shrink-0 tabular-nums ${
                                article.rankNum <= 5
                                  ? 'bg-primary-container text-on-primary'
                                  : 'bg-surface-container text-primary'
                              }`}
                            >
                              {article.rank}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                                article.rankNum === 1
                                  ? 'bg-secondary-fixed/60 text-on-secondary-fixed'
                                  : 'bg-surface-container-high text-primary'
                              }`}
                            >
                              {article.categoryName}
                            </span>
                            <span className="text-neutral-slate-600 text-[11px] font-bold whitespace-nowrap tabular-nums truncate">
                              {article.timeLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected && (
                              <span className="hidden sm:inline-flex items-center gap-1 bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                                <span className="material-symbols-outlined text-[13px]">
                                  visibility
                                </span>
                                열람 중
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label={isBookmarked ? '북마크 해제' : '북마크 저장'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleBookmark(article);
                              }}
                              className={`p-1.5 sm:p-1 rounded-lg transition-colors cursor-pointer ${
                                isBookmarked
                                  ? 'text-volt-amber'
                                  : 'text-neutral-slate-600 hover:text-volt-amber'
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
                        </div>

                        <h2 className="text-[17px] sm:text-[18px] leading-[25px] font-bold tracking-[-0.01em] text-primary group-hover:text-secondary transition-colors line-clamp-3 sm:line-clamp-2">
                          {article.title}
                        </h2>

                        <div className="space-y-2 sm:space-y-1.5 pt-1 text-on-surface-variant text-[14px] sm:text-[13px] leading-[22px] sm:leading-[20px]">
                          {article.summary.map((line, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="text-secondary font-bold shrink-0">•</span>
                              <p className="line-clamp-2">{line}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {article.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTagSearch(tag.replace(/^#/, ''));
                              }}
                              className="bg-surface-container-low text-electric-blue-dark text-[12px] sm:text-[11px] font-bold px-2 py-0.5 rounded hover:bg-secondary-fixed/50 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-space-md mt-space-sm border-t border-neutral-slate-200/40 sm:border-t-0 flex items-center justify-between">
                        <span className="text-neutral-slate-600 text-[12px] sm:text-[11px] font-bold flex items-center gap-1 tabular-nums">
                          <span className="material-symbols-outlined text-[15px]">timer</span>
                          {article.readMinutes}분 소요 요약본
                        </span>
                        <span className="text-[13px] sm:text-[14px] font-semibold text-secondary flex items-center gap-0.5 group-hover:translate-x-1 transition-transform py-0.5">
                          상세 요약 및 원문 보기
                          <span className="material-symbols-outlined text-[16px]">
                            chevron_right
                          </span>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Load More */}
            {activeCategory === 'all' &&
              !searchQuery &&
              !showAllToday &&
              todayArticles.length > 8 && (
                <div className="flex items-center justify-center pt-space-xl pb-space-lg">
                  <button
                    type="button"
                    onClick={() => setShowAllToday(true)}
                    className="flex items-center gap-space-sm px-space-lg py-2.5 bg-surface-card hover:bg-surface-container text-primary text-[15px] font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                    <span>
                      전기신문 주요 뉴스 더 불러오기 ({todayArticles.length - 8}건 추가)
                    </span>
                  </button>
                </div>
              )}
          </div>

          {/* Desktop Split-View Inspector */}
          {isSplitActive && (
            <div className="hidden lg:block lg:col-span-5">
              <ArticleInspectorDrawer
                article={selectedArticle}
                isOpen={true}
                mode="docked"
                isBookmarked={selectedArticle ? bookmarkedIds.includes(selectedArticle.id) : false}
                onToggleBookmark={handleToggleById}
                onClose={() => setSelectedArticleId(null)}
                onTagClick={onTagSearch}
                onSelectRelated={(id) => setSelectedArticleId(id)}
              />
            </div>
          )}
        </div>
      )}

      {/* Mobile/Tablet Overlay Inspector */}
      <div className="lg:hidden">
        <ArticleInspectorDrawer
          article={selectedArticle}
          isOpen={Boolean(selectedArticle)}
          mode="overlay"
          isBookmarked={selectedArticle ? bookmarkedIds.includes(selectedArticle.id) : false}
          onToggleBookmark={handleToggleById}
          onClose={() => setSelectedArticleId(null)}
          onTagClick={onTagSearch}
          onSelectRelated={(id) => setSelectedArticleId(id)}
        />
      </div>
    </div>
  );
};
