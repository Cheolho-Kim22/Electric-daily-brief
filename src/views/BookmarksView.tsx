import React, { useMemo, useState } from 'react';
import { Article, CategoryKey } from '../types/briefing';
import { ArticleInspectorDrawer } from '../components/ArticleInspectorDrawer';

interface BookmarksViewProps {
  bookmarkedArticles: Article[];
  allArticles: Article[];
  onToggleBookmark: (article: Article) => void;
  onClearAllBookmarks: () => void;
  onGoToDailyBriefing: () => void;
  onTagSearch: (tag: string) => void;
}

type SortMode = 'recent' | 'date' | 'category';

const SECTION_COLORS: Record<Exclude<CategoryKey, 'all'>, { stroke: string; dot: string }> = {
  energy: { stroke: 'stroke-secondary', dot: 'bg-secondary' },
  carbon: { stroke: 'stroke-energy-cyan', dot: 'bg-energy-cyan' },
  economy: { stroke: 'stroke-volt-amber', dot: 'bg-volt-amber' },
  plant: { stroke: 'stroke-primary', dot: 'bg-primary' },
  esite: { stroke: 'stroke-electric-blue-dark', dot: 'bg-electric-blue-dark' },
  people: { stroke: 'stroke-outline', dot: 'bg-outline' },
};

const ACCENT_BAR_COLORS: Record<Exclude<CategoryKey, 'all'>, string> = {
  energy: 'bg-secondary',
  carbon: 'bg-energy-cyan',
  economy: 'bg-volt-amber',
  plant: 'bg-primary',
  esite: 'bg-electric-blue-dark',
  people: 'bg-outline',
};

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  bookmarkedArticles,
  allArticles,
  onToggleBookmark,
  onClearAllBookmarks,
  onGoToDailyBriefing,
  onTagSearch,
}) => {
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [sectionFilter, setSectionFilter] = useState<CategoryKey>('all');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [inspectorArticleId, setInspectorArticleId] = useState<string | null>(null);

  const orderedBookmarks = useMemo(() => {
    return bookmarkedArticles.slice().reverse();
  }, [bookmarkedArticles]);

  const displayedArticles = useMemo(() => {
    let list = orderedBookmarks.filter(
      (a) => sectionFilter === 'all' || a.category === sectionFilter
    );
    if (sortMode === 'date') {
      list = [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    } else if (sortMode === 'category') {
      list = [...list].sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'ko'));
    }
    return list;
  }, [orderedBookmarks, sectionFilter, sortMode]);

  const distribution = useMemo(() => {
    const total = orderedBookmarks.length;
    if (total === 0) return [];
    const counts = new Map<
      Exclude<CategoryKey, 'all'>,
      { label: string; count: number; key: Exclude<CategoryKey, 'all'> }
    >();
    orderedBookmarks.forEach((art) => {
      const existing = counts.get(art.category);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(art.category, {
          key: art.category,
          label: art.categoryName,
          count: 1,
        });
      }
    });

    let cumulativePct = 0;
    return Array.from(counts.values()).map((entry) => {
      const pct = Math.round((entry.count / total) * 100);
      const exactPct = (entry.count / total) * 100;
      const offset = -cumulativePct;
      cumulativePct += exactPct;
      return {
        ...entry,
        pct,
        exactPct,
        offset,
        colors: SECTION_COLORS[entry.key] || SECTION_COLORS.energy,
      };
    });
  }, [orderedBookmarks]);

  const inspectorArticle = useMemo(() => {
    if (!inspectorArticleId) return null;
    return (
      orderedBookmarks.find((a) => a.id === inspectorArticleId) ||
      allArticles.find((a) => a.id === inspectorArticleId) ||
      null
    );
  }, [orderedBookmarks, allArticles, inspectorArticleId]);

  const handleToggleById = (id: string) => {
    const found =
      orderedBookmarks.find((a) => a.id === id) || allArticles.find((a) => a.id === id);
    if (found) onToggleBookmark(found);
  };

  const sortLabels: Record<SortMode, string> = {
    recent: '최신 저장순',
    date: '발행 일자순',
    category: '카테고리별',
  };

  const sectionLabels: Record<CategoryKey, string> = {
    all: '전체 섹션 보기',
    energy: '에너지',
    carbon: '탄소중립',
    economy: '전기경제',
    plant: '시공·플랜트',
    esite: 'e-사이트',
    people: '피플',
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pb-space-sm">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="text-[24px] sm:text-[32px] leading-[32px] sm:leading-[40px] font-extrabold tracking-[-0.02em] text-primary">
              내가 저장한 기사 (북마크)
            </h1>
            <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[13px] font-semibold tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              총 {orderedBookmarks.length}건 저장됨
            </span>
          </div>
          <p className="text-[14px] leading-[22px] text-neutral-slate-600 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-volt-amber">lock</span>
            <span>브라우저 로컬 저장소에 안전하게 보관되어 매일 데이터가 갱신되어도 유지됩니다.</span>
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap shrink-0">
          {/* Sort Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => {
                setSortOpen((v) => !v);
                setFilterOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] font-semibold shadow-sm hover:bg-surface-container transition-all whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-neutral-slate-600">
                swap_vert
              </span>
              <span>{sortLabels[sortMode]}</span>
              <span className="material-symbols-outlined text-[16px] text-neutral-slate-600">
                expand_more
              </span>
            </button>
            {sortOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-40 rounded-xl bg-surface-card shadow-xl p-1 z-20 border border-neutral-slate-200/70">
                {(['recent', 'date', 'category'] as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setSortMode(mode);
                      setSortOpen(false);
                    }}
                    className={`w-full text-left px-space-sm py-2 sm:py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                      sortMode === mode
                        ? 'text-on-surface bg-surface-container-low'
                        : 'text-neutral-slate-600 hover:bg-surface-container-low'
                    }`}
                  >
                    {sortLabels[mode]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section Filter Dropdown */}
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => {
                setFilterOpen((v) => !v);
                setSortOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] font-semibold shadow-sm hover:bg-surface-container transition-all whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-neutral-slate-600">
                filter_list
              </span>
              <span>{sectionLabels[sectionFilter]}</span>
              <span className="material-symbols-outlined text-[16px] text-neutral-slate-600">
                expand_more
              </span>
            </button>
            {filterOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-44 rounded-xl bg-surface-card shadow-xl p-1 z-20 border border-neutral-slate-200/70">
                {(Object.keys(sectionLabels) as CategoryKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSectionFilter(key);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-space-sm py-2 sm:py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                      sectionFilter === key
                        ? 'text-on-surface bg-surface-container-low'
                        : 'text-neutral-slate-600 hover:bg-surface-container-low'
                    }`}
                  >
                    {sectionLabels[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {orderedBookmarks.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-error-container text-on-error-container text-[13px] font-semibold shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              <span>북마크 전체 삭제</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Clear Confirmation */}
      {confirmClearOpen && (
        <div className="bg-error-container/50 border border-error/20 rounded-xl p-space-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 text-on-error-container text-[14px] font-semibold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span>저장된 북마크 {orderedBookmarks.length}건을 모두 삭제하시겠습니까?</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setConfirmClearOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-surface-card text-on-surface text-[13px] font-semibold hover:bg-surface-container transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onClearAllBookmarks();
                setConfirmClearOpen(false);
                setInspectorArticleId(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-error text-on-error text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              전체 삭제 확인
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {displayedArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-space-xl rounded-xl bg-surface-card shadow-sm text-center gap-space-md">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-neutral-slate-600">
                <span className="material-symbols-outlined text-[32px]">bookmark_border</span>
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="text-[18px] font-bold text-primary">
                  {orderedBookmarks.length === 0
                    ? '저장된 기사가 없습니다'
                    : '선택한 섹션에 저장된 기사가 없습니다'}
                </h3>
                <p className="text-[13px] text-neutral-slate-600">
                  브리핑 카드의 북마크 아이콘을 누르면 이곳에 모아서 분석할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToDailyBriefing}
                className="px-space-md py-2 rounded-xl bg-primary text-on-primary text-[13px] font-semibold hover:bg-electric-blue-dark transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>오늘의 브리핑 보러가기</span>
              </button>
            </div>
          ) : (
            displayedArticles.map((art) => (
              <article
                key={art.id}
                onClick={() => setInspectorArticleId(art.id)}
                className="group bg-surface-card rounded-xl p-4 sm:p-space-md shadow-sm hover:shadow-md transition-all flex flex-col gap-space-sm relative overflow-hidden cursor-pointer"
              >
                <div
                  className={`w-1.5 absolute left-0 top-0 bottom-0 ${
                    ACCENT_BAR_COLORS[art.category] || 'bg-secondary'
                  }`}
                />
                <div className="flex items-center justify-between gap-space-sm pl-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="px-2.5 py-0.5 rounded bg-primary-container text-on-primary text-[11px] font-bold shrink-0">
                      {art.categoryName}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-slate-600 flex items-center gap-1 tabular-nums truncate">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {art.publishedAt}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(art);
                      }}
                      title="북마크 해제"
                      className="p-1.5 rounded-lg hover:bg-surface-container-low text-volt-amber transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                        bookmark
                      </span>
                    </button>
                    <a
                      href={art.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-secondary hover:bg-surface-container text-[11px] font-bold transition-colors whitespace-nowrap"
                    >
                      <span>원문 보기</span>
                      <span className="material-symbols-outlined text-[14px]">north_east</span>
                    </a>
                  </div>
                </div>

                <div className="pl-2 flex flex-col gap-1.5">
                  <h2 className="text-[17px] sm:text-[18px] leading-[25px] sm:leading-[26px] font-bold text-primary group-hover:text-secondary transition-colors">
                    {art.title}
                  </h2>
                  <p className="text-[14.5px] sm:text-[14px] leading-[23px] sm:leading-[22px] text-on-surface-variant line-clamp-3 sm:line-clamp-2">
                    {art.summary.join(' ')}
                  </p>
                </div>

                <div className="pl-2 pt-1 flex items-center justify-between gap-space-sm flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {art.tags.slice(0, 4).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagSearch(tag.replace(/^#/, ''));
                        }}
                        className="px-2 py-0.5 rounded bg-secondary-fixed/50 text-electric-blue-dark text-[12px] sm:text-[11px] font-bold hover:bg-secondary-fixed transition-colors cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-slate-600 tabular-nums">
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">source</span>
                      {art.sourceLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{art.readMinutes}분 완독</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  pie_chart
                </span>
                <span>저장 기사 섹션 분포</span>
              </span>
              <span className="text-[11px] font-bold text-neutral-slate-600 tabular-nums">
                총 {orderedBookmarks.length}건 기준
              </span>
            </div>

            {distribution.length === 0 ? (
              <div className="py-4 text-center text-[13px] text-neutral-slate-600">
                북마크된 기사를 추가하면 섹션별 비중이 표시됩니다.
              </div>
            ) : (
              <div className="flex items-center gap-space-md">
                <svg className="w-24 h-24 shrink-0 transform -rotate-90" viewBox="0 0 36 36">
                  <circle
                    className="stroke-surface-container"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="14"
                    strokeWidth="4.5"
                  />
                  {distribution.map((seg) => (
                    <circle
                      key={seg.key}
                      className={seg.colors.stroke}
                      cx="18"
                      cy="18"
                      fill="none"
                      r="14"
                      pathLength={100}
                      strokeDasharray={`${seg.exactPct} ${100 - seg.exactPct}`}
                      strokeDashoffset={seg.offset}
                      strokeWidth="4.5"
                    />
                  ))}
                </svg>
                <div className="flex flex-col gap-1.5 w-full text-[11px] font-bold tabular-nums">
                  {distribution.map((seg) => (
                    <div key={seg.key} className="flex items-center justify-between text-on-surface">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${seg.colors.dot}`} />
                        {seg.label}
                      </span>
                      <span>
                        {seg.pct}% ({seg.count}건)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface-card rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">
            <span className="text-[15px] font-semibold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-volt-amber text-[20px]">
                lightbulb
              </span>
              <span>북마크 100% 활용 팁</span>
            </span>
            <ul className="flex flex-col gap-2 text-[13px] leading-[19px] text-neutral-slate-600">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">
                  check_circle
                </span>
                <span>
                  한전·KPX 취업 준비 시 저장해둔{' '}
                  <strong className="text-primary">송배전망·전력시장·원전</strong> 기사를 면접 전
                  포트폴리오로 재검토하세요.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">
                  check_circle
                </span>
                <span>
                  실시간 피드가 다음날 갱신되어도 저장된 기사 본문 요약과 원문 링크는 로컬에
                  그대로 유지됩니다.
                </span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <ArticleInspectorDrawer
        article={inspectorArticle}
        isOpen={Boolean(inspectorArticle)}
        mode="overlay"
        isBookmarked={
          inspectorArticle ? orderedBookmarks.some((a) => a.id === inspectorArticle.id) : false
        }
        onToggleBookmark={handleToggleById}
        onClose={() => setInspectorArticleId(null)}
        onTagClick={onTagSearch}
        onSelectRelated={(id) => setInspectorArticleId(id)}
      />
    </div>
  );
};
