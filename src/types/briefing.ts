export type TabRoute = 'daily-briefing' | 'bookmarks' | 'search-filter' | 'system-updates';

export type CategoryKey =
  | 'all'
  | 'energy'
  | 'carbon'
  | 'economy'
  | 'plant'
  | 'esite'
  | 'people';

export type ArchiveCategoryKey = 'all' | 'grid' | 'market' | 'nuclear' | 'renewable';

export interface ArticleMetric {
  label: string;
  value: string;
  accent?: 'primary' | 'secondary' | 'blue';
}

export interface RelatedBriefing {
  id: string;
  kicker: string;
  timeLabel: string;
  title: string;
  coreTag: string;
  readTime: string;
  targetArticleId?: string;
}

export interface Article {
  id: string;
  rank: string;
  rankNum: number;
  dispatchDate: string;
  category: Exclude<CategoryKey, 'all'>;
  categoryName: string;
  archiveGroup?: Exclude<ArchiveCategoryKey, 'all'>;
  archiveBadge?: string;
  timeLabel: string;
  publishedAt: string;
  savedAtLabel?: string;
  readMinutes: number;
  title: string;
  kicker?: string;
  reporter: string;
  sourceLabel: string;
  sourceUrl: string;
  charCount: number;
  articleCode: string;
  summary: [string, string, string];
  insight: string;
  examTip?: string;
  tags: string[];
  metrics?: ArticleMetric[];
  related?: RelatedBriefing[];
  isLive?: boolean;
}

export interface CoreSummaryItem {
  index: string;
  prefix?: string;
  beforeHighlight: string;
  highlight: string;
  highlightTone?: 'blue' | 'amber' | 'bold';
  afterHighlight: string;
  secondHighlight?: string;
  secondHighlightTone?: 'blue' | 'amber' | 'bold';
  trailing?: string;
}

export interface LiveBriefingResponse {
  source: 'electimes-rss';
  fetchedAt: string;
  rssBuildDate: string;
  todayDateLabel: string;
  yesterdayDateLabel: string;
  aiEnabled: boolean;
  aiWarning?: string;
  coreSummary: CoreSummaryItem[];
  yesterdayCoreSummary: { index: string; title: string; body: string }[];
  todayArticles: Article[];
  archiveArticles: Article[];
}

export interface GlossaryItem {
  term: string;
  subtitle: string;
  description: string;
  badge: string;
}
