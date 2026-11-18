import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  ArchiveCategoryKey,
  Article,
  CategoryKey,
  CoreSummaryItem,
  LiveBriefingResponse,
} from './src/types/briefing.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface RawRssItem {
  id: string;
  idxno: string;
  title: string;
  link: string;
  description: string;
  author: string;
  pubDate: string;
  category: Exclude<CategoryKey, 'all'>;
  categoryName: string;
  isPopular: boolean;
}

interface FeedConfig {
  url: string;
  category: Exclude<CategoryKey, 'all'> | 'popular' | 'all';
  categoryName: string;
}

const ELECTIMES_FEEDS: FeedConfig[] = [
  { url: 'https://www.electimes.com/rss/S1N41.xml', category: 'energy', categoryName: '에너지' },
  { url: 'https://www.electimes.com/rss/S1N42.xml', category: 'carbon', categoryName: '탄소중립' },
  { url: 'https://www.electimes.com/rss/S1N43.xml', category: 'economy', categoryName: '전기경제' },
  { url: 'https://www.electimes.com/rss/S1N44.xml', category: 'plant', categoryName: '시공·플랜트' },
  { url: 'https://www.electimes.com/rss/S1N45.xml', category: 'people', categoryName: '피플' },
  { url: 'https://www.electimes.com/rss/S1N47.xml', category: 'esite', categoryName: 'e-사이트' },
  { url: 'https://www.electimes.com/rss/clickTop.xml', category: 'popular', categoryName: '인기기사' },
  { url: 'https://www.electimes.com/rss/allArticle.xml', category: 'all', categoryName: '에너지' },
];

let cachedRssPool: {
  todayPool: RawRssItem[];
  archivePool: RawRssItem[];
  buildDate: string;
  expiresAt: number;
} | null = null;
let cachedBriefing: { data: LiveBriefingResponse; expiresAt: number } | null = null;
let inflightFetch: Promise<LiveBriefingResponse> | null = null;

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeHtmlEntities(match[1]) : '';
}

function parsePubDate(pubDateStr: string): Date {
  // Electimes format: "2026-11-18 09:00:00" (KST)
  const normalized = pubDateStr.trim().replace(' ', 'T');
  const withTz = normalized.includes('+') || normalized.includes('Z') ? normalized : `${normalized}+09:00`;
  const parsed = new Date(withTz);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(pubDateStr);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

function formatKstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatKoreanFullDate(date: Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatShortTimeLabel(pubDateStr: string, todayYmd: string): string {
  const trimmed = pubDateStr.trim();
  const datePart = trimmed.slice(0, 10);
  const timePart = trimmed.slice(11, 16) || '09:00';
  if (datePart === todayYmd) {
    return `오늘 ${timePart}`;
  }
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (datePart === formatKstDate(yesterday)) {
    return `어제 ${timePart}`;
  }
  return `${datePart.replace(/-/g, '.')} ${timePart}`;
}

function inferArchiveGroup(category: Exclude<CategoryKey, 'all'>, text: string): Exclude<ArchiveCategoryKey, 'all'> {
  if (/원전|원자력|방폐|SMR|한수원/i.test(text)) return 'nuclear';
  if (/태양광|풍력|신재생|수소|탄소|ESS|BIPV|RE100/i.test(text)) return 'renewable';
  if (/SMP|요금|전력시장|수출|매출|투자|금융|예산|계약/i.test(text) || category === 'economy') return 'market';
  return 'grid';
}

function splitSentencesFallback(description: string, title: string): [string, string, string] {
  const clean = description.replace(/\s+/g, ' ').trim();
  const rawSentences = clean
    .split(/(?<=[.?!다요])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);

  const s1 = rawSentences[0] || `${title} 관련 소식이 전기신문을 통해 보도되었습니다.`;
  const s2 = rawSentences[1] || clean.slice(0, 140) || '세부 내용은 원문 기사에서 확인할 수 있습니다.';
  const s3 =
    rawSentences[2] ||
    '전력산업 및 에너지 유관 기관 실무자들의 후속 동향 주시가 필요한 사안입니다.';
  return [s1, s2, s3];
}

async function fetchSingleFeed(feed: FeedConfig): Promise<{ items: RawRssItem[]; buildDate: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyElectricBriefing/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} fetching ${feed.url}`);
    }
    const xml = await res.text();
    const buildDateMatch = xml.match(/<lastBuildDate[^>]*>([\s\S]*?)<\/lastBuildDate>/i);
    const buildDate = buildDateMatch ? decodeHtmlEntities(buildDateMatch[1]) : '';

    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items: RawRssItem[] = [];

    for (const block of itemMatches) {
      const title = extractTag(block, 'title');
      const link = extractTag(block, 'link');
      const description = extractTag(block, 'description');
      const author = extractTag(block, 'author') || '전기신문 취재팀';
      const pubDate = extractTag(block, 'pubDate');
      const idxMatch = link.match(/idxno=(\d+)/);
      const idxno = idxMatch ? idxMatch[1] : `${feed.category}-${items.length}`;

      if (!title || !link) continue;

      const resolvedCategory: Exclude<CategoryKey, 'all'> =
        feed.category === 'popular' || feed.category === 'all' ? 'energy' : feed.category;

      items.push({
        id: `electimes-${idxno}`,
        idxno,
        title,
        link,
        description,
        author,
        pubDate,
        category: resolvedCategory,
        categoryName: feed.category === 'popular' || feed.category === 'all' ? '에너지' : feed.categoryName,
        isPopular: feed.category === 'popular',
      });
    }

    return { items, buildDate };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchElectimesRssPool(): Promise<{
  todayPool: RawRssItem[];
  archivePool: RawRssItem[];
  buildDate: string;
}> {
  const results = await Promise.allSettled(ELECTIMES_FEEDS.map((f) => fetchSingleFeed(f)));

  const itemMap = new Map<string, RawRssItem>();
  let latestBuildDate = '';

  results.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return;
    const feed = ELECTIMES_FEEDS[idx];
    if (result.value.buildDate && !latestBuildDate) {
      latestBuildDate = result.value.buildDate;
    }

    for (const item of result.value.items) {
      const existing = itemMap.get(item.idxno);
      if (!existing) {
        itemMap.set(item.idxno, item);
      } else {
        if (item.isPopular) existing.isPopular = true;
        // Prefer specific section category over generic 'all' or 'popular'
        if (feed.category !== 'popular' && feed.category !== 'all') {
          existing.category = item.category;
          existing.categoryName = item.categoryName;
        }
      }
    }
  });

  if (itemMap.size === 0) {
    throw new Error('전기신문 RSS 피드에서 기사를 가져올 수 없습니다.');
  }

  const allItems = Array.from(itemMap.values()).sort(
    (a, b) => parsePubDate(b.pubDate).getTime() - parsePubDate(a.pubDate).getTime()
  );

  // Pick a balanced set of up to 10 latest articles across sections for Today's Briefing
  const pickedIds = new Set<string>();
  const todayPool: RawRssItem[] = [];
  const sectionOrder: Exclude<CategoryKey, 'all'>[] = [
    'energy',
    'carbon',
    'economy',
    'plant',
    'esite',
    'people',
  ];

  // Pass 1: Pick up to 2 from each section (starting with popular/newest)
  for (const sec of sectionOrder) {
    const candidates = allItems
      .filter((i) => i.category === sec && !pickedIds.has(i.id))
      .sort((a, b) => Number(b.isPopular) - Number(a.isPopular));
    const takeCount = sec === 'energy' ? 3 : sec === 'carbon' || sec === 'economy' ? 2 : 1;
    for (const c of candidates.slice(0, takeCount)) {
      if (todayPool.length < 10) {
        todayPool.push(c);
        pickedIds.add(c.id);
      }
    }
  }

  // Pass 2: Fill up to 10 if any section had fewer items
  for (const item of allItems) {
    if (todayPool.length >= 10) break;
    if (!pickedIds.has(item.id)) {
      todayPool.push(item);
      pickedIds.add(item.id);
    }
  }

  // Archive pool: next 10 distinct articles for UpdatesFallbackView & SearchView
  const archivePool = allItems.filter((item) => !pickedIds.has(item.id)).slice(0, 10);

  return { todayPool, archivePool, buildDate: latestBuildDate };
}

interface GeminiEnrichmentResult {
  coreSummary: {
    prefix: string;
    beforeHighlight: string;
    highlight: string;
    afterHighlight: string;
  }[];
  articleNotes: {
    id: string;
    summary: [string, string, string];
    insight: string;
    examTip: string;
    tags: string[];
  }[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isTransientGeminiError(err: unknown): boolean {
  const msg = getErrorMessage(err);
  return /503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporarily|ETIMEDOUT|ECONNRESET|fetch failed|abort/i.test(
    msg
  );
}

function formatGeminiWarning(err: unknown): string {
  const msg = getErrorMessage(err);
  if (/GEMINI_API_KEY가 설정되지/i.test(msg)) {
    return msg;
  }
  if (/403|400|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
    return 'Gemini API 키 인증에 실패했습니다. Settings > Secrets 패널에서 API 키를 확인해 주세요.';
  }
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(msg)) {
    return '현재 Gemini AI 서버에 일시적인 트래픽이 몰려 응답이 지연되고 있습니다(503 UNAVAILABLE). 잠시 후 다시 시도하면 AI 요약이 정상 복구됩니다.';
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return 'Gemini API 분당 요청 한도를 일시적으로 초과했습니다(429). 잠시 후 다시 시도해 주세요.';
  }
  return '일시적인 AI 서버 통신 지연으로 원문 발췌를 표시 중입니다. 잠시 후 다시 시도해 주세요.';
}

async function requestGeminiSummaryWithModel(
  ai: GoogleGenAI,
  model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite',
  prompt: string
): Promise<GeminiEnrichmentResult> {
  const config: {
    thinkingConfig?: { thinkingLevel: ThinkingLevel };
    responseMimeType: string;
    responseSchema: Record<string, unknown>;
  } = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        coreSummary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              prefix: { type: Type.STRING },
              beforeHighlight: { type: Type.STRING },
              highlight: { type: Type.STRING },
              afterHighlight: { type: Type.STRING },
            },
            required: ['prefix', 'beforeHighlight', 'highlight', 'afterHighlight'],
          },
        },
        articleNotes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              summary: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              insight: { type: Type.STRING },
              examTip: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['id', 'summary', 'insight', 'examTip', 'tags'],
          },
        },
      },
      required: ['coreSummary', 'articleNotes'],
    },
  };

  if (model === 'gemini-4-hydrogen') {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
  }

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });

  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('Gemini API로부터 빈 응답을 받았습니다.');
  }

  return JSON.parse(text) as GeminiEnrichmentResult;
}

async function enrichWithGemini(
  todayPool: RawRssItem[],
  archivePool: RawRssItem[]
): Promise<GeminiEnrichmentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. Settings > Secrets 패널을 확인해 주세요.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const targetArticles = [...todayPool, ...archivePool.slice(0, 5)];
  const promptInput = targetArticles.map((item) => ({
    id: item.id,
    category: item.categoryName,
    title: item.title,
    excerpt: item.description.slice(0, 420),
  }));

  const prompt = `당신은 한국 전력·에너지 산업 전문 에디터입니다. 아래 전기신문 실제 RSS 기사 목록만을 근거로 (절대 없는 사실이나 수치를 지어내지 말고 제공된 제목과 본문 발췌만 활용), 한국어 JSON 요약을 생성하세요.

1. coreSummary: 오늘의 주요 기사(${todayPool.slice(0, 6).map((a) => a.title).join(' / ')})를 바탕으로 핵심 3줄 종합 브리핑을 작성하세요. 각 항목은 prefix(주체/기관명, 2~10자), beforeHighlight(앞부분 문맥), highlight(핵심 키워드/수치 1개), afterHighlight(서술 마무리)로 자연스러운 1문장이 되도록 구성하세요.
2. articleNotes: 입력된 모든 기사(id 일치 필수)에 대해:
   - summary: 정확히 3개의 간결하고 명확한 한국어 문장 배열
   - insight: 전력 산업/공기업 실무자 관점의 핵심 분석 1~2문장
   - examTip: 한전·전력거래소·한수원 등 에너지 공기업 취준생/실무자를 위한 핵심 포인트 1문장
   - tags: '#'으로 시작하는 한국어 핵심 키워드 태그 3~4개

입력 기사 목록:
${JSON.stringify(promptInput)}`;

  const attempts: { model: 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite'; delayMs: number }[] = [
    { model: 'gemini-4-hydrogen', delayMs: 0 },
    { model: 'gemini-4-hydrogen', delayMs: 800 },
    { model: 'gemini-4-hydrogen', delayMs: 1600 },
    { model: 'gemini-3.1-flash-lite', delayMs: 400 },
    { model: 'gemini-3.1-flash-lite', delayMs: 1200 },
  ];

  let lastErr: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (attempt.delayMs > 0) {
      await sleep(attempt.delayMs);
    }
    try {
      return await requestGeminiSummaryWithModel(ai, attempt.model, prompt);
    } catch (err) {
      lastErr = err;
      console.warn(
        `[gemini] attempt ${i + 1}/${attempts.length} (${attempt.model}) failed:`,
        getErrorMessage(err)
      );
      if (!isTransientGeminiError(err) && i < attempts.length - 1) {
        // Non-transient error (e.g., invalid key / bad request): do not retry same model repeatedly
        throw err;
      }
    }
  }

  throw lastErr;
}

function buildArticleObjects(
  pool: RawRssItem[],
  notesMap: Map<string, GeminiEnrichmentResult['articleNotes'][number]>,
  todayYmd: string,
  rankPrefix: '#' | 'TOP '
): Article[] {
  return pool.map((raw, idx) => {
    const note = notesMap.get(raw.id);
    const fallbackSummary = splitSentencesFallback(raw.description, raw.title);
    const summary: [string, string, string] =
      note && Array.isArray(note.summary) && note.summary.length >= 3
        ? [note.summary[0], note.summary[1], note.summary[2]]
        : fallbackSummary;

    const tags =
      note && Array.isArray(note.tags) && note.tags.length > 0
        ? note.tags.map((t) => (t.startsWith('#') ? t : `#${t}`))
        : [`#${raw.categoryName.replace(/[·\s]/g, '')}`, '#전기신문', '#전력산업'];

    const insight =
      note?.insight ||
      `${raw.title} 관련 세부 정책·시장 변화와 유관 기관 동향을 원문 기사에서 확인할 수 있습니다.`;

    const pubDateObj = parsePubDate(raw.pubDate);
    const dispatchDate = formatKstDate(pubDateObj);
    const timeLabel = formatShortTimeLabel(raw.pubDate, todayYmd);
    const rankNum = idx + 1;
    const rank =
      rankPrefix === '#' ? `#${rankNum}` : `TOP ${String(rankNum).padStart(2, '0')}`;

    const fullText = `${raw.title} ${raw.description}`;
    const archiveGroup = inferArchiveGroup(raw.category, fullText);

    return {
      id: raw.id,
      rank,
      rankNum,
      dispatchDate,
      category: raw.category,
      categoryName: raw.categoryName,
      archiveGroup,
      archiveBadge: raw.categoryName,
      timeLabel,
      publishedAt: raw.pubDate ? `${raw.pubDate.slice(0, 16)} KST` : dispatchDate,
      savedAtLabel: timeLabel,
      readMinutes: Math.max(2, Math.min(4, Math.ceil(raw.description.length / 220))),
      title: raw.title,
      kicker: raw.isPopular ? '전기신문 주요 인기 기사' : `전기신문 ${raw.categoryName} 섹션`,
      reporter: raw.author.includes('기자') ? `전기신문 ${raw.author}` : raw.author,
      sourceLabel: `전기신문 · ${raw.categoryName}`,
      sourceUrl: raw.link,
      charCount: Math.max(raw.description.length, 450),
      articleCode: `ELECTIMES-${raw.idxno}`,
      summary,
      insight,
      examTip: note?.examTip,
      tags,
      isLive: true,
    };
  });
}

async function generateLiveBriefing(forceRefresh = false): Promise<LiveBriefingResponse> {
  if (!forceRefresh && cachedBriefing && Date.now() < cachedBriefing.expiresAt) {
    return cachedBriefing.data;
  }

  if (!forceRefresh && inflightFetch) {
    return inflightFetch;
  }

  const task = (async () => {
    const rssPool =
      !forceRefresh && cachedRssPool && Date.now() < cachedRssPool.expiresAt
        ? cachedRssPool
        : await fetchElectimesRssPool().then((res) => {
            cachedRssPool = {
              ...res,
              expiresAt: Date.now() + CACHE_TTL_MS,
            };
            return res;
          });
    const { todayPool, archivePool, buildDate } = rssPool;

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayYmd = formatKstDate(now);

    let aiEnabled = false;
    let aiWarning: string | undefined;
    const notesMap = new Map<string, GeminiEnrichmentResult['articleNotes'][number]>();
    let coreSummary: CoreSummaryItem[] = [];

    try {
      const enriched = await enrichWithGemini(todayPool, archivePool);
      aiEnabled = true;
      for (const note of enriched.articleNotes || []) {
        notesMap.set(note.id, note);
      }
      coreSummary = (enriched.coreSummary || []).slice(0, 3).map((item, idx) => ({
        index: String(idx + 1).padStart(2, '0'),
        prefix: item.prefix,
        beforeHighlight: item.beforeHighlight.startsWith(',')
          ? item.beforeHighlight
          : ` ${item.beforeHighlight}`,
        highlight: item.highlight,
        highlightTone: idx === 1 ? 'amber' : 'blue',
        afterHighlight: item.afterHighlight,
      }));
    } catch (err) {
      aiWarning = formatGeminiWarning(err);
      coreSummary = todayPool.slice(0, 3).map((item, idx) => ({
        index: String(idx + 1).padStart(2, '0'),
        prefix: item.categoryName,
        beforeHighlight: ' · ',
        highlight: item.title,
        highlightTone: idx === 1 ? 'amber' : 'blue',
        afterHighlight: '',
      }));
    }

    const todayArticles = buildArticleObjects(todayPool, notesMap, todayYmd, '#');
    const archiveArticles = buildArticleObjects(archivePool, notesMap, todayYmd, 'TOP ');

    // Link related briefings across todayArticles
    for (let i = 0; i < todayArticles.length; i++) {
      const others = todayArticles.filter((_, idx) => idx !== i).slice(0, 2);
      todayArticles[i].related = others.map((o) => ({
        id: `rel-${todayArticles[i].id}-${o.id}`,
        kicker: o.categoryName,
        timeLabel: o.timeLabel,
        title: o.title,
        coreTag: o.tags[0] || '#전기신문',
        readTime: `완독 ${o.readMinutes}분`,
        targetArticleId: o.id,
      }));
    }

    const yesterdayCoreSummary = archiveArticles.slice(0, 3).map((art, idx) => ({
      index: String(idx + 1).padStart(2, '0'),
      title: art.title,
      body: art.summary[0],
    }));

    const payload: LiveBriefingResponse = {
      source: 'electimes-rss',
      fetchedAt: now.toISOString(),
      rssBuildDate: buildDate || now.toISOString(),
      todayDateLabel: formatKoreanFullDate(now),
      yesterdayDateLabel: formatKoreanFullDate(yesterday),
      aiEnabled,
      aiWarning,
      coreSummary,
      yesterdayCoreSummary,
      todayArticles,
      archiveArticles,
    };

    if (aiEnabled) {
      cachedBriefing = {
        data: payload,
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
    } else {
      // Do not poison the 15-minute cache with a failed AI fallback response
      cachedBriefing = null;
    }

    return payload;
  })();

  inflightFetch = task;
  try {
    return await task;
  } finally {
    inflightFetch = null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'daily-electric-briefing' });
  });

  app.get('/api/briefing', async (req, res) => {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    try {
      const data = await generateLiveBriefing(forceRefresh);
      res.json(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '전기신문 실시간 피드를 불러오지 못했습니다.';
      console.error('[api/briefing] error:', err);
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Daily Electric Briefing server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
