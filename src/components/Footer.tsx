import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-card shadow-[0_-1px_6px_rgba(0,0,0,0.03)] mt-auto pb-16 lg:pb-0">
      <div className="max-w-7xl mx-auto px-gutter-mobile sm:px-gutter py-space-md sm:py-space-lg flex flex-col md:flex-row items-center justify-between gap-space-sm sm:gap-space-md text-[12px] sm:text-[13px] leading-[19px] text-neutral-slate-600 text-center md:text-left">
        <div className="flex items-center gap-space-sm flex-wrap justify-center md:justify-start">
          <span className="text-[16px] leading-[24px] font-semibold text-primary">
            전기 데일리 브리핑
          </span>
          <span className="text-outline-variant" aria-hidden="true">
            |
          </span>
          <span>한국전력 및 전력시장 핵심 속보 5분 압축 분석</span>
        </div>
        <div className="flex items-center gap-space-md flex-wrap justify-center">
          <span className="text-[11px] leading-[14px] font-bold tracking-[0.04em] bg-neutral-slate-50 px-space-sm py-1 rounded text-neutral-slate-600">
            KPX · KEPCO 정보망 연계
          </span>
          <span>© 2026 Daily Electric Briefing. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
