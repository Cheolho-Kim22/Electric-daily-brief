import React, { useEffect } from 'react';
import { Article } from '../types/briefing';

interface ArticleInspectorDrawerProps {
  article: Article | null;
  isOpen: boolean;
  mode?: 'overlay' | 'docked';
  isBookmarked: boolean;
  onToggleBookmark: (articleId: string) => void;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
  onSelectRelated?: (articleId: string) => void;
}

export const ArticleInspectorDrawer: React.FC<ArticleInspectorDrawerProps> = ({
  article,
  isOpen,
  mode = 'overlay',
  isBookmarked,
  onToggleBookmark,
  onClose,
  onTagClick,
  onSelectRelated,
}) => {
  useEffect(() => {
    if (!isOpen || mode !== 'overlay') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, mode, onClose]);

  if (!article) return null;

  const bodyContent = (
    <>
      {/* Title & Reporter */}
      <div className="space-y-space-xs">
        <div className="flex items-center gap-1.5 text-[12px] sm:text-[11px] text-secondary font-bold">
          <span className="material-symbols-outlined text-[16px]">campaign</span>
          <span>{article.kicker || `${article.sourceLabel} 브리핑`}</span>
        </div>
        <h2 className="text-[20px] sm:text-[24px] leading-[29px] sm:leading-[32px] font-bold tracking-[-0.015em] text-primary">
          {article.title}
        </h2>
        <div className="flex items-center gap-2 pt-1 text-[13px] text-neutral-slate-600 flex-wrap">
          <span>{article.reporter}</span>
          <span aria-hidden="true">·</span>
          <span className="text-electric-blue-dark text-[11px] font-bold bg-secondary-fixed/40 px-2 py-0.5 rounded">
            신뢰도 검증 완료 기사
          </span>
        </div>
      </div>

      {/* Key Metrics Strip (if available) */}
      {article.metrics && article.metrics.length > 0 && (
        <div className="rounded-xl bg-surface-container-low p-3.5 sm:p-space-md flex items-center justify-between gap-space-sm">
          {article.metrics.map((metric, idx) => (
            <React.Fragment key={metric.label}>
              {idx > 0 && <div className="h-8 w-px bg-surface-container-highest shrink-0" />}
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-neutral-slate-600">{metric.label}</span>
                <span
                  className={`text-[15px] sm:text-[18px] leading-[24px] font-bold tabular-nums truncate ${
                    metric.accent === 'secondary'
                      ? 'text-secondary'
                      : metric.accent === 'blue'
                      ? 'text-electric-blue-dark'
                      : 'text-primary'
                  }`}
                >
                  {metric.value}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* AI 3-Sentence Summary Box */}
      <div className="bg-neutral-slate-50 rounded-xl p-4 sm:p-space-md space-y-space-sm border border-neutral-slate-200/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-volt-amber">
            <span className="material-symbols-outlined material-symbols-filled text-[18px]">
              auto_awesome
            </span>
            <span className="text-[15px] font-bold text-neutral-slate-900">AI 핵심 3문장 요약</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-surface-card text-[11px] font-bold text-neutral-slate-600 shadow-2xs shrink-0">
            5분 핵심 캐치
          </span>
        </div>
        <ol className="space-y-3 pt-1">
          {article.summary.map((sentence, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-[15px] sm:text-[14px] leading-[24px] sm:leading-[22px] text-neutral-slate-900"
            >
              <span className="w-5 h-5 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 tabular-nums">
                {idx + 1}
              </span>
              <p>{sentence}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Industry Insight or Exam Tip */}
      <div className="space-y-2">
        <h3 className="text-[15px] font-bold text-primary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-secondary">insights</span>
          <span>전력 실무자 핵심 분석 포인트</span>
        </h3>
        <p className="text-[14px] sm:text-[13px] leading-[22px] sm:leading-[20px] text-neutral-slate-600 bg-surface-container-low p-3 sm:p-space-sm rounded-lg">
          {article.insight}
        </p>
        {article.examTip && (
          <div className="p-3 sm:p-space-sm rounded-lg bg-status-warning-bg text-status-warning-text text-[14px] sm:text-[13px] leading-[22px] sm:leading-[20px]">
            <span className="font-bold mr-1">취업 · 실무 팁:</span>
            {article.examTip}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-space-xs">
        <span className="text-[11px] font-bold text-neutral-slate-600 uppercase tracking-wider">
          핵심 용어 및 키워드 태그
        </span>
        <div className="flex flex-wrap gap-1.5">
          {article.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick?.(tag.replace(/^#/, ''))}
              className="px-2.5 py-1 rounded bg-secondary-fixed/40 text-electric-blue-dark hover:bg-secondary-fixed text-[13px] font-semibold transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Outbound CTA */}
      <div className="space-y-space-xs pt-2">
        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-primary-container text-on-primary hover:bg-electric-blue-dark text-[15px] font-semibold py-3.5 sm:py-3 px-space-md rounded-xl shadow-md transition-all flex items-center justify-center gap-space-sm group"
        >
          <span className="material-symbols-outlined text-[20px] text-volt-amber">newspaper</span>
          <span>전기신문 원문 기사 읽기</span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
            open_in_new
          </span>
        </a>
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-neutral-slate-600 px-1">
          <span className="truncate">{article.sourceUrl.replace(/^https?:\/\//, '')}</span>
          <span className="shrink-0 text-secondary">공식 제휴 원문</span>
        </div>
        <p className="text-[12px] leading-[18px] text-neutral-slate-600 bg-surface-container-low p-2.5 rounded-lg">
          ※ 본 서비스는 전기신문 기사의 요약본을 제공하며, 저작권 및 전문은 원문 언론사에 있습니다.
        </p>
      </div>

      {/* Related Briefings */}
      {article.related && article.related.length > 0 && (
        <div className="pt-space-sm border-t border-surface-container-high space-y-space-sm">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-semibold text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">recommend</span>
              <span>연관 추천 브리핑</span>
            </span>
            <span className="text-[11px] font-bold text-neutral-slate-600">
              관련 맥락 기사 {article.related.length}건
            </span>
          </div>
          <div className="space-y-space-xs">
            {article.related.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => rel.targetArticleId && onSelectRelated?.(rel.targetArticleId)}
                className="w-full text-left block p-3 sm:p-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-electric-blue-dark">{rel.kicker}</span>
                  <span className="text-[11px] font-bold text-neutral-slate-600">{rel.timeLabel}</span>
                </div>
                <p className="text-[15px] leading-[22px] font-semibold text-neutral-slate-900 group-hover:text-secondary line-clamp-2 transition-colors">
                  {rel.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-neutral-slate-600">
                  <span>{rel.coreTag}</span>
                  <span aria-hidden="true">·</span>
                  <span>{rel.readTime}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const headerBar = (
    <div className="flex items-center justify-between gap-2 pb-space-sm border-b border-surface-container-high">
      <div className="flex items-center gap-space-sm min-w-0">
        <span className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-bold tracking-wide whitespace-nowrap shrink-0">
          {article.categoryName}
        </span>
        <span className="text-[11px] font-bold text-neutral-slate-600 flex items-center gap-1 whitespace-nowrap truncate tabular-nums">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          {article.publishedAt}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleBookmark(article.id)}
          title={isBookmarked ? '북마크 해제' : '북마크 저장'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-[12px] font-bold whitespace-nowrap ${
            isBookmarked
              ? 'bg-status-warning-bg text-status-warning-text hover:bg-amber-100'
              : 'bg-surface-container text-neutral-slate-600 hover:bg-surface-container-high'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[18px] ${
              isBookmarked ? 'material-symbols-filled text-volt-amber' : 'text-neutral-slate-600'
            }`}
          >
            bookmark
          </span>
          <span>{isBookmarked ? '저장됨' : '북마크'}</span>
        </button>
        <button
          type="button"
          aria-label="상세창 닫기"
          onClick={onClose}
          className="p-2 text-neutral-slate-600 hover:text-primary hover:bg-surface-container rounded-lg transition-colors ml-0.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>
    </div>
  );

  if (mode === 'docked') {
    return (
      <aside
        aria-label="기사 상세 인스펙터"
        className="w-full bg-surface-card rounded-2xl shadow-xl p-space-lg flex flex-col gap-space-md sticky top-20 border-t-2 border-secondary"
      >
        {headerBar}
        {bodyContent}
      </aside>
    );
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-neutral-slate-900/40 backdrop-blur-xs transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        aria-label="기사 상세 인스펙터"
        className={`fixed top-0 right-0 z-50 w-full max-w-[480px] h-[100dvh] bg-surface-card shadow-2xl flex flex-col transform transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-4 sm:px-space-lg pt-3.5 sm:pt-space-md bg-surface-card/95 backdrop-blur-sm shrink-0">
          {headerBar}
        </div>
        <div className="px-4 sm:px-space-lg py-space-md pb-8 overflow-y-auto space-y-space-md flex-1">
          {bodyContent}
        </div>
      </aside>
    </>
  );
};
