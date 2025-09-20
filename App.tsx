
// Timestamp: 2024-09-12T10:00:00Z - Refresh
import React, { useState, useCallback, useEffect, useRef } from 'react';
import TextInputArea from './components/TextInputArea.tsx';
import Controls from './components/Controls.tsx';
import VideoPreview from './components/VideoPreview.tsx';
import ProgressBar from './components/ProgressBar.tsx';
import SceneEditor from './components/SceneEditor.tsx'; // New Component
import { Scene, AspectRatio, GeminiSceneResponseItem } from './types.ts';
import { APP_TITLE, DEFAULT_ASPECT_RATIO, API_KEY, IS_PREMIUM_USER } from './constants.ts';
import { analyzeNarrationWithGemini, generateImageWithImagen } from './services/geminiService.ts';
import { processNarrationToScenes, fetchPlaceholderFootageUrl, normalizeGeminiScenes } from './services/videoService.ts';
import { generateWebMFromScenes } from './services/videoRenderingService.ts';
import { convertWebMToMP4 } from './services/mp4ConversionService.ts';
import { generateAIVideo } from './services/aiVideoGenerationService.ts';
import { SparklesIcon } from './components/IconComponents.tsx';

const premiumUser = IS_PREMIUM_USER;

interface AppProps { onBackToLanding?: () => void; }

const App: React.FC<AppProps> = ({ onBackToLanding }) => {
  const [narrationText, setNarrationText] = useState<string>('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState<boolean>(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]); // For non-critical issues like image fallback
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [progressValue, setProgressValue] = useState<number>(0);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(false);
  const [useAiImages, setUseAiImages] = useState<boolean>(false);
  const [useAiVideo, setUseAiVideo] = useState<boolean>(false);

  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoFormat, setPreviewVideoFormat] = useState<'webm' | 'mp4'>('webm');
  const [isPreparingPreviewVideo, setIsPreparingPreviewVideo] = useState<boolean>(false);
  const [previewNeedsRefresh, setPreviewNeedsRefresh] = useState<boolean>(false);
  const [browserSupportsWebM, setBrowserSupportsWebM] = useState<boolean>(true);

  
  const [isPreparingDownloadVideo, setIsPreparingDownloadVideo] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle');
  const [downloadFormatState, setDownloadFormatState] = useState<'webm' | 'mp4'>('webm');
  const [downloadVideoBlob, setDownloadVideoBlob] = useState<Blob | null>(null);
  const [downloadVideoFormat, setDownloadVideoFormat] = useState<'webm' | 'mp4'>('webm');
  const [isPreparingDownloadVideo, setIsPreparingDownloadVideo] = useState<boolean>(false);
  const [downloadNeedsRefresh, setDownloadNeedsRefresh] = useState<boolean>(false);


  const [isTTSEnabled, setIsTTSEnabled] = useState<boolean>(premiumUser);
  const [ttsPlaybackStatus, setTTSPlaybackStatus] = useState<'idle' | 'playing' | 'paused' | 'ended'>('idle');
  const currentSpeechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const analysisCacheRef = useRef<GeminiSceneResponseItem[] | null>(null);
  const previewRenderTokenRef = useRef(0);
  const previewRenderPromiseRef = useRef<Promise<Blob | null> | null>(null);
  const previewVideoBlobRef = useRef<Blob | null>(null);
  const previewVideoFormatRef = useRef<'webm' | 'mp4'>('webm');
  const previewVideoUrlRef = useRef<string | null>(null);


  const downloadJobIdRef = useRef(0);
  const downloadVideoBlobRef = useRef<Blob | null>(null);
  const downloadFormatRef = useRef<'webm' | 'mp4'>('webm');
  const downloadReadySignatureRef = useRef<string | null>(null);
  const downloadActiveSignatureRef = useRef<string | null>(null);

  const downloadRenderTokenRef = useRef(0);
  const downloadRenderPromiseRef = useRef<Promise<Blob | null> | null>(null);
  const downloadVideoBlobRef = useRef<Blob | null>(null);
  const downloadVideoFormatRef = useRef<'webm' | 'mp4'>('webm');


  const showPreview = scenes.length > 0 || isGeneratingScenes || isRenderingVideo;
  const [previewMounted, setPreviewMounted] = useState(showPreview);

  useEffect(() => {
    if (showPreview) {
      setPreviewMounted(true);
    } else {
      const t = setTimeout(() => setPreviewMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [showPreview]);

  useEffect(() => {
    return () => {
      if (previewVideoUrlRef.current) {
        URL.revokeObjectURL(previewVideoUrlRef.current);
      }
    };
  }, []);

  const updatePreviewVideo = useCallback((blob: Blob | null, format: 'webm' | 'mp4') => {
    previewVideoBlobRef.current = blob;
    previewVideoFormatRef.current = format;
    setPreviewVideoFormat(format);
    setPreviewVideoUrl(prevUrl => {
      if (prevUrl) {
        URL.revokeObjectURL(prevUrl);
      }
      if (!blob) {
        previewVideoUrlRef.current = null;
        return null;
      }
      const newUrl = URL.createObjectURL(blob);
      previewVideoUrlRef.current = newUrl;
      return newUrl;
    });
  }, []);

  const updateDownloadVideo = useCallback((blob: Blob | null, format: 'webm' | 'mp4') => {
    downloadVideoBlobRef.current = blob;
    downloadVideoFormatRef.current = format;
    setDownloadVideoBlob(blob);
    setDownloadVideoFormat(format);
  }, []);

  const resetDownloadVideo = useCallback(() => {
    downloadRenderTokenRef.current += 1;
    downloadRenderPromiseRef.current = null;
    setIsPreparingDownloadVideo(false);
    setDownloadNeedsRefresh(false);
    updateDownloadVideo(null, 'webm');
  }, [updateDownloadVideo]);

  const resetPreviewVideo = useCallback(() => {
    previewRenderTokenRef.current += 1;
    if (previewRenderPromiseRef.current) {
      previewRenderPromiseRef.current = null;
    }
    setIsPreparingPreviewVideo(false);
    setPreviewNeedsRefresh(false);
    updatePreviewVideo(null, 'webm');

    markDownloadStale();
  }, [markDownloadStale, updatePreviewVideo]);

    resetDownloadVideo();
  }, [resetDownloadVideo, updatePreviewVideo]);

  const invalidateDownloadVideo = useCallback(() => {
    if (isRenderingVideo) {
      setDownloadNeedsRefresh(true);
      return;
    }
    resetDownloadVideo();
    setDownloadNeedsRefresh(true);
  }, [isRenderingVideo, resetDownloadVideo]);


  const gridColsClass = showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1';


  useEffect(() => {
    if (!API_KEY) {
      setApiKeyMissing(true);
      setError("Critical: Gemini API Key is missing. Please set the API_KEY environment variable for AI features to work. The application will not function correctly without it.");
    }
    if (typeof window.speechSynthesis === 'undefined') {
      setIsTTSEnabled(false);
      console.warn("SpeechSynthesis API not supported in this browser. TTS feature disabled.");
    }

    if (typeof document !== 'undefined') {
      const testVideo = document.createElement('video');
      const canPlayWebM = Boolean(
        testVideo.canPlayType('video/webm; codecs="vp9"') ||
        testVideo.canPlayType('video/webm; codecs="vp8, vorbis"') ||
        testVideo.canPlayType('video/webm')
      );
      setBrowserSupportsWebM(canPlayWebM);
    }

    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const addWarning = useCallback((message: string) => {
    setWarnings(prev => [...prev, message]);
  }, []);

  const computeSceneSignature = useCallback((sceneList: Scene[], ratio: AspectRatio, watermark: boolean) => {
    const header = `${ratio}|${watermark ? 'wm' : 'no-wm'}`;
    const body = sceneList
      .map(scene => `${scene.id}:${scene.duration}:${scene.footageUrl || ''}:${scene.sceneText}`)
      .join('|');
    return `${header}|${body}`;
  }, []);

  const markDownloadStale = useCallback(() => {
    downloadJobIdRef.current += 1;
    downloadVideoBlobRef.current = null;
    downloadFormatRef.current = 'webm';
    downloadReadySignatureRef.current = null;
    downloadActiveSignatureRef.current = null;
    setDownloadStatus('idle');
    setDownloadFormatState('webm');
    setIsPreparingDownloadVideo(false);
  }, []);

  const storeDownloadResult = useCallback((blob: Blob, format: 'webm' | 'mp4', signature: string) => {
    downloadVideoBlobRef.current = blob;
    downloadFormatRef.current = format;
    downloadReadySignatureRef.current = signature;
    setDownloadStatus('ready');
    setDownloadFormatState(format);
  }, []);

  const renderPreviewVideo = useCallback(async (
    scenesToRender: Scene[],
    ratio: AspectRatio,
    token: number
  ): Promise<Blob | null> => {
    if (scenesToRender.length === 0) {
      return null;
    }

    setIsPreparingPreviewVideo(true);
    setProgressMessage('Rendering preview video file...');
    setProgressValue(0);

    try {
      const generatedVideo = await generateWebMFromScenes(
        scenesToRender,
        ratio,
        { includeWatermark, mode: 'preview' },
        (p) => {
          if (previewRenderTokenRef.current !== token) {
            return;
          }
          setProgressValue(Math.round(p * 100));
          if (p < 1) {
            setProgressMessage('Rendering preview video file...');
          }
        }
      );

      if (previewRenderTokenRef.current !== token) {
        return null;
      }

      let previewBlob: Blob = generatedVideo.blob;
      let previewFormat: 'webm' | 'mp4' = generatedVideo.format;

      if (previewFormat === 'webm' && !browserSupportsWebM) {
        const canAttemptConversion = typeof window !== 'undefined' && window.crossOriginIsolated;
        if (canAttemptConversion) {
          setProgressMessage('Converting preview to MP4 for playback...');
          try {
            const mp4Blob = await convertWebMToMP4(generatedVideo.blob, (convProg) => {
              if (previewRenderTokenRef.current !== token) {
                return;
              }
              setProgressMessage(`Converting preview to MP4: ${Math.round(convProg * 100)}%`);
              setProgressValue(80 + Math.round(convProg * 20));
            });

            if (previewRenderTokenRef.current === token) {
              previewBlob = mp4Blob;
              previewFormat = 'mp4';
            }
          } catch (conversionError) {
            if (previewRenderTokenRef.current === token) {
              console.error('Preview MP4 conversion failed. Falling back to WebM preview.', conversionError);
              addWarning('Preview video could not be converted to MP4 automatically. Use the download button to convert if playback fails.');
            }
          }
        } else if (previewRenderTokenRef.current === token) {
          addWarning('This browser cannot play WebM previews. Use Download Video to convert the file to MP4.');
        }
      }

      if (previewRenderTokenRef.current !== token) {
        return null;
      }

      updatePreviewVideo(previewBlob, previewFormat);
      invalidateDownloadVideo();
      setProgressMessage(`${previewFormat.toUpperCase()} preview ready!`);
      setProgressValue(100);

      window.setTimeout(() => {
        if (previewRenderTokenRef.current === token && !isRenderingVideo) {
          setProgressMessage('');
          setProgressValue(0);
        }
      }, 2500);

      return previewBlob;
    } catch (error) {
      if (previewRenderTokenRef.current === token) {
        console.error('Error rendering preview video file:', error);
        addWarning('Failed to render the preview video file. You can still trigger a download to regenerate it.');
        setProgressMessage('Preview video unavailable.');
        setProgressValue(0);
      }
      return null;
    } finally {
      if (previewRenderTokenRef.current === token) {
        setIsPreparingPreviewVideo(false);
      }
    }
  }, [addWarning, browserSupportsWebM, includeWatermark, invalidateDownloadVideo, isRenderingVideo, updatePreviewVideo]);

  const renderDownloadVideo = useCallback(async (
    scenesToRender: Scene[],
    ratio: AspectRatio,
    token: number,
    { reportProgress }: { reportProgress: boolean }
  ): Promise<Blob | null> => {
    if (scenesToRender.length === 0) {
      return null;
    }

    setIsPreparingDownloadVideo(true);
    if (reportProgress) {
      setProgressMessage('Rendering download-ready video...');
      setProgressValue(0);
    }

    try {
      const generatedVideo = await generateWebMFromScenes(
        scenesToRender,
        ratio,
        { includeWatermark, mode: 'download' },
        reportProgress
          ? (p) => {
              if (downloadRenderTokenRef.current !== token) {
                return;
              }
              setProgressValue(Math.round(p * 100));
              if (p < 1) {
                setProgressMessage('Rendering download-ready video...');
              }
            }
          : undefined
      );

      if (downloadRenderTokenRef.current !== token) {
        return null;
      }

      updateDownloadVideo(generatedVideo.blob, generatedVideo.format);

      if (reportProgress) {
        setProgressMessage(`${generatedVideo.format.toUpperCase()} download-ready video prepared!`);
        setProgressValue(100);

        window.setTimeout(() => {
          if (downloadRenderTokenRef.current === token && !isRenderingVideo) {
            setProgressMessage('');
            setProgressValue(0);
          }
        }, 2500);
      }

      return generatedVideo.blob;
    } catch (error) {
      if (downloadRenderTokenRef.current === token) {
        console.error('Error rendering download-ready video file:', error);
        if (reportProgress) {
          setProgressMessage('Download-ready video unavailable.');
          setProgressValue(0);
        }
        addWarning('Failed to prepare the high-quality video. Try downloading again.');
      }
      return null;
    } finally {
      if (downloadRenderTokenRef.current === token) {
        setIsPreparingDownloadVideo(false);
      }
    }
  }, [addWarning, includeWatermark, isRenderingVideo, updateDownloadVideo]);

  useEffect(() => {
    if (!previewNeedsRefresh) {
      return;
    }
    if (isGeneratingScenes) {
      return;
    }
    if (scenes.length === 0) {
      resetPreviewVideo();
      return;
    }

    const token = ++previewRenderTokenRef.current;
    const renderPromise = renderPreviewVideo(scenes, aspectRatio, token);
    previewRenderPromiseRef.current = renderPromise;

    let cancelled = false;

    renderPromise.finally(() => {
      if (cancelled) {
        return;
      }
      if (previewRenderTokenRef.current === token) {
        previewRenderPromiseRef.current = null;
        setPreviewNeedsRefresh(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [previewNeedsRefresh, scenes, aspectRatio, isGeneratingScenes, renderPreviewVideo, resetPreviewVideo]);

  useEffect(() => {

    if (scenes.length === 0 || isGeneratingScenes) {
      markDownloadStale();
      return;
    }

    const signature = computeSceneSignature(scenes, aspectRatio, includeWatermark);

    if (
      downloadReadySignatureRef.current === signature ||
      downloadActiveSignatureRef.current === signature ||
      isRenderingVideo
    ) {
      return;
    }

    const jobId = ++downloadJobIdRef.current;
    downloadActiveSignatureRef.current = signature;
    setDownloadStatus(prev => (prev === 'ready' ? prev : 'preparing'));
    setIsPreparingDownloadVideo(true);

    let cancelled = false;
    const scenesSnapshot = [...scenes];

    generateWebMFromScenes(scenesSnapshot, aspectRatio, { includeWatermark, mode: 'download' })
      .then(result => {
        if (cancelled || downloadJobIdRef.current !== jobId) {
          return;
        }
        storeDownloadResult(result.blob, result.format, signature);
      })
      .catch(error => {
        if (cancelled || downloadJobIdRef.current !== jobId) {
          return;
        }
        console.error('Error preparing download video:', error);
        setDownloadStatus('error');
        addWarning('Failed to pre-render the high-quality download. Use the download button to retry.');
      })
      .finally(() => {
        if (cancelled || downloadJobIdRef.current !== jobId) {
          return;
        }
        setIsPreparingDownloadVideo(false);
        downloadActiveSignatureRef.current = null;
      });

    return () => {
      cancelled = true;
      if (downloadActiveSignatureRef.current === signature) {
        downloadActiveSignatureRef.current = null;
      }
    };
  }, [
    scenes,
    aspectRatio,
    includeWatermark,
    isGeneratingScenes,
    isRenderingVideo,
    computeSceneSignature,
    markDownloadStale,
    storeDownloadResult,
    addWarning,

    if (!downloadNeedsRefresh) {
      return;
    }
    if (isGeneratingScenes || isRenderingVideo) {
      return;
    }
    if (scenes.length === 0) {
      resetDownloadVideo();
      return;
    }

    const token = ++downloadRenderTokenRef.current;
    const renderPromise = renderDownloadVideo(scenes, aspectRatio, token, { reportProgress: false });
    downloadRenderPromiseRef.current = renderPromise;

    let cancelled = false;

    renderPromise.finally(() => {
      if (cancelled) {
        return;
      }
      if (downloadRenderTokenRef.current === token) {
        downloadRenderPromiseRef.current = null;
        setDownloadNeedsRefresh(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    downloadNeedsRefresh,
    scenes,
    aspectRatio,
    isGeneratingScenes,
    isRenderingVideo,
    renderDownloadVideo,
    resetDownloadVideo,

  ]);

 const handleSceneGenerationProgress = useCallback((
    message: string, 
    valueWithinStage: number, // 0 to 1 for current stage
    stage: 'analysis' | 'ai_image' | 'placeholder_image' | 'finalizing',
    current?: number, 
    total?: number,
    errorMsg?: string
  ) => {
    let fullMessage = message;
    if (errorMsg) addWarning(errorMsg); // Add error messages as warnings

    let overallProgress = 0;
    const analysisWeight = 0.1; // 10%
    const imageProcessingWeight = 0.8; // 80%
    const finalizingWeight = 0.1; // 10%

    switch(stage) {
        case 'analysis':
            overallProgress = valueWithinStage * analysisWeight;
            if (valueWithinStage === 1) fullMessage = "Narration analysis complete.";
            break;
        case 'ai_image':
        case 'placeholder_image':
            overallProgress = analysisWeight + (valueWithinStage * imageProcessingWeight);
            if (current && total) {
                const imageType = stage === 'ai_image' ? 'AI image' : 'placeholder';
                fullMessage = `Processing ${imageType} ${current}/${total}... ${message.replace(/Processing scene.*?\.\.\./, '')}`;
            }
            break;
        case 'finalizing':
            overallProgress = analysisWeight + imageProcessingWeight + (valueWithinStage * finalizingWeight);
            if (valueWithinStage === 1) fullMessage = "Scene setup complete. Preview ready!";
            break;
    }
    
    setProgressMessage(fullMessage);
    setProgressValue(Math.min(100, Math.max(0, Math.round(overallProgress * 100))));
  }, [addWarning]);


  const handleGenerateVideo = useCallback(async () => {
    if (!narrationText.trim()) {
      setError("Please enter some narration text.");
      return;
    }
    if (apiKeyMissing) {
       setError("Cannot generate video: Gemini API Key is missing.");
       return;
    }

    if (useAiVideo) {
      setIsRenderingVideo(true);
      setError(null);
      setProgressMessage('Generating AI video...');
      setProgressValue(0);
      try {
        const aiBlob = await generateAIVideo(narrationText);
        const url = URL.createObjectURL(aiBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cinesynth_ai_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setProgressMessage('AI video downloaded!');
        setProgressValue(100);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate AI video.';
        setError(msg);
        setProgressMessage('Error generating AI video.');
        setProgressValue(0);
      } finally {
        setIsRenderingVideo(false);
        setTimeout(() => { setProgressMessage(''); setProgressValue(0); }, 3000);
      }
      return;
    }

    setIsGeneratingScenes(true);
    setError(null);
    setWarnings([]); // Clear previous warnings
    setScenes([]); // Clear existing scenes for a full regeneration
    resetPreviewVideo();
    analysisCacheRef.current = null; 
    setProgressMessage('Initializing scene generation...');
    setProgressValue(0);

    try {
      handleSceneGenerationProgress('Analyzing narration with AI...', 0.5, 'analysis');
      const analysisResults: GeminiSceneResponseItem[] = await analyzeNarrationWithGemini(narrationText);
      const normalizedAnalysis = normalizeGeminiScenes(analysisResults);
      analysisCacheRef.current = normalizedAnalysis; // Cache analysis
      handleSceneGenerationProgress('Narration analyzed.', 1, 'analysis');

      if (!normalizedAnalysis || normalizedAnalysis.length === 0) {
        throw new Error("The AI could not segment the narration into scenes. Try rephrasing or adding more detail.");
      }

      const processedScenes: Scene[] = await processNarrationToScenes(
        normalizedAnalysis,
        aspectRatio,
        { useAiGeneratedImages: useAiImages },
        handleSceneGenerationProgress
      );
      
      handleSceneGenerationProgress('Video preview ready!', 1, 'finalizing');
      setScenes(processedScenes);
      setPreviewNeedsRefresh(true);

      markDownloadStale();

      invalidateDownloadVideo();

      
      setTimeout(() => {
          setProgressMessage('');
          setProgressValue(0);
      }, 2500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during scene generation.';
      console.error("Error generating scenes:", err);
      setError(errorMessage);
      setProgressMessage(`Error: ${errorMessage.substring(0,100)}...`); 
      setProgressValue(0); 
      analysisCacheRef.current = null;
    } finally {
      setIsGeneratingScenes(false);
    }
  }, [
    narrationText,
    aspectRatio,
    apiKeyMissing,
    useAiImages,
    useAiVideo,
    handleSceneGenerationProgress,
    resetPreviewVideo,

    markDownloadStale,

    invalidateDownloadVideo,

  ]);

  const handleDownloadVideo = async () => {
    if (scenes.length === 0 || isRenderingVideo) {
      return;
    }

    setIsRenderingVideo(true);
    setError(null);
    setWarnings([]);
    setProgressMessage('Preparing video download...');
    setProgressValue(0);

    const signature = computeSceneSignature(scenes, aspectRatio, includeWatermark);
    const canConvertToMp4 = typeof window !== 'undefined' && window.crossOriginIsolated;
    const jobId = ++downloadJobIdRef.current;


    downloadActiveSignatureRef.current = signature;
    setDownloadStatus('preparing');
    setIsPreparingDownloadVideo(true);

    try {
      let workingBlob = downloadVideoBlobRef.current;
      let workingFormat = downloadFormatRef.current;

      if (!workingBlob || downloadReadySignatureRef.current !== signature) {
        const result = await generateWebMFromScenes(
          scenes,
          aspectRatio,
          { includeWatermark, mode: 'download' },
          (progress) => {
            if (downloadJobIdRef.current !== jobId) {
              return;
            }
            setProgressMessage('Rendering download-ready video...');
            setProgressValue(Math.min(95, Math.round(progress * 80)));
          }
        );

        if (downloadJobIdRef.current !== jobId) {
          return;
        }

        workingBlob = result.blob;
        workingFormat = result.format;
        storeDownloadResult(result.blob, result.format, signature);
      } else {
        setProgressMessage(workingFormat === 'mp4' ? 'Preparing MP4 download...' : 'Preparing video download...');
        setProgressValue(80);
      }

      if (!workingBlob) {
        throw new Error('Video rendering failed. Please try again.');
      }

      let finalBlob: Blob = workingBlob;
      let finalFormat: 'webm' | 'mp4' = workingFormat;

    try {
      let downloadBlob: Blob | null = downloadVideoBlobRef.current;
      let downloadFormat: 'webm' | 'mp4' = downloadVideoFormatRef.current;

      if ((!downloadBlob || downloadNeedsRefresh) && downloadRenderPromiseRef.current) {
        await downloadRenderPromiseRef.current;
        downloadBlob = downloadVideoBlobRef.current;
        downloadFormat = downloadVideoFormatRef.current;
      }

      if (!downloadBlob || downloadNeedsRefresh) {
        const token = ++downloadRenderTokenRef.current;
        const manualRenderPromise = renderDownloadVideo(scenes, aspectRatio, token, { reportProgress: true });
        downloadRenderPromiseRef.current = manualRenderPromise;
        downloadBlob = await manualRenderPromise;
        downloadFormat = downloadVideoFormatRef.current;
        if (downloadRenderTokenRef.current === token) {
          downloadRenderPromiseRef.current = null;
          setDownloadNeedsRefresh(false);
        }
      } else {
        setProgressMessage(downloadFormat === 'mp4' ? 'Preparing MP4 download...' : 'Preparing video download...');
        setProgressValue(80);
      }

      if (!downloadBlob) {
        throw new Error('Video rendering failed. Please try again.');
      }

      setDownloadNeedsRefresh(false);

      let finalBlob: Blob = downloadBlob;
      let finalFormat: 'webm' | 'mp4' = downloadFormat;


      if (finalFormat !== 'mp4') {
        if (canConvertToMp4) {
          setProgressMessage('Converting to MP4...');
          setProgressValue(80);
          try {
            const mp4Blob = await convertWebMToMP4(finalBlob, (convProg) => {

              if (downloadJobIdRef.current !== jobId) {
                return;
              }
              setProgressMessage(`Converting to MP4: ${Math.round(convProg * 100)}%`);
              setProgressValue(80 + Math.round(convProg * 20));
            });

            if (downloadJobIdRef.current !== jobId) {
              return;
            }

            finalBlob = mp4Blob;
            finalFormat = 'mp4';
            storeDownloadResult(finalBlob, finalFormat, signature);

              setProgressMessage(`Converting to MP4: ${Math.round(convProg * 100)}%`);
              setProgressValue(80 + Math.round(convProg * 20));
            });
            finalBlob = mp4Blob;
            finalFormat = 'mp4';
            updateDownloadVideo(finalBlob, finalFormat);

          } catch (conversionError) {
            console.error('MP4 conversion failed. Falling back to WebM download.', conversionError);
            addWarning('MP4 conversion failed. Downloading WebM version instead.');
            setProgressMessage('Preparing WebM download...');
            setProgressValue(95);
          }
        } else {
          console.warn('Browser is not cross-origin isolated. MP4 conversion will be skipped in favour of WebM download.');
          addWarning('MP4 conversion is unavailable in this browser session. A WebM file will be downloaded instead.');
          setProgressMessage('Preparing WebM download...');
          setProgressValue(95);
        }
      }

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cinesynth_video_${Date.now()}.${finalFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgressMessage('Video downloaded!');
      setProgressValue(100);
      storeDownloadResult(finalBlob, finalFormat, signature);

      setTimeout(() => {
        setProgressMessage('');
        setProgressValue(0);
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while rendering video.';
      console.error('Error rendering video:', err);
      setError(errorMessage);
      setProgressMessage('Error rendering video.');
      setProgressValue(0);
      setDownloadStatus('error');
    } finally {
      setIsRenderingVideo(false);
      if (downloadJobIdRef.current === jobId) {
        setIsPreparingDownloadVideo(false);
        downloadActiveSignatureRef.current = null;
      }
    }
  };
  
  // TTS Handlers (no change in logic, just ensuring they are present)
  const handleTTSPlay = (text: string) => {
    if (!isTTSEnabled || typeof window.speechSynthesis === 'undefined') return;
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
    currentSpeechRef.current = new SpeechSynthesisUtterance(text);
    currentSpeechRef.current.onstart = () => setTTSPlaybackStatus('playing');
    currentSpeechRef.current.onpause = () => setTTSPlaybackStatus('paused'); 
    currentSpeechRef.current.onresume = () => setTTSPlaybackStatus('playing'); 
    currentSpeechRef.current.onend = () => { setTTSPlaybackStatus('ended'); currentSpeechRef.current = null; };
    currentSpeechRef.current.onerror = (event: SpeechSynthesisErrorEvent) => {
        if (event.error !== 'interrupted') console.error('SpeechSynthesisUtterance Error:', event.error);
        setTTSPlaybackStatus('idle'); currentSpeechRef.current = null;
    };
    window.speechSynthesis.speak(currentSpeechRef.current);
  };
  const handleTTSPause = () => { if (window.speechSynthesis?.speaking) window.speechSynthesis.pause(); };
  const handleTTSResume = () => { if (window.speechSynthesis?.paused) window.speechSynthesis.resume(); };
  const handleTTSStop = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); setTTSPlaybackStatus('idle'); currentSpeechRef.current = null; };
  const toggleTTSEnabled = (enabled: boolean) => { setIsTTSEnabled(enabled); if (!enabled) handleTTSStop(); };

  // Scene Editor Handlers
  const handleUpdateScene = (sceneId: string, updatedText: string, updatedDuration: number) => {
    setScenes(prevScenes => prevScenes.map(s =>
      s.id === sceneId ? { ...s, sceneText: updatedText, duration: Math.max(1, updatedDuration) } : s
    ));
    // Reset preview to reflect changes
    if (ttsPlaybackStatus !== 'idle') handleTTSStop();
    setPreviewNeedsRefresh(true);

    markDownloadStale();

    invalidateDownloadVideo();

  };

  const handleDeleteScene = (sceneId: string) => {
    setScenes(prevScenes => {
      const updatedScenes = prevScenes.filter(s => s.id !== sceneId);
      if (updatedScenes.length === 0) {
        resetPreviewVideo();
      } else {
        setPreviewNeedsRefresh(true);

        markDownloadStale();

        invalidateDownloadVideo();

      }
      return updatedScenes;
    });
    if (ttsPlaybackStatus !== 'idle') handleTTSStop();
  };

  const handleAddScene = async () => {
    const newSceneId = `scene-new-${Date.now()}`;
    const placeholder = await fetchPlaceholderFootageUrl(
      {
        keywords: ["new scene", "abstract"],
        sceneText: "New scene text...",
        imagePrompt: "Abstract background for a new scene"
      },
      aspectRatio,
      5,
      newSceneId
    );
    const newScene: Scene = {
      id: newSceneId,
      sceneText: "New scene text...",
      keywords: ["new scene"],
      imagePrompt: "Abstract background for a new scene",
      duration: 5,
      footageUrl: placeholder.url,
      footageType: placeholder.type,
      kenBurnsConfig: { targetScale: 1.1, targetXPercent: 0, targetYPercent: 0, originXRatio: 0.5, originYRatio: 0.5, animationDurationS: 5 }
    };
    setScenes(prevScenes => [...prevScenes, newScene]);
    setPreviewNeedsRefresh(true);

    markDownloadStale();

    invalidateDownloadVideo();

    if (ttsPlaybackStatus !== 'idle') handleTTSStop();
  };

  const handleUpdateSceneImage = async (sceneId: string) => {
    const sceneToUpdate = scenes.find(s => s.id === sceneId);
    if (!sceneToUpdate) return;

    setIsGeneratingScenes(true); // Use general generating flag for busy state
    setProgressMessage(`Updating image for scene...`);
    setProgressValue(0); // Simple progress for single image update
    
    let newFootageUrl = '';
    let errorOccurred = false;

    try {
        if (useAiImages && sceneToUpdate.imagePrompt) {
            setProgressValue(30);
            const result = await generateImageWithImagen(sceneToUpdate.imagePrompt, sceneId);
            if (result.base64Image) {
                newFootageUrl = result.base64Image;
                sceneToUpdate.footageType = 'image';
            } else {
                addWarning(result.userFriendlyError || `AI image failed for scene ${sceneId}. Using new placeholder.`);
                const placeholder = await fetchPlaceholderFootageUrl(
                  {
                    keywords: sceneToUpdate.keywords,
                    sceneText: sceneToUpdate.sceneText,
                    imagePrompt: sceneToUpdate.imagePrompt
                  },
                  aspectRatio,
                  sceneToUpdate.duration,
                  sceneId + "-retry"
                );
                newFootageUrl = placeholder.url;
                sceneToUpdate.footageType = placeholder.type;
                errorOccurred = true;
            }
        } else {
            setProgressValue(30);
            const placeholder = await fetchPlaceholderFootageUrl(
              {
                keywords: sceneToUpdate.keywords,
                sceneText: sceneToUpdate.sceneText,
                imagePrompt: sceneToUpdate.imagePrompt
              },
              aspectRatio,
              sceneToUpdate.duration,
              sceneId + "-refresh"
            );
            newFootageUrl = placeholder.url;
            sceneToUpdate.footageType = placeholder.type;
        }
        
        setScenes(prevScenes => prevScenes.map(s =>
            s.id === sceneId ? { ...s, footageUrl: newFootageUrl, footageType: sceneToUpdate.footageType } : s
        ));
        setPreviewNeedsRefresh(true);

        markDownloadStale();

        invalidateDownloadVideo();

        setProgressMessage(errorOccurred ? 'Image updated with placeholder.' : 'Image updated successfully!');
        setProgressValue(100);

    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error updating image.";
        setError(`Failed to update image for scene ${sceneId}: ${msg}`);
        setProgressMessage('Error updating image.');
    } finally {
        setIsGeneratingScenes(false);
        setTimeout(() => { setProgressMessage(''); setProgressValue(0); }, 2000);
         if (ttsPlaybackStatus !== 'idle') handleTTSStop(); // Reset TTS if it was playing
    }
  };

  const handleIncludeWatermarkChange = (value: boolean) => {
    setIncludeWatermark(value);
    if (scenes.length > 0) {
      setPreviewNeedsRefresh(true);

      markDownloadStale();

      invalidateDownloadVideo();

    }
  };


  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8 text-center">
        <div className="flex items-center justify-center space-x-3">
           <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
           <h1
             className="glitch text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
             style={{ fontFamily: 'Fira Code' }}
             data-text={APP_TITLE}
           >
             {APP_TITLE}
           </h1>
        </div>
        <p className="mt-2 text-base sm:text-lg text-gray-400">
          Transform text into videos with AI-powered visuals and spoken narration.
        </p>
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="mt-4 text-sm text-fuchsia-400 hover:underline"
          >
            Back to Landing Page
          </button>
        )}
      </header>

      {apiKeyMissing && (
         <div className="w-full max-w-3xl p-4 mb-6 bg-red-800 border border-red-700 text-red-100 rounded-md shadow-lg text-center">
            <strong>Critical Configuration Error:</strong> Gemini API Key (API_KEY) is not set. AI features require this key. Please configure it in your environment.
         </div>
      )}

      <div className="w-full max-w-5xl space-y-6">
        <div className={`grid grid-cols-1 ${gridColsClass} gap-6 sm:gap-8 transition-all`}>
        <div className="space-y-6">
          <div className="p-4 sm:p-6 bg-neutral-800/70 backdrop-blur-lg border border-neutral-600 rounded-2xl shadow-lg">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white" style={{ fontFamily: 'Fira Code' }}>1. Enter Your Narration</h2>
            <TextInputArea
              value={narrationText}
              onChange={setNarrationText}
              placeholder="e.g., The city awakens. Cars hum on distant highways. A new day begins..."
              disabled={isGeneratingScenes || apiKeyMissing || isRenderingVideo}
            />
          </div>
          <div className="p-4 sm:p-6 bg-neutral-800/70 backdrop-blur-lg border border-neutral-600 rounded-2xl shadow-lg">
             <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white" style={{ fontFamily: 'Fira Code' }}>2. Configure & Generate</h2>
            <Controls
              aspectRatio={aspectRatio}
              onAspectRatioChange={(ratio) => {
                setAspectRatio(ratio);
                if (scenes.length > 0) {
                    addWarning("Aspect ratio changed. Visuals may need to be updated for existing scenes. Consider regenerating or updating images individually.");
                    setPreviewNeedsRefresh(true);

                    markDownloadStale();

                    invalidateDownloadVideo();

                }
              }}
              onGenerate={handleGenerateVideo}
              isGenerating={isGeneratingScenes || isRenderingVideo}
              hasScenes={scenes.length > 0}
              narrationText={narrationText}
              includeWatermark={includeWatermark}
              onIncludeWatermarkChange={handleIncludeWatermarkChange}
              isTTSEnabled={isTTSEnabled}
              onTTSEnabledChange={toggleTTSEnabled}
              ttsSupported={typeof window.speechSynthesis !== 'undefined'}
              useAiImages={useAiImages}
              onUseAiImagesChange={setUseAiImages}
              useAiVideo={useAiVideo}
              onUseAiVideoChange={setUseAiVideo}
              apiKeyMissing={apiKeyMissing}
              isPremiumUser={premiumUser}
            />
          </div>
        </div>

        {previewMounted && (
        <div className={`p-1 sm:p-2 bg-neutral-800/70 backdrop-blur-lg border border-neutral-600 rounded-2xl shadow-lg transition-opacity duration-500 ${showPreview ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           <h2 className="text-xl sm:text-2xl font-semibold mb-2 sm:mb-4 text-white px-3 py-2" style={{ fontFamily: 'Fira Code' }}>3. Preview Your Video</h2>
          <VideoPreview
            scenes={scenes}
            aspectRatio={aspectRatio}
            onDownloadRequest={handleDownloadVideo}
            isGenerating={isGeneratingScenes}
            isDownloading={isRenderingVideo}
            isPreparingVideoFile={isPreparingPreviewVideo}
            isPreparingDownload={isPreparingDownloadVideo}

            isDownloadReady={downloadStatus === 'ready'}

            isDownloadReady={Boolean(downloadVideoBlob)}

            isTTSEnabled={isTTSEnabled}
            onTTSPlay={handleTTSPlay}
            onTTSPause={handleTTSPause}
            onTTSResume={handleTTSResume}
            onTTSStop={handleTTSStop}
            ttsPlaybackStatus={ttsPlaybackStatus}
            videoUrl={previewVideoUrl}
            videoFormat={previewVideoFormat}

            downloadFormat={downloadFormatState}
            downloadStatus={downloadStatus}

            downloadFormat={downloadVideoFormat}

          />
        </div>
        )}
      </div>
      
      {scenes.length > 0 && !isGeneratingScenes && !isRenderingVideo && (
        <div className="w-full max-w-5xl mt-6 sm:mt-8">
            <SceneEditor 
                scenes={scenes}
                onUpdateScene={handleUpdateScene}
                onDeleteScene={handleDeleteScene}
                onAddScene={handleAddScene}
                onUpdateSceneImage={handleUpdateSceneImage}
                aspectRatio={aspectRatio}
                isGenerating={isGeneratingScenes || isRenderingVideo}
                apiKeyMissing={apiKeyMissing}
                useAiImagesGlobal={useAiImages}
            />
        </div>
      )}

      {((isGeneratingScenes || isRenderingVideo)) && progressValue >= 0 && ( // Show progress if value is 0 or more
        <div className="w-full max-w-3xl mt-6">
          <ProgressBar progress={progressValue} message={progressMessage} />
        </div>
      )}

      {error && (
        <div className="w-full max-w-3xl mt-6 p-4 bg-red-800 border border-red-600 text-red-100 rounded-md shadow-lg text-center" role="alert">
          <strong>Error:</strong> {error}
          <button onClick={() => setError(null)} className="ml-4 px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded">Dismiss</button>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="w-full max-w-3xl mt-4 p-4 bg-yellow-700 border border-yellow-600 text-yellow-100 rounded-md shadow-lg" role="status">
            <h4 className="font-semibold mb-2">Notices / Warnings:</h4>
            <ul className="list-disc list-inside text-sm">
                {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                ))}
            </ul>
            <button onClick={() => setWarnings([])} className="mt-3 px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 rounded">Dismiss Warnings</button>
        </div>
      )}

      </div>

      <footer className="mt-8 sm:mt-12 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} {APP_TITLE}. AI-powered video creation.</p>
        <p>Visuals can be AI-generated or placeholders. Narration preview with TTS. WebM video download.</p>
      </footer>
    </div>
  );
};

export default App;
