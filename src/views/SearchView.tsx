import React, { useMemo, useState } from 'react';
import { Article, CategoryKey } from '../types/briefing';
import { GLOSSARY_HINTS } from '../data/mockBriefings';
import { ArticleInspectorDrawer } from '../components/ArticleInspectorDrawer';

interface SearchViewProps {
  allArticles: Article[];
  query: string;
  onQueryChange: (q: string) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (article: Article) => void;
  onGoToUpdates: () => void;
}

const LIVE_TRENDING_KEYWORDS = [
  { term: '한전', label: '한국전력' },
  { term: '원전', label: '원자력' },
  { term: '태양광', label: '태양광' },
  { term: '해상풍력', label: '해상풍력' },
  { term: '전력시장', label: '전력시장' },
  { term: 'ESS', label: 'ESS' },
];

function highlightText(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={idx} className="bg-amber-vivid/30 text-primary px-0.5 rounded font-semibold">
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

export const SearchView: React.FC<SearchViewProps> = ({
  allArticles,
  query,
  onQueryChange,
  bookmarkedIds,
  onToggleBookmark,
  onGoToUpdates,
}) => {
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [deepFilterOpen, setDeepFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all');
  const [inspectorArticleId, setInspectorArticleId] = useState<string | null>(null);
  const [glossaryIndex, setGlossaryIndex] = useState(0);

  const queryMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allArticles.filter((art) => {
      if (categoryFilter !== 'all' && art.category !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [
        art.title,
        ...art.summary,
        art.insight,
        art.categoryName,
        art.reporter,
        ...art.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allArticles, query, categoryFilter]);

  const dateChips = useMemo(() => {
    const counts = new Map<string, number>();
    queryMatches.forEach((art) => {
      counts.set(art.dispatchDate, (counts.get(art.dispatchDate) || 0) + 1);
    });
    const sortedDates = Array.from(counts.keys()).sort((a, b) => b.localeCompare(a)).slice(0, 3);
    return [
      { id: 'all', label: '전체 결과', count: queryMatches.length },
      ...sortedDates.map((d) => ({
        id: d,
        label: `${d.slice(5).replace('-', '월 ')}일 기사`,
        count: counts.get(d) || 0,
      })),
    ];
  }, [queryMatches]);

  const filteredResults = useMemo(() => {
    if (dateFilter === 'all') return queryMatches;
    return queryMatches.filter((a) => a.dispatchDate === dateFilter);
  }, [queryMatches, dateFilter]);

  const inspectorArticle = useMemo(
    () => allArticles.find((a) => a.id === inspectorArticleId) || null,
    [allArticles, inspectorArticleId]
  );

  const handleToggleById = (id: string) => {
    const found = allArticles.find((a) => a.id === id);
    if (found) onToggleBookmark(found);
  };

  const activeGlossary = GLOSSARY_HINTS[glossaryIndex % GLOSSARY_HINTS.length];

  return (
    <div className="flex flex-col w-full">
      {/* Search Control Header */}
      <section className="relative w-full bg-surface-card rounded-xl p-4 sm:p-space-lg shadow-sm mb-space-lg">
        <div className="flex flex-col gap-space-md">
          <form onSubmit={(e) => e.preventDefault()} className="relative flex items-center w-full">
            <div className="absolute left-3 sm:left-space-md flex items-center pointer-events-none text-neutral-slate-600">
              <span className="material-symbols-outlined text-[20px] sm:text-[22px]">search</span>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="키워드 검색 (한전, 원전, 태양광, ESS)"
              className="w-full h-12 sm:h-14 pl-10 sm:pl-12 pr-24 sm:pr-32 rounded-lg bg-surface-container-low text-[15px] sm:text-[16px] font-semibold text-primary placeholder:text-outline focus:outline-none focus:bg-surface-container focus:ring-2 focus:ring-secondary transition-all"
            />
            <div className="absolute right-1.5 sm:right-space-sm flex items-center gap-1 sm:gap-space-xs">
              {query && (
                <button
                  type="button"
                  title="검색어 지우기"
                  onClick={() => onQueryChange('')}
                  className="p-1.5 sm:p-2 rounded-lg text-neutral-slate-600 hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </button>
              )}
              <button
                type="submit"
                className="px-3 sm:px-space-md py-1.5 sm:py-2 rounded-lg bg-primary text-on-primary text-[13px] sm:text-[14px] font-semibold hover:bg-electric-blue-dark transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                검색
              </button>
            </div>
          </form>

          {/* Scope & Stat Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-xs">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="px-space-sm py-0.5 rounded bg-primary-container text-on-primary text-[11px] font-bold">
                실시간 RSS 통합 인덱스
              </span>
              <span className="text-[13px] text-neutral-slate-600">
                제목 + 요약문 + 키워드 태그 실시간 매칭
              </span>
            </div>
            <div className="text-[13px] font-semibold text-primary flex items-center gap-1.5 tabular-nums">
              <span className="inline-block w-2 h-2 rounded-full bg-volt-amber" />
              <span>
                {query.trim() ? `‘${query.trim()}’ ` : '수집된 '}검색 결과 총{' '}
                <strong>{filteredResults.length}</strong>건 발견됨
              </span>
            </div>
          </div>

          {/* Chronological Filter Chips */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-1 pt-space-xs scrollbar-none">
            {dateChips.map((chip) => {
              const isActive = dateFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setDateFilter(chip.id)}
                  className={`px-space-md py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-low text-neutral-slate-600 hover:bg-surface-container hover:text-primary'
                  }`}
                >
                  {chip.label} ({chip.count})
                </button>
              );
            })}
          </div>

          {deepFilterOpen && (
            <div className="pt-space-sm border-t border-neutral-slate-200/60 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-bold text-neutral-slate-600 mr-1">섹션 필터:</span>
              {(
                [
                  { key: 'all', label: '전체 섹션' },
                  { key: 'energy', label: '에너지' },
                  { key: 'carbon', label: '탄소중립' },
                  { key: 'economy', label: '전기경제' },
                  { key: 'plant', label: '시공·플랜트' },
                  { key: 'esite', label: 'e-사이트' },
                  { key: 'people', label: '피플' },
                ] as { key: CategoryKey; label: string }[]
              ).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoryFilter(c.key)}
                  className={`px-2.5 py-1 rounded text-[12px] font-semibold transition-colors cursor-pointer ${
                    categoryFilter === c.key
                      ? 'bg-secondary text-on-secondary'
                      : 'bg-surface-container-low text-neutral-slate-600 hover:bg-surface-container'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg w-full items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-md w-full">
          {filteredResults.length === 0 ? (
            <div className="bg-surface-card rounded-xl p-space-xl text-center shadow-sm flex flex-col items-center gap-space-sm">
              <span className="material-symbols-outlined text-[38px] text-neutral-slate-600">
                manage_search
              </span>
              <h2 className="text-[18px] font-bold text-primary">
                ‘{query}’에 대한 검색 결과가 없습니다
              </h2>
              <p className="text-[14px] text-neutral-slate-600">
                검색어를 지우거나 오른쪽 인기 검색 키워드를 눌러 실시간 기사를 조회해보세요.
              </p>
              <button
                type="button"
                onClick={() => {
                  onQueryChange('');
                  setDateFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-semibold hover:bg-electric-blue-dark transition-colors cursor-pointer"
              >
                전체 기사 보기
              </button>
            </div>
          ) : (
            filteredResults.map((art) => {
              const isBookmarked = bookmarkedIds.includes(art.id);
              return (
                <article
                  key={art.id}
                  onClick={() => setInspectorArticleId(art.id)}
                  className="group relative bg-surface-card rounded-xl p-4 sm:p-space-lg shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="px-space-sm py-0.5 rounded bg-surface-container-low text-electric-blue-dark text-[11px] font-bold">
                          {art.categoryName}
                        </span>
                        <span className="text-outline-variant text-[11px]" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-[11px] font-bold text-neutral-slate-600 tabular-nums">
                          {art.publishedAt}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed text-[11px] font-semibold">
                          전기신문 원문 연동
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="기사 북마크"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(art);
                        }}
                        className={`p-1.5 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer shrink-0 ${
                          isBookmarked ? 'text-volt-amber' : 'text-outline hover:text-volt-amber'
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

                    <h2 className="text-[17px] sm:text-[18px] leading-[25px] sm:leading-[26px] font-bold text-primary group-hover:text-secondary transition-colors tracking-tight">
                      {highlightText(art.title, query)}
                    </h2>

                    <div className="p-3 sm:p-space-sm rounded-lg bg-surface-container-low/60 text-[14.5px] sm:text-[14px] leading-[23px] sm:leading-[22px] text-on-surface-variant">
                      “{highlightText(art.summary[0], query)}”
                    </div>

                    <div className="flex flex-wrap items-center gap-space-xs pt-space-xs">
                      {art.tags.map((tag) => {
                        const matched =
                          query.trim() && tag.toLowerCase().includes(query.trim().toLowerCase());
                        return (
                          <span
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              onQueryChange(tag.replace(/^#/, ''));
                            }}
                            className={`px-space-sm py-0.5 rounded-lg text-[12px] sm:text-[11px] font-bold cursor-pointer transition-colors ${
                              matched
                                ? 'bg-secondary-fixed/60 text-electric-blue-dark'
                                : 'bg-surface-container-low text-neutral-slate-600 hover:bg-surface-container'
                            }`}
                          >
                            {highlightText(tag, query)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-space-sm border-t border-neutral-slate-200/40">
                      <span className="text-[11px] font-bold text-neutral-slate-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-volt-amber">
                          bolt
                        </span>
                        3문장 인스펙터 분석 지원
                      </span>
                      <div className="flex items-center justify-end gap-space-sm w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectorArticleId(art.id);
                          }}
                          className="px-3 sm:px-space-sm py-1.5 sm:py-1 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high text-[12px] font-semibold transition-colors flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>상세 패널 열기</span>
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                        <a
                          href={art.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 sm:px-space-sm py-1.5 sm:py-1 rounded-lg text-secondary hover:text-electric-blue-dark text-[12px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>원문 보기</span>
                          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-neutral-slate-600 text-[13px]">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                info
              </span>
              <span>원하는 섹션만 좁혀서 보고 싶다면 심층 필터를 열어보세요.</span>
            </div>
            <button
              type="button"
              onClick={() => setDeepFilterOpen((prev) => !prev)}
              className="font-semibold text-secondary hover:underline shrink-0 text-left sm:text-right cursor-pointer"
            >
              {deepFilterOpen ? '심층 필터 닫기' : '심층 필터 열기'}
            </button>
          </div>
        </div>

        {/* Side Utility Panel */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md w-full">
          <div className="bg-surface-card rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-neutral-slate-200/50">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-volt-amber text-[20px]">
                  trending_up
                </span>
                <h3 className="text-[16px] font-semibold text-primary">추천 검색 키워드</h3>
              </div>
              <span className="text-[11px] font-bold text-neutral-slate-600">클릭 시 필터링</span>
            </div>
            <p className="text-[13px] leading-[19px] text-neutral-slate-600 mb-space-md">
              전력산업 핵심 키워드를 선택해 전기신문 실시간 기사를 빠르게 찾아보세요.
            </p>
            <div className="flex flex-wrap gap-space-xs">
              {LIVE_TRENDING_KEYWORDS.map((kw) => {
                const matchCount = allArticles.filter((a) =>
                  [a.title, ...a.summary, ...a.tags]
                    .join(' ')
                    .toLowerCase()
                    .includes(kw.term.toLowerCase())
                ).length;
                return (
                  <button
                    key={kw.term}
                    type="button"
                    onClick={() => onQueryChange(kw.term)}
                    className="group flex items-center gap-1 px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-primary hover:text-on-primary text-neutral-slate-900 transition-all text-[13px] font-semibold cursor-pointer tabular-nums"
                  >
                    <span className="text-secondary group-hover:text-volt-amber font-bold">#</span>
                    <span>{kw.label}</span>
                    <span className="text-[11px] text-neutral-slate-600 group-hover:text-surface-dim ml-0.5">
                      {matchCount}건
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-card rounded-xl p-space-lg shadow-sm">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-energy-cyan text-[20px]">
                  insights
                </span>
                <h3 className="text-[16px] font-semibold text-primary">수집 피드 현황</h3>
              </div>
              <span className="text-[11px] font-bold text-secondary">Electimes RSS</span>
            </div>
            <div className="flex flex-col gap-space-sm tabular-nums">
              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <span className="text-[13px] text-neutral-slate-600">전체 색인 기사</span>
                <span className="text-[15px] font-bold text-primary">{allArticles.length}건</span>
              </div>
              <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between">
                <span className="text-[13px] text-neutral-slate-600">연동 섹션 수</span>
                <span className="text-[15px] font-bold text-primary">6개 전문 섹션</span>
              </div>
            </div>
            <div className="mt-space-sm text-center">
              <button
                type="button"
                onClick={onGoToUpdates}
                className="text-[12px] font-bold text-secondary hover:text-electric-blue-dark transition-colors inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>아카이브 및 수집 파이프라인 보기</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="bg-primary-container rounded-xl p-space-lg text-on-primary shadow-sm">
            <div className="flex items-center justify-between mb-space-xs">
              <div className="flex items-center gap-space-xs text-volt-amber">
                <span className="material-symbols-outlined text-[20px]">help_center</span>
                <span className="text-[15px] font-semibold">용어 힌트</span>
              </div>
              <button
                type="button"
                onClick={() => setGlossaryIndex((i) => (i + 1) % GLOSSARY_HINTS.length)}
                className="text-[11px] font-semibold text-primary-fixed hover:text-on-primary transition-colors cursor-pointer flex items-center gap-0.5"
              >
                <span>다음 용어</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
            <h4 className="text-[16px] font-bold text-on-primary mb-1">{activeGlossary.term}</h4>
            <p className="text-[13px] leading-[20px] text-neutral-slate-200 mb-space-sm">
              {activeGlossary.description}
            </p>
            <div className="flex items-center justify-between text-[11px] font-bold text-on-primary-container">
              <span>{activeGlossary.subtitle}</span>
              <span>{activeGlossary.badge}</span>
            </div>
          </div>
        </aside>
      </div>

      <ArticleInspectorDrawer
        article={inspectorArticle}
        isOpen={Boolean(inspectorArticle)}
        mode="overlay"
        isBookmarked={inspectorArticle ? bookmarkedIds.includes(inspectorArticle.id) : false}
        onToggleBookmark={handleToggleById}
        onClose={() => setInspectorArticleId(null)}
        onTagClick={(tag) => {
          setInspectorArticleId(null);
          onQueryChange(tag);
        }}
        onSelectRelated={(id) => setInspectorArticleId(id)}
      />
    </div>
  );
};
