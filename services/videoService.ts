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


// Fetches a placeholder image URL based on keywords.
export const fetchPlaceholderFootageUrl = (
  keywords: string[], 
  aspectRatio: AspectRatio,
  sceneId?: string // Optional sceneId for more unique placeholders if needed
): string => {
  const width = aspectRatio === '16:9' ? 1280 : 720;
  const height = aspectRatio === '16:9' ? 720 : 1280;
  
  let seed = FALLBACK_FOOTAGE_KEYWORDS[Math.floor(Math.random() * FALLBACK_FOOTAGE_KEYWORDS.length)];
  if (keywords && keywords.length > 0) {
    seed = keywords.join('-').replace(/\s+/g, '-').toLowerCase();
  }
  // Adding sceneId to seed for more variety if multiple scenes have same keywords
  if (sceneId) {
    seed = `${seed}-${sceneId.substring(0,5)}`;
  }
  // Removed ?grayscale from the URL
  return `https://picsum.photos/seed/${seed}/${width}/${height}?random_bust=${Date.now()}`; 
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


  for (let index = 0; index < scenesToProcess.length; index++) {
    const item = scenesToProcess[index];
    const sceneId = options.generateSpecificImageForSceneId || `scene-${index}-${Date.now()}`;
    let footageUrl = '';
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
      } else {
        imageGenError = imagenResult.userFriendlyError || 'AI image generation failed. Using placeholder.';
        console.warn(imageGenError, "Prompt:", item.imagePrompt);
        onProgress(imageGenError, (index + 1) / scenesToProcess.length, 'ai_image', index + 1, scenesToProcess.length, imageGenError);
        footageUrl = fetchPlaceholderFootageUrl(item.keywords, aspectRatio, sceneId);
      }
    } else {
      onProgress(
        `Fetching placeholder image for scene ${index + 1}/${scenesToProcess.length}...`,
        (index + 1) / scenesToProcess.length,
        'placeholder_image',
        index + 1,
        scenesToProcess.length
      );
      footageUrl = fetchPlaceholderFootageUrl(item.keywords, aspectRatio, sceneId);
    }
    
    const kenBurnsConfig = generateSceneKenBurnsConfig(validatedDuration);

    if (options.generateSpecificImageForSceneId && existingScenes) {
        const sceneToUpdateIndex = existingScenes.findIndex(s => s.id === options.generateSpecificImageForSceneId);
        if (sceneToUpdateIndex !== -1) {
            existingScenes[sceneToUpdateIndex].footageUrl = footageUrl;
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