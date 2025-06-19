// Timestamp: 2024-09-12T10:00:00Z - Refresh
import { Scene, GeminiSceneResponseItem, KenBurnsConfig, AspectRatio } from '../types.ts';
import { FALLBACK_FOOTAGE_KEYWORDS, AVERAGE_WORDS_PER_SECOND } from '../constants.ts';
import { generateImageWithImagen } from './geminiService.ts';

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


// Helper to fetch video from Wikimedia Commons
const fetchWikimediaVideo = async (
  query: string,
  orientation: 'landscape' | 'portrait',
  duration?: number
): Promise<string | null> => {
  const searchUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*` +
    `&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:video')}` +
    `&gsrlimit=25&gsrnamespace=6&prop=imageinfo&iiprop=url|size|duration|mime`;
  try {
    const resp = await fetch(searchUrl);
    if (!resp.ok) return null;
    const data = await resp.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    let videos: any[] = Object.values(pages);
    videos = videos.filter(v => v.imageinfo && v.imageinfo[0] && v.imageinfo[0].mime && v.imageinfo[0].mime.startsWith('video'));
    videos = videos.filter(v => {
      const info = v.imageinfo[0];
      return orientation === 'landscape' ? info.width >= info.height : info.height >= info.width;
    });
    if (videos.length === 0) return null;
    if (duration) {
      videos.sort((a, b) => {
        const ad = Math.abs((a.imageinfo[0].duration || 0) - duration);
        const bd = Math.abs((b.imageinfo[0].duration || 0) - duration);
        return ad - bd;
      });
    }
    const candidates = videos.slice(0, 5);
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    return choice.imageinfo[0].url as string;
  } catch (err) {
    console.warn('Error fetching from Wikimedia API:', err);
    return null;
  }
};

// Fetches a placeholder image or video URL based on keywords.
export const fetchPlaceholderFootageUrl = async (
  keywords: string[],
  aspectRatio: AspectRatio,
  duration?: number,
  sceneId?: string // Optional sceneId for more unique placeholders if needed
): Promise<{ url: string; type: 'video' | 'image' }> => {
  const width = aspectRatio === '16:9' ? 960 : 540; // used if fallback search needs orientation hints
  const height = aspectRatio === '16:9' ? 540 : 960;

  const query = (keywords && keywords.length > 0)
    ? keywords.join(' ')
    : FALLBACK_FOOTAGE_KEYWORDS[Math.floor(Math.random() * FALLBACK_FOOTAGE_KEYWORDS.length)];

  const orientation = aspectRatio === '16:9' ? 'landscape' : 'portrait';

  const wikiVideo = await fetchWikimediaVideo(query, orientation, duration);
  if (wikiVideo) {
    return { url: wikiVideo, type: 'video' };
  }

  // If no result for the specific query, attempt a generic stock search
  const fallback = await fetchWikimediaVideo('stock footage', orientation, duration);
  return { url: fallback || '', type: 'video' };
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
        const placeholder = await fetchPlaceholderFootageUrl(item.keywords, aspectRatio, validatedDuration, sceneId);
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
      const placeholder = await fetchPlaceholderFootageUrl(item.keywords, aspectRatio, validatedDuration, sceneId);
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