
import { Scene, AspectRatio, KenBurnsConfig, FootageType } from '../types.ts';
import { WATERMARK_TEXT } from '../constants.ts';

const VIDEO_FPS = 20; // Frames per second for the output video
const MAX_VIDEO_WIDTH_LANDSCAPE = 1280;
const MAX_VIDEO_HEIGHT_PORTRAIT = 1280;

// watermark text size relative to canvas height
const WATERMARK_FONT_HEIGHT_PERCENT = 0.03;

const IMAGE_LOAD_RETRIES = 2; // Reduced for faster failure if needed
const INITIAL_RETRY_DELAY_MS = 300;
const SUGGESTED_VIDEO_BITRATE = 2500000; // 2.5 Mbps
const MEDIA_RECORDER_TIMESLICE_MS = 100; // Get data every 100ms

interface VideoRenderOptions {
  includeWatermark: boolean;
}

interface PreloadedFootage {
  sceneId: string;
  element: HTMLImageElement | HTMLVideoElement;
  type: FootageType;
}

const FALLBACK_BASE64_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9z9zsAAAAASUVORK5CYII='; // 1x1 gray pixel

function getCanvasDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  if (aspectRatio === '16:9') {
    const width = MAX_VIDEO_WIDTH_LANDSCAPE;
    const height = Math.round(width * 9 / 16);
    return { width, height };
  } else { // 9:16
    const height = MAX_VIDEO_HEIGHT_PORTRAIT;
    const width = Math.round(height * 9 / 16);
    return { width, height };
  }
}

function drawImageWithKenBurns(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  progressInScene: number, // 0 to 1
  kbConfig: KenBurnsConfig
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const initialScale = 1.0;
  const initialXPercent = 0;
  const initialYPercent = 0;

  const currentScale = initialScale + (kbConfig.targetScale - initialScale) * progressInScene;
  const currentXPercent = initialXPercent + (kbConfig.targetXPercent - initialXPercent) * progressInScene;
  const currentYPercent = initialYPercent + (kbConfig.targetYPercent - initialYPercent) * progressInScene;

  const currentXTranslatePx = (canvasWidth * currentXPercent) / 100;
  const currentYTranslatePx = (canvasHeight * currentYPercent) / 100;

  ctx.save();

  const originPxX = canvasWidth * kbConfig.originXRatio;
  const originPxY = canvasHeight * kbConfig.originYRatio;
  ctx.translate(originPxX, originPxY);
  ctx.scale(currentScale, currentScale);
  ctx.translate(-originPxX, -originPxY);
  ctx.translate(currentXTranslatePx, currentYTranslatePx);

  let dx, dy, dw, dh;
  const imgNaturalAspect = img.naturalWidth / img.naturalHeight;
  const canvasViewAspect = canvasWidth / canvasHeight;

  if (imgNaturalAspect > canvasViewAspect) {
      dh = canvasHeight;
      dw = dh * imgNaturalAspect;
      dx = (canvasWidth - dw) / 2;
      dy = 0;
  } else {
      dw = canvasWidth;
      dh = dw / imgNaturalAspect;
      dx = 0;
      dy = (canvasHeight - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}


function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  lines.forEach((singleLine, index) => {
    ctx.fillText(singleLine, x, y + (index * lineHeight));
  });
}


function drawWatermark(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, text: string) {
  const fontSize = Math.round(canvasHeight * WATERMARK_FONT_HEIGHT_PERCENT);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'right';
  ctx.fillText(text, canvasWidth - 10, canvasHeight - 10);
}

async function loadFootageWithRetries(src: string, sceneId: string, sceneIndexForLog: number, type: FootageType): Promise<HTMLImageElement | HTMLVideoElement> {
  for (let attempt = 0; attempt <= IMAGE_LOAD_RETRIES; attempt++) {
    try {
      if (type === 'video') {
        const video = document.createElement('video');
        if (!src.startsWith('data:')) {
          video.crossOrigin = 'anonymous';
        }
        video.src = src;
        video.muted = true;
        await new Promise((resolve, reject) => {
          video.onloadeddata = () => resolve(null);
          video.onerror = () => reject(new Error('Failed to load video'));
        });
        return video;
      }
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (!src.startsWith('data:')) {
            img.crossOrigin = "anonymous";
        }
        img.onload = () => resolve(img);
        img.onerror = (eventOrMessage) => {
          let errorMessage = `Failed to load image for scene ${sceneIndexForLog + 1} (ID: ${sceneId}, URL: ${src.substring(0,100)}...), attempt ${attempt + 1}/${IMAGE_LOAD_RETRIES + 1}.`;
            if (typeof eventOrMessage === 'string') {
                errorMessage += ` Details: ${eventOrMessage}`;
            } else if (eventOrMessage && (eventOrMessage as Event).type) {
                errorMessage += ` Event type: ${(eventOrMessage as Event).type}.`;
            }
          reject(new Error(errorMessage));
        };
        img.src = src;
      });
      return image;
    } catch (error) {
      console.warn(`Image load attempt ${attempt + 1} failed for scene ${sceneIndexForLog + 1}. Error: ${(error as Error).message}`);
      if (attempt < IMAGE_LOAD_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error(`All ${IMAGE_LOAD_RETRIES + 1} attempts to load footage for scene ${sceneIndexForLog + 1} failed. Using fallback.`);
        if (type === 'video') {
          const vid = document.createElement('video');
          vid.src = src;
          await new Promise(res => { vid.onloadeddata = () => res(null); });
          return vid;
        } else {
          const fallbackImg = new Image();
          fallbackImg.src = FALLBACK_BASE64_IMAGE;
          await new Promise(res => { fallbackImg.onload = () => res(null); });
          return fallbackImg;
        }
      }
    }
  }
  if (type === 'video') {
    const vid = document.createElement('video');
    vid.src = src;
    await new Promise(res => { vid.onloadeddata = () => res(null); });
    return vid;
  }
  const fallbackImg = new Image();
  fallbackImg.src = FALLBACK_BASE64_IMAGE;
  await new Promise(res => { fallbackImg.onload = () => res(null); });
  return fallbackImg;
}

async function preloadAllFootage(
    scenes: Scene[],
    onProgress: (message: string, value: number) => void
): Promise<PreloadedFootage[]> {
    onProgress("Preloading footage...", 0);
    const results: PreloadedFootage[] = [];
    const concurrency = 3;
    let index = 0;
    let completed = 0;

    async function worker() {
        while (index < scenes.length) {
            const i = index++;
            const scene = scenes[i];
            const element = await loadFootageWithRetries(scene.footageUrl, scene.id, i, scene.footageType);
            results.push({ sceneId: scene.id, element, type: scene.footageType });
            completed++;
            onProgress(`Preloading footage... (${completed}/${scenes.length})`, completed / scenes.length);
        }
    }

    await Promise.all(Array(Math.min(concurrency, scenes.length)).fill(0).map(worker));
    onProgress("All footage preloaded.", 1);
    return results;
}


export const generateWebMFromScenes = (
  scenes: Scene[],
  aspectRatio: AspectRatio,
  options: VideoRenderOptions,
  onProgressCallback?: (progress: number) => void // Renamed for clarity
): Promise<Blob> => {
  console.log('[Video Rendering Service] Starting WebM generation.');
  return new Promise(async (resolve, reject) => {
    let streamEndedCleanly = false; // Moved declaration to the top of the async function scope

    const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(aspectRatio);
    console.log(`[Video Rendering Service] Canvas dimensions: ${canvasWidth}x${canvasHeight}`);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for potential performance gain

    if (!ctx) {
      console.error('[Video Rendering Service] Failed to get canvas context.');
      return reject(new Error('Failed to get canvas context for video generation.'));
    }

    if (!(window as any).MediaRecorder || !canvas.captureStream) {
        console.error('[Video Rendering Service] MediaRecorder API or canvas.captureStream not supported.');
        return reject(new Error('MediaRecorder API or canvas.captureStream is not supported in this browser.'));
    }

    const recordedChunks: BlobPart[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let preloadedFootage: PreloadedFootage[] = [];
    let animationFrameId: number | null = null;

    const updateOverallProgress = (stageProgress: number, stageWeight: number, baseProgress: number) => {
        if (onProgressCallback) {
            onProgressCallback(Math.min(0.99, baseProgress + stageProgress * stageWeight));
        }
    };

    try {
        // Stage 1: Preload footage (0% - 20% of progress)
        preloadedFootage = await preloadAllFootage(scenes, (_msg, val) => {
            // console.log(`[Preload Progress] ${_msg} - ${val}`); // Optional detailed logging
            updateOverallProgress(val, 0.2, 0);
        });

        const stream = canvas.captureStream(VIDEO_FPS);
        console.log(`[Video Rendering Service] Canvas stream captured at ${VIDEO_FPS} FPS.`);

        let mimeType = 'video/webm;codecs=vp8'; // Prioritize VP8 for compatibility
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.warn(`[Video Rendering Service] VP8 MIME type not supported, trying VP9.`);
            mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                console.warn(`[Video Rendering Service] VP9 MIME type not supported, trying generic video/webm.`);
                mimeType = 'video/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    console.error('[Video Rendering Service] No suitable WebM MIME type found.');
                    if (stream.getTracks) stream.getTracks().forEach(track => track.stop());
                    return reject(new Error('No suitable WebM MIME type found for MediaRecorder.'));
                }
            }
        }
        console.log(`[Video Rendering Service] Using MIME type: ${mimeType}`);

        mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: SUGGESTED_VIDEO_BITRATE
        });
        console.log(`[Video Rendering Service] MediaRecorder initialized with bitrate: ${SUGGESTED_VIDEO_BITRATE}`);

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            // console.log(`[Video Rendering Service] MediaRecorder data available, size: ${event.data.size}`);
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          streamEndedCleanly = true;
          console.log('[Video Rendering Service] MediaRecorder stopped. Total chunks:', recordedChunks.length);
          if (stream.getTracks) stream.getTracks().forEach(track => track.stop());
          
          if (recordedChunks.length === 0) {
              console.warn('[Video Rendering Service] No data recorded. This might result in an empty or very short video.');
              // Potentially reject here if 0 chunks is always an error for the user.
              // For now, let it resolve, the browser might still produce a tiny (unplayable) file.
          }
          const blob = new Blob(recordedChunks, { type: mimeType });
          console.log(`[Video Rendering Service] Video blob created, size: ${blob.size}, type: ${blob.type}`);
          if (onProgressCallback) onProgressCallback(1); // Final progress
          resolve(blob);
        };

        mediaRecorder.onerror = (event: Event) => {
          let errorName = 'Unknown MediaRecorder error';
          const mediaRecorderError = (event as any).error || (event.target as any)?.error;
          if (mediaRecorderError && mediaRecorderError.name) {
              errorName = mediaRecorderError.name;
          } else if (event && event.type){
              errorName = `Event type: ${event.type}`;
          }
          console.error(`[Video Rendering Service] MediaRecorder error: ${errorName}`, mediaRecorderError || event);
          if (stream.getTracks) stream.getTracks().forEach(track => track.stop());
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          if (!streamEndedCleanly) { // Avoid double rejection if onstop is also called
            reject(new Error(`MediaRecorder error: ${errorName}`));
          }
        };
        
        console.log('[Video Rendering Service] Starting MediaRecorder with timeslice:', MEDIA_RECORDER_TIMESLICE_MS);
        mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS);

        let currentSceneIndex = 0;
        let currentFrameInScene = 0;
        let totalFramesRenderedOverall = 0;
        const totalFramesToRenderOverall = scenes.reduce((acc, scene) => acc + Math.round(scene.duration * VIDEO_FPS), 0);
        
        console.log(`[Video Rendering Service] Starting requestAnimationFrame loop. Total scenes: ${scenes.length}, Total frames to render: ${totalFramesToRenderOverall}`);

        const renderFrame = () => {
            if (currentSceneIndex >= scenes.length) {
                console.log(`[Video Rendering Service] All scenes rendered (${totalFramesRenderedOverall} frames). Stopping MediaRecorder.`);
                if (mediaRecorder && mediaRecorder.state === "recording") {
                    mediaRecorder.stop();
                } else if (mediaRecorder && mediaRecorder.state !== "inactive" && !streamEndedCleanly) {
                     console.warn('[Video Rendering Service] MediaRecorder was not recording but not inactive, attempting stop. State:', mediaRecorder.state);
                     mediaRecorder.stop(); // Attempt stop anyway, onstop should handle it
                } else if (!mediaRecorder || (mediaRecorder.state === "inactive" && !streamEndedCleanly)) {
                    // This case means recorder might have errored or stopped prematurely without onstop firing correctly
                    console.error("[Video Rendering Service] MediaRecorder inactive or null before all frames rendered, and onstop didn't fire. Manually rejecting.");
                    if (stream.getTracks) stream.getTracks().forEach(track => track.stop());
                    reject(new Error("MediaRecorder stopped prematurely or failed to record data."));
                }
                return;
            }

            const scene = scenes[currentSceneIndex];
            const preloadedData = preloadedFootage.find(pi => pi.sceneId === scene.id);
            
            if (!preloadedData) {
                console.error(`[Video Rendering Service] Preloaded footage not found for scene ID: ${scene.id}`);
                if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); else if (stream.getTracks) stream.getTracks().forEach(track => track.stop());
                reject(new Error(`Internal error: Preloaded image missing for scene ${scene.id}`));
                return;
            }

            const element = preloadedData.element;
            if (preloadedData.type === 'video') {
                (element as HTMLVideoElement).play();
            }
            const numFramesForThisScene = Math.round(scene.duration * VIDEO_FPS);
            const progressInThisScene = numFramesForThisScene <= 1 ? 1 : currentFrameInScene / (numFramesForThisScene -1);

            try {
                if (preloadedData.type === 'video') {
                    ctx.drawImage(element as HTMLVideoElement, 0, 0, canvasWidth, canvasHeight);
                } else {
                    drawImageWithKenBurns(ctx, element as HTMLImageElement, canvasWidth, canvasHeight, progressInThisScene, scene.kenBurnsConfig!);
                }
                if (options.includeWatermark) {
                    drawWatermark(ctx, canvasWidth, canvasHeight, WATERMARK_TEXT);
                }
            } catch (drawError) {
                console.error(`[Video Rendering Service] Error during drawing frame ${currentFrameInScene + 1} for scene ${currentSceneIndex+1}:`, drawError);
                if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); else if (stream.getTracks) stream.getTracks().forEach(track => track.stop());
                reject(drawError);
                return;
            }

            currentFrameInScene++;
            totalFramesRenderedOverall++;
            
            // Update progress (20% to 99% for rendering)
            if (totalFramesToRenderOverall > 0) {
                updateOverallProgress(totalFramesRenderedOverall / totalFramesToRenderOverall, 0.79, 0.20);
            }


            if (currentFrameInScene >= numFramesForThisScene) {
                currentSceneIndex++;
                currentFrameInScene = 0;
            }
            animationFrameId = requestAnimationFrame(renderFrame);
        };

        animationFrameId = requestAnimationFrame(renderFrame); // Start the rendering loop

    } catch (error) {
      console.error("[Video Rendering Service] Critical error during video processing setup or image preloading:", error);
      if (mediaRecorder && mediaRecorder.state === "recording") {
          try { mediaRecorder.stop(); } catch (e) { /* ignore */ }
      }
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      const errorToReject = error instanceof Error ? error : new Error(String(error || "Unknown error during video processing"));
      if (!streamEndedCleanly) {
        reject(errorToReject);
      }
    }
  });
};
