// Timestamp: 2024-09-12T10:00:00Z - Refresh
import { Scene, GeminiSceneResponseItem, KenBurnsConfig, AspectRatio } from '../types.ts';
import { FALLBACK_FOOTAGE_KEYWORDS, AVERAGE_WORDS_PER_SECOND } from '../constants.ts';
import { generateImageWithImagen } from './geminiService.ts';

// Simple hash helper used to derive deterministic offsets for placeholder
// footage searches so different scenes are less likely to return
// identical results from Wikimedia Commons.
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Helper to generate Ken Burns configuration for a scene
const generateSceneKenBurnsConfig = (duration: number): KenBurnsConfig => {
    const endScale = 1.05 + Math.random() * 0.1; // Target scale: 1.05 to 1.15
    const endXPercent = (Math.random() - 0.5) * 10; // Target X translation: -5% to +5%
    const endYPercent = (Math.random() - 0.5) * 10; // Target Y translation: -5% to +5%
    
    const originXStr = `${Math.floor(Math.random() * 51) + 25}%`; 
    const originYStr = `${Math.floor(Math.random() * 51) + 25}%`;

    return {
        targetScale: endScale,
        targetXPercent: endXPercent,
        targetYPercent: endYPercent,
        originXRatio: parseFloat(originXStr) / 100,
        originYRatio: parseFloat(originYStr) / 100,
        animationDurationS: duration,
    };
};


const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'over', 'under', 'between', 'about', 'around', 'through', 'across',
  'behind', 'after', 'before', 'into', 'onto', 'off', 'than', 'then', 'this', 'that', 'these', 'those', 'when',
  'where', 'while', 'your', 'their', 'there', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'might',
  'very', 'more', 'some', 'such', 'many', 'much', 'also', 'like', 'just', 'each', 'every', 'being', 'been', 'into',
  'onto', 'among', 'amid', 'amidst', 'during', 'within', 'without', 'because', 'against', 'toward', 'towards', 'our',
  'ours', 'his', 'hers', 'their', 'them', 'they', 'you', 'yourself', 'ourselves', 'himself', 'herself', 'itself',
  'it', 'its', 'we', 'us', 'are', 'was', 'were', 'is', 'am', 'be', 'being', 'been', 'do', 'does', 'did', 'doing',
  'on', 'in', 'at', 'by', 'to', 'of', 'as', 'a', 'an'
]);

const GENERIC_MEDIA_TERMS = [
  'background', 'texture', 'pattern', 'template', 'intro', 'graphic', 'animation', 'loop', 'wallpaper', 'abstract',
  'backdrop', 'placeholder', 'design', 'illustration'
];

interface PlaceholderContext {
  keywords?: string[];
  sceneText?: string;
  imagePrompt?: string;
}

interface WikimediaCandidate {
  url: string;
  type: 'video' | 'image';
  width: number;
  height: number;
  duration?: number;
  title: string;
  snippet?: string;
  description?: string;
}

interface ScoredCandidate extends WikimediaCandidate {
  score: number;
  query: string;
}

const cleanWikiHtml = (value?: string): string => {
  if (!value) return '';
  return value
    .replace(/<span class=\"searchmatch\">/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

const sanitizeWord = (word: string): string =>
  word
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .trim();

const extractTokens = (text?: string): string[] => {
  if (!text) return [];
  return text
    .split(/[\s,.;:!?\-]+/)
    .map(sanitizeWord)
    .filter(token => token && token.length > 2 && !STOP_WORDS.has(token));
};

const dedupeStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
};

const limitWords = (text: string, maxWords = 9): string => {
  const words = text.trim().split(/\s+/);
  return words.slice(0, maxWords).join(' ').trim();
};

const buildContextTerms = (context: PlaceholderContext): string[] => {
  const terms: string[] = [];
  if (context.keywords) {
    for (const keyword of context.keywords) {
      const sanitized = sanitizeWord(keyword);
      if (sanitized) terms.push(sanitized);
      terms.push(...extractTokens(keyword));
    }
  }
  terms.push(...extractTokens(context.sceneText));
  terms.push(...extractTokens(context.imagePrompt));
  return dedupeStrings(terms).slice(0, 30);
};

const buildSearchQueries = (context: PlaceholderContext): string[] => {
  const queries: string[] = [];
  const keywordPhrases = (context.keywords || [])
    .map(k => limitWords(k))
    .filter(Boolean);

  if (keywordPhrases.length >= 2) {
    queries.push(limitWords(keywordPhrases.slice(0, 3).join(' ')));
  }
  queries.push(...keywordPhrases);

  const keywords = dedupeStrings(keywordPhrases);
  for (let i = 0; i < Math.min(keywords.length, 4); i++) {
    for (let j = i + 1; j < Math.min(keywords.length, 5); j++) {
      queries.push(limitWords(`${keywords[i]} ${keywords[j]}`));
    }
  }

  const contextFragments: string[] = [];
  if (context.imagePrompt) {
    const fragments = context.imagePrompt.split(/[\.|\n|;|\-]/).map(f => limitWords(f));
    contextFragments.push(...fragments);
  }
  if (context.sceneText) {
    const sentences = context.sceneText.split(/[.?!]/).map(s => limitWords(s));
    contextFragments.push(...sentences);
  }

  queries.push(...contextFragments.filter(f => f && f.split(/\s+/).length >= 2));

  const contextTerms = buildContextTerms(context);
  for (let size = Math.min(4, contextTerms.length); size >= 2; size--) {
    for (let start = 0; start <= contextTerms.length - size && start < 6; start++) {
      const phrase = contextTerms.slice(start, start + size).join(' ');
      queries.push(limitWords(phrase));
    }
  }

  if (contextTerms.length) {
    queries.push(limitWords(`cinematic ${contextTerms.slice(0, 3).join(' ')}`));
    queries.push(limitWords(`dynamic footage of ${contextTerms.slice(0, 3).join(' ')}`));
  }

  queries.push(...FALLBACK_FOOTAGE_KEYWORDS.map(k => `cinematic ${k}`));

  return dedupeStrings(
    queries
      .map(q => q.replace(/\s+/g, ' ').trim())
      .filter(q => q && q.length >= 3)
  ).slice(0, 18);
};

const fetchWikimediaMediaCandidates = async (
  query: string,
  orientation: 'landscape' | 'portrait',
  type: 'video' | 'image',
  offset: number = 0
): Promise<WikimediaCandidate[]> => {
  const baseUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6&gsrprop=snippet|titlesnippet&gsrsort=relevance&gsrlimit=30&gsroffset=${offset}` +
    `&prop=imageinfo|info&inprop=url|displaytitle` +
    `&iiprop=url|size|mime|extmetadata${type === 'video' ? '|duration' : ''}`;

  try {
    const resp = await fetch(baseUrl);
    if (!resp.ok) return [];
    const data = await resp.json();
    const pages = data?.query?.pages;
    if (!pages) return [];
    const results: WikimediaCandidate[] = [];
    const pageEntries = Object.values(pages) as any[];
    for (const page of pageEntries) {
      const info = page?.imageinfo?.[0];
      if (!info || typeof info.url !== 'string' || typeof info.mime !== 'string') continue;
      const isVideo = info.mime.startsWith('video');
      if (type === 'video' && !isVideo) continue;
      if (type === 'image' && isVideo) continue;
      if (orientation === 'landscape' && info.width < info.height) continue;
      if (orientation === 'portrait' && info.height < info.width) continue;

      const durationValue = info.duration;
      let numericDuration: number | undefined = undefined;
      if (typeof durationValue === 'number') {
        numericDuration = durationValue;
      } else if (typeof durationValue === 'string') {
        const parsed = parseFloat(durationValue);
        if (!Number.isNaN(parsed)) numericDuration = parsed;
      }

      const description =
        cleanWikiHtml(
          info.extmetadata?.ImageDescription?.value ||
          info.extmetadata?.ObjectName?.value ||
          info.extmetadata?.Description?.value
        );

      results.push({
        url: info.url,
        type: isVideo ? 'video' : 'image',
        width: info.width,
        height: info.height,
        duration: numericDuration,
        title: cleanWikiHtml(page?.title || ''),
        snippet: cleanWikiHtml(page?.snippet || ''),
        description
      });
    }
    return results;
  } catch (err) {
    console.warn('Error fetching from Wikimedia API:', err);
    return [];
  }
};

const scoreCandidate = (
  candidate: WikimediaCandidate,
  contextTerms: string[],
  query: string,
  desiredDuration?: number
): number => {
  const combinedText = `${candidate.title} ${candidate.description || ''} ${candidate.snippet || ''}`.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  let score = 0;
  let matchedTerms = 0;

  if (normalizedQuery && combinedText.includes(normalizedQuery)) {
    score += 9;
  } else {
    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
    for (const word of queryWords) {
      if (word.length < 3) continue;
      if (combinedText.includes(word)) {
        matchedTerms += 1;
        score += 2.5;
      }
    }
  }

  for (const term of contextTerms) {
    const normalized = term.toLowerCase();
    if (!normalized || normalized.length < 3) continue;
    if (combinedText.includes(normalized)) {
      matchedTerms += 1;
      score += normalized.split(/\s+/).length > 1 ? 6 : 3;
    }
  }

  if (candidate.type === 'video') {
    score += 1.5;
  }

  if (desiredDuration && candidate.duration) {
    const diff = Math.abs(candidate.duration - desiredDuration);
    score += Math.max(0, 3 - diff / 2);
  }

  const loweredTitle = candidate.title.toLowerCase();
  for (const generic of GENERIC_MEDIA_TERMS) {
    if (loweredTitle.includes(generic) || combinedText.includes(generic)) {
      score -= 2;
    }
  }

  if (matchedTerms === 0) {
    score -= 2.5;
  }

  return score;
};

// Fetches a placeholder image or video URL based on contextual information for a scene.
export const fetchPlaceholderFootageUrl = async (
  contextInput: PlaceholderContext | string[],
  aspectRatio: AspectRatio,
  duration?: number,
  sceneId?: string
): Promise<{ url: string; type: 'video' | 'image' }> => {
  const context: PlaceholderContext = Array.isArray(contextInput)
    ? { keywords: contextInput }
    : { ...contextInput };

  if (!context.keywords || context.keywords.length === 0) {
    const randomFallback = FALLBACK_FOOTAGE_KEYWORDS[hashString(sceneId || `${Date.now()}`) % FALLBACK_FOOTAGE_KEYWORDS.length];
    context.keywords = [randomFallback];
  }

  const orientation = aspectRatio === '16:9' ? 'landscape' : 'portrait';
  const baseOffset = sceneId ? hashString(sceneId) % 40 : Math.floor(Math.random() * 40);

  const contextTerms = buildContextTerms(context);
  const queries = buildSearchQueries(context);
  if (queries.length === 0) {
    queries.push(`cinematic ${context.keywords?.[0] || 'storytelling visuals'}`);
  }

  let bestCandidate: ScoredCandidate | null = null;

  const considerCandidates = (candidates: WikimediaCandidate[], query: string) => {
    for (const candidate of candidates) {
      const score = scoreCandidate(candidate, contextTerms, query, duration);
      if (!bestCandidate || score > bestCandidate.score) {
        bestCandidate = { ...candidate, score, query };
      }
    }
  };

  const maxQueriesToTry = Math.min(queries.length, 12);
  for (let i = 0; i < maxQueriesToTry; i++) {
    const query = queries[i];
    const offset = (baseOffset + i * 7) % 60;

    const videoCandidates = await fetchWikimediaMediaCandidates(query, orientation, 'video', offset);
    considerCandidates(videoCandidates, query);
    if (bestCandidate && bestCandidate.type === 'video' && bestCandidate.score >= 8) {
      break;
    }

    const imageCandidates = await fetchWikimediaMediaCandidates(query, orientation, 'image', offset);
    considerCandidates(imageCandidates, query);
    if (bestCandidate && bestCandidate.score >= 9) {
      break;
    }
  }

  if (bestCandidate) {
    return { url: bestCandidate.url, type: bestCandidate.type };
  }

  const fallbackQuery = `cinematic ${FALLBACK_FOOTAGE_KEYWORDS[baseOffset % FALLBACK_FOOTAGE_KEYWORDS.length]}`;
  const fallbackVideo = await fetchWikimediaMediaCandidates(fallbackQuery, orientation, 'video', baseOffset % 10);
  if (fallbackVideo.length > 0) {
    return { url: fallbackVideo[0].url, type: 'video' };
  }
  const fallbackImage = await fetchWikimediaMediaCandidates(fallbackQuery, orientation, 'image', baseOffset % 10);
  if (fallbackImage.length > 0) {
    return { url: fallbackImage[0].url, type: 'image' };
  }

  return { url: '', type: 'video' };
};

export interface ProcessNarrationOptions {
  useAiGeneratedImages: boolean;
  generateSpecificImageForSceneId?: string; // For updating a single scene's image
}

export const processNarrationToScenes = async (
  narrationAnalysis: GeminiSceneResponseItem[],
  aspectRatio: AspectRatio,
  options: ProcessNarrationOptions,
  onProgress: (message: string, valueWithinStage: number, stage: 'ai_image' | 'placeholder_image' | 'finalizing', current?: number, total?: number, errorMsg?: string) => void,
  existingScenes?: Scene[] // For updating a single image in existing scenes
): Promise<Scene[]> => {
  const scenes: Scene[] = existingScenes && !options.generateSpecificImageForSceneId ? [...existingScenes] : [];
  const totalScenes = narrationAnalysis.length;
  let scenesToProcess = narrationAnalysis;

  // If we are only updating a single image
  if (options.generateSpecificImageForSceneId && existingScenes) {
    const sceneToUpdateIndex = existingScenes.findIndex(s => s.id === options.generateSpecificImageForSceneId);
    if (sceneToUpdateIndex !== -1) {
      // Find the corresponding item from narrationAnalysis (if ID match isn't direct)
      // This part assumes narrationAnalysis contains the *original* analysis items,
      // and we match by index if IDs are not perfectly aligned or available in narrationAnalysis items.
      // For simplicity, we'll assume the scene ID corresponds or we re-use its existing imagePrompt.
      const analysisItemForScene = narrationAnalysis.find(item => item.sceneText === existingScenes[sceneToUpdateIndex].sceneText) || 
                                   { ...existingScenes[sceneToUpdateIndex], duration: existingScenes[sceneToUpdateIndex].duration }; // Fallback to existing data if not found
      
      scenesToProcess = [analysisItemForScene as GeminiSceneResponseItem]; // Process only this one item
    } else {
      console.warn("Scene to update image for not found:", options.generateSpecificImageForSceneId);
      return existingScenes; // No change
    }
  }


  const timestamp = Date.now();
  for (let index = 0; index < scenesToProcess.length; index++) {
    const item = scenesToProcess[index];
    const sceneId = options.generateSpecificImageForSceneId || `scene-${index}-${timestamp}`;
    let footageUrl = '';
    let footageType: 'image' | 'video' = 'image';
    let imageGenError: string | undefined = undefined;

    const duration = item.duration > 0 ? item.duration : calculateDurationFromText(item.sceneText);
    const validatedDuration = Math.max(3, Math.min(20, duration)); // Ensure duration is within reasonable bounds

    if (options.useAiGeneratedImages && item.imagePrompt) {
      onProgress(
        `Generating AI image for scene ${index + 1}/${scenesToProcess.length}...`,
        (index + 1) / scenesToProcess.length,
        'ai_image',
        index + 1,
        scenesToProcess.length
      );
      const imagenResult = await generateImageWithImagen(item.imagePrompt, sceneId);
      if (imagenResult.base64Image) {
        footageUrl = imagenResult.base64Image;
        footageType = 'image';
      } else {
        imageGenError = imagenResult.userFriendlyError || 'AI image generation failed. Using placeholder.';
        console.warn(imageGenError, "Prompt:", item.imagePrompt);
        onProgress(imageGenError, (index + 1) / scenesToProcess.length, 'ai_image', index + 1, scenesToProcess.length, imageGenError);
        const placeholder = await fetchPlaceholderFootageUrl(
          { keywords: item.keywords, sceneText: item.sceneText, imagePrompt: item.imagePrompt },
          aspectRatio,
          validatedDuration,
          sceneId
        );
        footageUrl = placeholder.url;
        footageType = placeholder.type;
      }
    } else {
      onProgress(
        `Fetching placeholder image for scene ${index + 1}/${scenesToProcess.length}...`,
        (index + 1) / scenesToProcess.length,
        'placeholder_image',
        index + 1,
        scenesToProcess.length
      );
      const placeholder = await fetchPlaceholderFootageUrl(
        { keywords: item.keywords, sceneText: item.sceneText, imagePrompt: item.imagePrompt },
        aspectRatio,
        validatedDuration,
        sceneId
      );
      footageUrl = placeholder.url;
      footageType = placeholder.type;
    }
    
    const kenBurnsConfig = generateSceneKenBurnsConfig(validatedDuration);

    if (options.generateSpecificImageForSceneId && existingScenes) {
        const sceneToUpdateIndex = existingScenes.findIndex(s => s.id === options.generateSpecificImageForSceneId);
        if (sceneToUpdateIndex !== -1) {
            existingScenes[sceneToUpdateIndex].footageUrl = footageUrl;
            existingScenes[sceneToUpdateIndex].footageType = footageType;
            existingScenes[sceneToUpdateIndex].kenBurnsConfig = kenBurnsConfig; // Re-gen KB if image changes
            // Optionally update keywords/imagePrompt if they were also re-analyzed
            existingScenes[sceneToUpdateIndex].imagePrompt = item.imagePrompt; 
            existingScenes[sceneToUpdateIndex].keywords = item.keywords;
             // If duration was part of the single scene update, update it too
            if(item.duration) existingScenes[sceneToUpdateIndex].duration = validatedDuration;

            if (imageGenError) { // Store error if any for this specific update
                // How to communicate this specific error back? Maybe App.tsx adds to a list of warnings.
                // For now, it's logged and onProgress gets it.
            }
            return existingScenes; // Return modified existing scenes
        }
    } else {
         scenes.push({
          id: sceneId,
          sceneText: item.sceneText,
          keywords: item.keywords,
          imagePrompt: item.imagePrompt,
          duration: validatedDuration,
          footageUrl: footageUrl,
          footageType: footageType,
          kenBurnsConfig: kenBurnsConfig,
        });
    }
  }
  onProgress("All scene visuals processed.", 1, 'finalizing', totalScenes, totalScenes);
  return scenes;
};

export const calculateDurationFromText = (text: string): number => {
  if (!text || text.trim() === '') return 4; // Default duration for empty scenes
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.ceil(wordCount / AVERAGE_WORDS_PER_SECOND);
};