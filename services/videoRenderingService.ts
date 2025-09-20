
import { Scene, AspectRatio, KenBurnsConfig } from '../types.ts';
import { WATERMARK_TEXT } from '../constants.ts';
import { Muxer, ArrayBufferTarget } from 'webm-muxer';

type RenderMode = 'preview' | 'download';

interface RenderConfig {
  fps: number;
  maxLandscapeWidth: number;
  maxPortraitHeight: number;
  bitrate: number;
}

const RENDER_CONFIG: Record<RenderMode, RenderConfig> = {
  preview: {
    fps: 15,
    maxLandscapeWidth: 854,
    maxPortraitHeight: 960,
    bitrate: 1_200_000,
  },
  download: {
    fps: 24,
    maxLandscapeWidth: 1280,
    maxPortraitHeight: 1280,
    bitrate: 3_500_000,
  },
};

const getRenderConfig = (mode: RenderMode): RenderConfig => RENDER_CONFIG[mode] ?? RENDER_CONFIG.preview;

const WEB_CODECS_CODEC = 'vp09.00.10.08';

// watermark text size relative to canvas height
const WATERMARK_FONT_HEIGHT_PERCENT = 0.03;

const IMAGE_LOAD_RETRIES = 2; // Reduced for faster failure if needed
const INITIAL_RETRY_DELAY_MS = 300;
const MEDIA_RECORDER_DEFAULT_BITRATE = 2_500_000; // Default fallback if config bitrate unavailable
const MEDIA_RECORDER_TIMESLICE_MS = 100; // Get data every 100ms
const VIDEO_FRAME_CAPTURE_TIME = 0; // seconds - capture first frame

const hasWebCodecsSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return typeof w.VideoEncoder === 'function' && typeof w.VideoFrame === 'function';
};

interface VideoRenderOptions {
  includeWatermark: boolean;
  mode?: RenderMode;
}

export interface GeneratedVideoResult {
  blob: Blob;
  mimeType: string;
  format: 'webm' | 'mp4';
}

const FALLBACK_BASE64_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO9z9zsAAAAASUVORK5CYII='; // 1x1 gray pixel

const MIN_PRELOAD_CONCURRENCY = 2;
const MAX_PRELOAD_CONCURRENCY = 6;

interface PreloadedImage {
  sceneId: string;
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose?: () => void;
}

const createAbortError = (): Error => {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Video rendering was cancelled.', 'AbortError');
  }
  const error = new Error('Video rendering was cancelled.');
  error.name = 'AbortError';
  return error;
};

const isAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { name?: string }).name === 'AbortError';
};

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

const resolvePreloadConcurrency = (): number => {
  if (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number') {
    const suggested = Math.max(
      MIN_PRELOAD_CONCURRENCY,
      Math.floor(navigator.hardwareConcurrency / 2),
    );
    return Math.min(MAX_PRELOAD_CONCURRENCY, suggested || MIN_PRELOAD_CONCURRENCY);
  }
  return 4;
};

function getCanvasDimensions(
  aspectRatio: AspectRatio,
  config: RenderConfig,
): { width: number; height: number } {
  if (aspectRatio === '16:9') {
    const width = config.maxLandscapeWidth;
    const height = Math.round((width * 9) / 16);
    return { width, height };
  }

  const height = config.maxPortraitHeight;
  const width = Math.round((height * 9) / 16);
  return { width, height };
}

function drawImageWithKenBurns(
  ctx: CanvasRenderingContext2D,
  image: PreloadedImage,
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
  const imgNaturalAspect = image.width / image.height || 1;
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
  ctx.drawImage(image.source, dx, dy, dw, dh);
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

async function loadImageWithRetries(
  src: string,
  sceneId: string,
  sceneIndexForLog: number,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  for (let attempt = 0; attempt <= IMAGE_LOAD_RETRIES; attempt++) {
    try {
      throwIfAborted(signal);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (!src.startsWith('data:')) {
            img.crossOrigin = "anonymous";
        }
        img.decoding = 'async';
        function cleanup() {
          img.onload = null;
          img.onerror = null;
          if (signal) {
            signal.removeEventListener('abort', handleAbort);
          }
        }
        function handleAbort() {
          cleanup();
          reject(createAbortError());
        }
        img.onload = () => {
          cleanup();
          resolve(img);
        };
        img.onerror = (eventOrMessage) => {
          let errorMessage = `Failed to load image for scene ${sceneIndexForLog + 1} (ID: ${sceneId}, URL: ${src.substring(0,100)}...), attempt ${attempt + 1}/${IMAGE_LOAD_RETRIES + 1}.`;
            if (typeof eventOrMessage === 'string') {
                errorMessage += ` Details: ${eventOrMessage}`;
            } else if (eventOrMessage && (eventOrMessage as Event).type) {
                errorMessage += ` Event type: ${(eventOrMessage as Event).type}.`;
            }
          cleanup();
          reject(new Error(errorMessage));
        };
        if (signal) {
          if (signal.aborted) {
            handleAbort();
            return;
          }
          signal.addEventListener('abort', handleAbort, { once: true });
        }
        img.src = src;
      });
      if (typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch {
          // ignore decode failure; onload already fired
        }
      }
      throwIfAborted(signal);
      return image;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.warn(`Image load attempt ${attempt + 1} failed for scene ${sceneIndexForLog + 1}. Error: ${(error as Error).message}`);
      if (attempt < IMAGE_LOAD_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error(`All ${IMAGE_LOAD_RETRIES + 1} attempts to load image for scene ${sceneIndexForLog + 1} failed. Using fallback image.`);
        const fallbackImg = new Image();
        fallbackImg.src = FALLBACK_BASE64_IMAGE;
        if (!fallbackImg.complete) {
          await new Promise(res => {
            fallbackImg.onload = () => res(null);
          });
        }
        throwIfAborted(signal);
        return fallbackImg;
      }
    }
  }
  const fallbackImg = new Image();
  fallbackImg.src = FALLBACK_BASE64_IMAGE;
  if (!fallbackImg.complete) {
    await new Promise(res => {
      fallbackImg.onload = () => res(null);
    });
  }
  throwIfAborted(signal);
  return fallbackImg;
}

async function loadVideoFrameWithRetries(
  src: string,
  sceneId: string,
  sceneIndexForLog: number,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  for (let attempt = 0; attempt <= IMAGE_LOAD_RETRIES; attempt++) {
    try {
      throwIfAborted(signal);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const video = document.createElement('video');
        if (!src.startsWith('data:')) {
          video.crossOrigin = 'anonymous';
        }
        video.preload = 'auto';
        video.muted = true;
        function cleanup() {
          video.onloadeddata = null;
          video.onerror = null;
          if (signal) {
            signal.removeEventListener('abort', handleAbort);
          }
        }
        function handleAbort() {
          cleanup();
          reject(createAbortError());
        }
        video.onloadeddata = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1;
            canvas.height = video.videoHeight || 1;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context for video frame');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = new Image();
            img.src = canvas.toDataURL('image/png');
            img.decoding = 'async';
            img.onload = () => {
              cleanup();
              resolve(img);
            };
          } catch (err) {
            cleanup();
            reject(err);
          }
        };
        video.onerror = (e) => {
          const errorMessage = `Failed to load video for scene ${sceneIndexForLog + 1} (ID: ${sceneId}, URL: ${src.substring(0,100)}...), attempt ${attempt + 1}/${IMAGE_LOAD_RETRIES + 1}.`;
          cleanup();
          reject(new Error(errorMessage));
        };
        video.currentTime = VIDEO_FRAME_CAPTURE_TIME;
        if (signal) {
          if (signal.aborted) {
            handleAbort();
            return;
          }
          signal.addEventListener('abort', handleAbort, { once: true });
        }
        video.src = src;
      });
      if (typeof image.decode === 'function') {
        try {
          await image.decode();
        } catch {
          // ignore decode failure
        }
      }
      throwIfAborted(signal);
      return image;
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      console.warn(`Video load attempt ${attempt + 1} failed for scene ${sceneIndexForLog + 1}. Error: ${(error as Error).message}`);
      if (attempt < IMAGE_LOAD_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error(`All ${IMAGE_LOAD_RETRIES + 1} attempts to load video for scene ${sceneIndexForLog + 1} failed. Using fallback image.`);
        const fallbackImg = new Image();
        fallbackImg.src = FALLBACK_BASE64_IMAGE;
        if (!fallbackImg.complete) {
          await new Promise(res => {
            fallbackImg.onload = () => res(null);
          });
        }
        throwIfAborted(signal);
        return fallbackImg;
      }
    }
  }
  const fallbackImg = new Image();
  fallbackImg.src = FALLBACK_BASE64_IMAGE;
  if (!fallbackImg.complete) {
    await new Promise(res => {
      fallbackImg.onload = () => res(null);
    });
  }
  throwIfAborted(signal);
  return fallbackImg;
}

async function createPreloadedImageFromElement(
  sceneId: string,
  element: HTMLImageElement,
  signal?: AbortSignal,
): Promise<PreloadedImage> {
  throwIfAborted(signal);
  const baseWidth = element.naturalWidth || element.width || 1;
  const baseHeight = element.naturalHeight || element.height || 1;

  if (typeof createImageBitmap === 'function') {
    try {
      if (typeof element.decode === 'function') {
        try {
          await element.decode();
        } catch {
          // ignore decode failure
        }
      }
      throwIfAborted(signal);
      const bitmap = await createImageBitmap(element);
      return {
        sceneId,
        source: bitmap,
        width: bitmap.width || baseWidth,
        height: bitmap.height || baseHeight,
        dispose: () => bitmap.close(),
      };
    } catch (error) {
      console.warn('[Video Rendering Service] Failed to create ImageBitmap. Falling back to HTMLImageElement.', error);
    }
  }

  return {
    sceneId,
    source: element,
    width: baseWidth,
    height: baseHeight,
  };
}

async function preloadAllImages(
    scenes: Scene[],
    onProgress: (message: string, value: number) => void,
    signal?: AbortSignal,
): Promise<PreloadedImage[]> {
    onProgress("Preloading images...", 0);
    const results: PreloadedImage[] = [];
    const concurrency = Math.min(resolvePreloadConcurrency(), scenes.length || MIN_PRELOAD_CONCURRENCY);
    let index = 0;
    let completed = 0;

    async function worker() {
        while (true) {
            throwIfAborted(signal);
            const i = index++;
            if (i >= scenes.length) {
                return;
            }
            const scene = scenes[i];
            const baseImage = scene.footageType === 'video'
              ? await loadVideoFrameWithRetries(scene.footageUrl, scene.id, i, signal)
              : await loadImageWithRetries(scene.footageUrl, scene.id, i, signal);
            const prepared = await createPreloadedImageFromElement(scene.id, baseImage, signal);
            results.push(prepared);
            completed++;
            onProgress(`Preloading images... (${completed}/${scenes.length})`, completed / scenes.length);
        }
    }

    await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
    onProgress("All images preloaded.", 1);
    return results;
}


const generateWebMWithWebCodecs = (
  scenes: Scene[],
  aspectRatio: AspectRatio,
  options: VideoRenderOptions,
  config: RenderConfig,
  onProgressCallback?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<GeneratedVideoResult> => {
  console.log('[Video Rendering Service] Using WebCodecs accelerated renderer.');
  return new Promise(async (resolve, reject) => {
    let encoder: any = null;
    let preloadedImages: PreloadedImage[] = [];
    try {
      const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(aspectRatio, config);
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        throw new Error('Failed to get canvas context for WebCodecs video generation.');
      }

      const frameDurationUS = Math.round(1_000_000 / config.fps);

      const updateOverallProgress = (stageProgress: number, stageWeight: number, baseProgress: number) => {
        if (onProgressCallback) {
          onProgressCallback(Math.min(0.99, baseProgress + stageProgress * stageWeight));
        }
      };

      preloadedImages = await preloadAllImages(scenes, (_msg, val) => {
        updateOverallProgress(val, 0.2, 0);
      }, signal);

      throwIfAborted(signal);

      const imageMap = new Map<string, PreloadedImage>();
      preloadedImages.forEach(item => imageMap.set(item.sceneId, item));

      const muxerTarget = new ArrayBufferTarget();
      const muxer = new Muxer({
        target: muxerTarget,
        video: {
          codec: 'V_VP9',
          width: canvasWidth,
          height: canvasHeight,
          frameRate: config.fps,
          alpha: false,
        },
      });

      const VideoEncoderCtor = (window as unknown as Record<string, any>).VideoEncoder;
      const VideoFrameCtor = (window as unknown as Record<string, any>).VideoFrame;

      if (!VideoEncoderCtor || !VideoFrameCtor) {
        throw new Error('WebCodecs API is unavailable in this browser.');
      }

      encoder = new VideoEncoderCtor({
        output: (chunk: any, meta?: any) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (error: any) => {
          reject(new Error(`VideoEncoder error: ${(error && (error.message || error.name)) || 'unknown'}`));
        },
      });

      encoder.configure({
        codec: WEB_CODECS_CODEC,
        width: canvasWidth,
        height: canvasHeight,
        bitrate: config.bitrate,
        framerate: config.fps,
        latencyMode: 'quality',
        hardwareAcceleration: 'prefer-hardware',
      });

      let totalFramesRenderedOverall = 0;
      const totalFramesToRenderOverall = scenes.reduce(
        (acc, scene) => acc + Math.max(1, Math.round(scene.duration * config.fps)),
        0,
      );

      for (const scene of scenes) {
        throwIfAborted(signal);
        const img = imageMap.get(scene.id);
        if (!img) {
          throw new Error(`Internal error: Preloaded image missing for scene ${scene.id}`);
        }

        const numFramesForScene = Math.max(1, Math.round(scene.duration * config.fps));
        for (let frameIndex = 0; frameIndex < numFramesForScene; frameIndex++) {
          throwIfAborted(signal);
          const progressInThisScene = numFramesForScene <= 1 ? 1 : frameIndex / (numFramesForScene - 1);
          drawImageWithKenBurns(ctx, img, canvasWidth, canvasHeight, progressInThisScene, scene.kenBurnsConfig);
          if (options.includeWatermark) {
            drawWatermark(ctx, canvasWidth, canvasHeight, WATERMARK_TEXT);
          }

          const timestamp = totalFramesRenderedOverall * frameDurationUS;
          const frame = new VideoFrameCtor(canvas, { timestamp, duration: frameDurationUS });
          encoder.encode(frame);
          frame.close();

          totalFramesRenderedOverall++;
          if (totalFramesToRenderOverall > 0) {
            updateOverallProgress(totalFramesRenderedOverall / totalFramesToRenderOverall, 0.79, 0.20);
          }
        }
      }

      await encoder.flush();
      encoder.close();
      muxer.finalize();

      if (onProgressCallback) onProgressCallback(1);
      const blob = new Blob([muxerTarget.buffer], { type: 'video/webm' });
      resolve({ blob, mimeType: blob.type || 'video/webm', format: 'webm' });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      preloadedImages.forEach(item => item.dispose?.());
      if (encoder && encoder.state !== 'closed') {
        try {
          encoder.close();
        } catch (_err) {
          // ignore cleanup error
        }
      }
    }
  });
};


const generateWebMWithMediaRecorder = (
  scenes: Scene[],
  aspectRatio: AspectRatio,
  options: VideoRenderOptions,
  config: RenderConfig,
  onProgressCallback?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<GeneratedVideoResult> => {
  console.log('[Video Rendering Service] Starting MediaRecorder-based rendering.');
  return new Promise(async (resolve, reject) => {
    const recordedChunks: BlobPart[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let preloadedImages: PreloadedImage[] = [];
    const preloadedImageMap = new Map<string, PreloadedImage>();
    let animationFrameId: number | null = null;
    let stream: MediaStream | null = null;
    let abortHandler: (() => void) | null = null;
    let aborted = false;
    let settled = false;

    const disposePreloadedImages = () => {
      preloadedImages.forEach(item => item.dispose?.());
      preloadedImages = [];
      preloadedImageMap.clear();
    };

    const stopStream = () => {
      if (stream) {
        if (stream.getTracks) {
          stream.getTracks().forEach(track => track.stop());
        }
        stream = null;
      }
    };

    const cleanup = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
        abortHandler = null;
      }
      stopStream();
      disposePreloadedImages();
    };

    const safeResolve = (value: GeneratedVideoResult) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const safeReject = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (error instanceof Error) {
        reject(error);
      } else {
        reject(new Error(String(error)));
      }
    };

    try {
      const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(aspectRatio, config);
      console.log(`[Video Rendering Service] Canvas dimensions: ${canvasWidth}x${canvasHeight}`);

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        console.error('[Video Rendering Service] Failed to get canvas context.');
        safeReject(new Error('Failed to get canvas context for video generation.'));
        return;
      }

      ctx.imageSmoothingQuality = 'high';

      if (!(window as any).MediaRecorder || !canvas.captureStream) {
        console.error('[Video Rendering Service] MediaRecorder API or canvas.captureStream not supported.');
        safeReject(new Error('MediaRecorder API or canvas.captureStream is not supported in this browser.'));
        return;
      }

      const updateOverallProgress = (stageProgress: number, stageWeight: number, baseProgress: number) => {
        if (onProgressCallback) {
          onProgressCallback(Math.min(0.99, baseProgress + stageProgress * stageWeight));
        }
      };

      preloadedImages = await preloadAllImages(scenes, (_msg, val) => {
        updateOverallProgress(val, 0.2, 0);
      }, signal);

      preloadedImages.forEach(item => preloadedImageMap.set(item.sceneId, item));

      throwIfAborted(signal);

      stream = canvas.captureStream(config.fps);
      console.log(`[Video Rendering Service] Canvas stream captured at ${config.fps} FPS.`);

      const mimeTypeCandidates: Array<{ type: string; format: 'webm' | 'mp4' }> = [
        { type: 'video/webm;codecs=vp9', format: 'webm' },
        { type: 'video/webm;codecs=vp8', format: 'webm' },
        { type: 'video/webm', format: 'webm' },
        { type: 'video/mp4;codecs="avc1.42E01E, mp4a.40.2"', format: 'mp4' },
        { type: 'video/mp4;codecs="avc1.4D401E, mp4a.40.2"', format: 'mp4' },
        { type: 'video/mp4', format: 'mp4' },
      ];

      let chosenMimeType = '';
      let chosenFormat: 'webm' | 'mp4' = 'webm';
      for (const candidate of mimeTypeCandidates) {
        if (MediaRecorder.isTypeSupported(candidate.type)) {
          chosenMimeType = candidate.type;
          chosenFormat = candidate.format;
          break;
        }
      }

      if (!chosenMimeType) {
        console.warn('[Video Rendering Service] No preferred MIME type reported as supported. Falling back to browser default MediaRecorder settings.');
      } else {
        console.log(`[Video Rendering Service] Using MIME type: ${chosenMimeType}`);
      }

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: config.bitrate || MEDIA_RECORDER_DEFAULT_BITRATE,
      };
      if (chosenMimeType) {
        recorderOptions.mimeType = chosenMimeType;
      }

      mediaRecorder = new MediaRecorder(stream, recorderOptions);
      console.log(`[Video Rendering Service] MediaRecorder initialized with bitrate: ${recorderOptions.videoBitsPerSecond}${chosenMimeType ? ` and MIME type ${chosenMimeType}` : ''}`);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopStream();
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        console.log('[Video Rendering Service] MediaRecorder stopped. Total chunks:', recordedChunks.length);
        if (aborted) {
          safeReject(createAbortError());
          return;
        }
        if (recordedChunks.length === 0) {
          console.warn('[Video Rendering Service] No data recorded. This might result in an empty or very short video.');
        }
        const blob = new Blob(recordedChunks, { type: chosenMimeType || 'video/webm' });
        const resolvedMimeType = blob.type || chosenMimeType || 'video/webm';
        const resolvedFormat: 'webm' | 'mp4' = resolvedMimeType.includes('mp4') ? 'mp4' : chosenFormat;
        console.log(`[Video Rendering Service] Video blob created, size: ${blob.size}, type: ${resolvedMimeType}`);
        if (onProgressCallback) onProgressCallback(1);
        safeResolve({ blob, mimeType: resolvedMimeType, format: resolvedFormat });
      };

      mediaRecorder.onerror = (event) => {
        const mediaRecorderError = (event as MediaRecorderErrorEvent).error;
        let errorName = 'unknown';
        if (mediaRecorderError) {
          errorName = mediaRecorderError.name || mediaRecorderError.message || 'unknown';
        } else if (event && 'type' in event) {
          errorName = `Event type: ${(event as Event).type}`;
        }
        console.error(`[Video Rendering Service] MediaRecorder error: ${errorName}`, mediaRecorderError || event);
        safeReject(new Error(`MediaRecorder error: ${errorName}`));
      };

      abortHandler = () => {
        if (settled || aborted) {
          return;
        }
        aborted = true;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          try {
            mediaRecorder.stop();
          } catch (err) {
            console.warn('[Video Rendering Service] Error stopping MediaRecorder after abort.', err);
            safeReject(createAbortError());
          }
        } else {
          safeReject(createAbortError());
        }
      };

      if (signal) {
        if (signal.aborted) {
          abortHandler();
          return;
        }
        signal.addEventListener('abort', abortHandler);
      }

      console.log('[Video Rendering Service] Starting MediaRecorder with timeslice:', MEDIA_RECORDER_TIMESLICE_MS);
      mediaRecorder.start(MEDIA_RECORDER_TIMESLICE_MS);

      let currentSceneIndex = 0;
      let currentFrameInScene = 0;
      let totalFramesRenderedOverall = 0;
      const totalFramesToRenderOverall = scenes.reduce(
        (acc, scene) => acc + Math.max(1, Math.round(scene.duration * config.fps)),
        0,
      );

      console.log(`[Video Rendering Service] Starting requestAnimationFrame loop. Total scenes: ${scenes.length}, Total frames to render: ${totalFramesToRenderOverall}`);

      const renderFrame = () => {
        if (settled || aborted || signal?.aborted) {
          return;
        }

        if (currentSceneIndex >= scenes.length) {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
              mediaRecorder.stop();
            } catch (err) {
              console.warn('[Video Rendering Service] Error stopping MediaRecorder after completing scenes.', err);
              safeReject(err instanceof Error ? err : new Error(String(err)));
            }
          } else if (!aborted && mediaRecorder && mediaRecorder.state !== 'inactive') {
            console.warn('[Video Rendering Service] MediaRecorder was not recording but not inactive, attempting stop. State:', mediaRecorder.state);
            try {
              mediaRecorder.stop();
            } catch (err) {
              console.warn('[Video Rendering Service] Error stopping MediaRecorder during cleanup.', err);
              safeReject(err instanceof Error ? err : new Error(String(err)));
            }
          } else if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            if (!aborted) {
              safeReject(new Error('MediaRecorder stopped prematurely or failed to record data.'));
            }
          }
          return;
        }

        const scene = scenes[currentSceneIndex];
        const preloadedImgData = preloadedImageMap.get(scene.id);

        if (!preloadedImgData) {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
              mediaRecorder.stop();
            } catch (err) {
              console.warn('[Video Rendering Service] Error stopping MediaRecorder after missing preloaded image.', err);
            }
          }
          safeReject(new Error(`Internal error: Preloaded image missing for scene ${scene.id}`));
          return;
        }

        const numFramesForThisScene = Math.max(1, Math.round(scene.duration * config.fps));
        const progressInThisScene = numFramesForThisScene <= 1 ? 1 : currentFrameInScene / (numFramesForThisScene - 1);

        try {
          drawImageWithKenBurns(ctx, preloadedImgData, canvasWidth, canvasHeight, progressInThisScene, scene.kenBurnsConfig);
          if (options.includeWatermark) {
            drawWatermark(ctx, canvasWidth, canvasHeight, WATERMARK_TEXT);
          }
        } catch (drawError) {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
              mediaRecorder.stop();
            } catch (err) {
              console.warn('[Video Rendering Service] Error stopping MediaRecorder after draw failure.', err);
            }
          }
          const errorToReject = drawError instanceof Error ? drawError : new Error(String(drawError));
          safeReject(errorToReject);
          return;
        }

        currentFrameInScene++;
        totalFramesRenderedOverall++;

        if (totalFramesToRenderOverall > 0) {
          updateOverallProgress(totalFramesRenderedOverall / totalFramesToRenderOverall, 0.79, 0.20);
        }

        if (currentFrameInScene >= numFramesForThisScene) {
          currentSceneIndex++;
          currentFrameInScene = 0;
        }

        animationFrameId = requestAnimationFrame(renderFrame);
      };

      animationFrameId = requestAnimationFrame(renderFrame);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error || 'Unknown error during video processing'));
      if (isAbortError(normalizedError)) {
        aborted = true;
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try {
          mediaRecorder.stop();
        } catch (err) {
          console.warn('[Video Rendering Service] Error stopping MediaRecorder after exception.', err);
        }
      }
      safeReject(normalizedError);
    }
  });
};

export const generateWebMFromScenes = (
  scenes: Scene[],
  aspectRatio: AspectRatio,
  options: VideoRenderOptions,
  onProgressCallback?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<GeneratedVideoResult> => {
  const mode = options.mode ?? 'preview';
  const config = getRenderConfig(mode);

  if (hasWebCodecsSupport()) {
    return generateWebMWithWebCodecs(scenes, aspectRatio, options, config, onProgressCallback, signal).catch(error => {
      console.warn('[Video Rendering Service] WebCodecs renderer failed, falling back to MediaRecorder.', error);
      return generateWebMWithMediaRecorder(scenes, aspectRatio, options, config, onProgressCallback, signal);
    });
  }

  return generateWebMWithMediaRecorder(scenes, aspectRatio, options, config, onProgressCallback, signal);
};
