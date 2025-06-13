
import React, { useState, useEffect, useRef } from 'react';
import { Scene, AspectRatio, KenBurnsConfig } from '../types.ts';
import { PlayIcon, PauseIcon, DownloadIcon } from './IconComponents.tsx';

const FADE_DURATION_MS = 1000; // 1 second for cross-fade

interface ImageSlotState {
  scene: Scene | null;
  opacity: number;
  zIndex: number;
  transform: string;
  transformOrigin: string;
  transition: string;
}

interface VideoPreviewProps {
  scenes: Scene[];
  aspectRatio: AspectRatio;
  onDownloadRequest: () => void;
  isGenerating: boolean;
  isDownloading?: boolean;
  isTTSEnabled: boolean;
  onTTSPlay: (text: string) => void;
  onTTSPause: () => void;
  onTTSResume: () => void;
  onTTSStop: () => void;
  ttsPlaybackStatus: 'idle' | 'playing' | 'paused' | 'ended';
}

const getDefaultSlotState = (): ImageSlotState => ({
  scene: null,
  opacity: 0,
  zIndex: 0,
  transform: 'scale(1) translate(0%, 0%)',
  transformOrigin: 'center center',
  transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
});

const VideoPreview: React.FC<VideoPreviewProps> = ({
  scenes,
  aspectRatio,
  onDownloadRequest,
  isGenerating,
  isDownloading,
  isTTSEnabled,
  onTTSPlay,
  onTTSPause,
  onTTSResume,
  onTTSStop,
  ttsPlaybackStatus
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [imageSlots, setImageSlots] = useState<[ImageSlotState, ImageSlotState]>([
    getDefaultSlotState(), getDefaultSlotState()
  ]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  const sceneTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const animationTriggerTimeoutRef = useRef<number | null>(null);

  const currentScene = scenes[currentSceneIndex];

  // Effect for initial scene load and regeneration
  useEffect(() => {
    if (scenes.length > 0 && !isGenerating) {
      setCurrentSceneIndex(0);
      setActiveSlotIndex(0);
      setImageSlots([getDefaultSlotState(), getDefaultSlotState()]);
      setElapsedTime(0);
      setIsPlaying(true); 
    } else if (scenes.length === 0 || isGenerating) {
      setIsPlaying(false);
      onTTSStop(); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, isGenerating]);


  // Main playback and transition effect
  useEffect(() => {
    if (animationTriggerTimeoutRef.current) clearTimeout(animationTriggerTimeoutRef.current);
    if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    if (!isPlaying || !currentScene || scenes.length === 0) {
      if (!isPlaying && ttsPlaybackStatus === 'playing') onTTSPause();
      if (isPlaying && ttsPlaybackStatus === 'paused' && scenes.length > 0) onTTSResume();
      
      if (!currentScene || scenes.length === 0) {
         setImageSlots(prevSlots => [
            {...prevSlots[0], opacity: 0},
            {...prevSlots[1], opacity: 0}
        ]);
      }
      return;
    }

    if (isTTSEnabled) {
      onTTSPlay(currentScene.sceneText);
    } else {
      onTTSStop();
    }

    const primarySlot = activeSlotIndex;
    const secondarySlot = 1 - activeSlotIndex;
    const sceneDurationMs = currentScene.duration * 1000;
    const kbConfig = currentScene.kenBurnsConfig; // Use stored config

    const initialCSSTransform = `scale(1) translate(0%, 0%)`;
    const targetCSSTransform = `scale(${kbConfig.targetScale}) translate(${kbConfig.targetXPercent}%, ${kbConfig.targetYPercent}%)`;
    const cssTransformOrigin = `${kbConfig.originXRatio * 100}% ${kbConfig.originYRatio * 100}%`;

    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots] as [ImageSlotState, ImageSlotState];
      newSlots[primarySlot] = {
        scene: currentScene,
        opacity: 1,
        zIndex: 10,
        transform: initialCSSTransform,
        transformOrigin: cssTransformOrigin,
        transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
      };
      if (newSlots[secondarySlot].opacity !== 0) {
        newSlots[secondarySlot] = { ...newSlots[secondarySlot], opacity: 0, zIndex: 5 };
      } else {
        newSlots[secondarySlot].zIndex = 5;
      }
      return newSlots;
    });

    animationTriggerTimeoutRef.current = window.setTimeout(() => {
      setImageSlots(prevSlots => {
        const newSlots = [...prevSlots] as [ImageSlotState, ImageSlotState];
        if (newSlots[primarySlot].scene?.id === currentScene.id) {
          newSlots[primarySlot].transform = targetCSSTransform;
          newSlots[primarySlot].transition = `opacity ${FADE_DURATION_MS}ms ease-in-out, transform ${kbConfig.animationDurationS}s linear`;
        }
        return newSlots;
      });
    }, 50); // Small delay to ensure state update for opacity transition then apply transform

    setElapsedTime(0);
    progressIntervalRef.current = window.setInterval(() => {
      setElapsedTime(prevTime => {
        const nextTime = prevTime + 100;
        if (nextTime >= sceneDurationMs) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return sceneDurationMs;
        }
        return nextTime;
      });
    }, 100);

    sceneTimeoutRef.current = window.setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      if (currentSceneIndex < scenes.length - 1) {
        const nextScene = scenes[currentSceneIndex + 1];
        const nextKbConfig = nextScene.kenBurnsConfig; // Use stored config for next scene
        const nextInitialCSSTransform = `scale(1) translate(0%, 0%)`;
        const nextTargetCSSTransform = `scale(${nextKbConfig.targetScale}) translate(${nextKbConfig.targetXPercent}%, ${nextKbConfig.targetYPercent}%)`;
        const nextCSSTransformOrigin = `${nextKbConfig.originXRatio * 100}% ${nextKbConfig.originYRatio * 100}%`;


        setImageSlots(prevSlots => {
          const newSlots = [...prevSlots] as [ImageSlotState, ImageSlotState];
          newSlots[primarySlot] = { ...newSlots[primarySlot], opacity: 0, zIndex: 5 };
          newSlots[secondarySlot] = {
            scene: nextScene,
            opacity: 1,
            zIndex: 10,
            transform: nextInitialCSSTransform,
            transformOrigin: nextCSSTransformOrigin,
            transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
          };
          return newSlots;
        });

        animationTriggerTimeoutRef.current = window.setTimeout(() => {
          setImageSlots(prevSlots => {
            const newSlots = [...prevSlots] as [ImageSlotState, ImageSlotState];
            if (newSlots[secondarySlot].scene?.id === nextScene.id) {
              newSlots[secondarySlot].transform = nextTargetCSSTransform;
              newSlots[secondarySlot].transition = `opacity ${FADE_DURATION_MS}ms ease-in-out, transform ${nextKbConfig.animationDurationS}s linear`;
            }
            return newSlots;
          });
        }, 50);

        window.setTimeout(() => {
          setCurrentSceneIndex(prevIndex => prevIndex + 1);
          setActiveSlotIndex(secondarySlot);
        }, FADE_DURATION_MS);

      } else { 
        setImageSlots(prevSlots => {
          const newSlots = [...prevSlots] as [ImageSlotState, ImageSlotState];
          newSlots[primarySlot] = { ...newSlots[primarySlot], opacity: 0 };
          return newSlots;
        });
        window.setTimeout(() => {
          setIsPlaying(false);
        }, FADE_DURATION_MS);
      }
    }, Math.max(200, sceneDurationMs - FADE_DURATION_MS));

    return () => { 
      if (animationTriggerTimeoutRef.current) clearTimeout(animationTriggerTimeoutRef.current);
      if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentScene?.id, scenes.length, activeSlotIndex, isTTSEnabled]); 


  useEffect(() => {
    return () => {
      onTTSStop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handlePlayPause = () => {
    if (scenes.length === 0 || isGenerating) return;
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);

    if (newIsPlaying) {
        if (currentSceneIndex === scenes.length - 1 && elapsedTime >= (currentScene?.duration || 0) * 1000) {
            handleRestart(); 
        } else {
           if (ttsPlaybackStatus === 'paused') onTTSResume();
        }
    } else {
        if (ttsPlaybackStatus === 'playing') onTTSPause();
    }
  };

  const handleRestart = () => {
    if (scenes.length === 0 || isGenerating) return;
    onTTSStop(); 
    setCurrentSceneIndex(0);
    setActiveSlotIndex(0);
    setImageSlots([getDefaultSlotState(), getDefaultSlotState()]);
    setElapsedTime(0);
    setIsPlaying(true); 
  };

  const footageAspectRatioClass = aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]';

  const getImageStyle = (slotState: ImageSlotState): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: slotState.opacity,
    zIndex: slotState.zIndex,
    transform: slotState.transform,
    transformOrigin: slotState.transformOrigin,
    transition: slotState.transition,
    willChange: 'opacity, transform',
  });

  if (scenes.length === 0 && !isGenerating) {
    return (
      <div className={`w-full bg-gray-800 rounded-lg shadow-lg flex items-center justify-center text-gray-500 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        Enter narration and click "Generate Video" to see preview.
      </div>
    );
  }

  if (isGenerating && scenes.length === 0) {
     return (
      <div className={`w-full bg-gray-800 rounded-lg shadow-lg flex flex-col items-center justify-center text-gray-400 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
        <p>Generating scenes & visuals...</p>
      </div>
    );
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const playedDuration = scenes.slice(0, currentSceneIndex).reduce((sum, s) => sum + s.duration, 0) + (elapsedTime / 1000);

  return (
    <div className="bg-gray-800 p-1 sm:p-2 rounded-lg shadow-xl">
      <div className={`relative w-full ${footageAspectRatioClass} bg-black overflow-hidden rounded-md`}>
        {imageSlots.map((slot, index) => (
          slot.scene ? (
            <img
              key={`slot-${index}-${slot.scene.id}`}
              src={slot.scene.footageUrl}
              alt={`Footage for: ${slot.scene.keywords.join(', ')}`}
              style={getImageStyle(slot)}
              loading={index === activeSlotIndex || index === (1-activeSlotIndex) ? "eager" : "lazy"}
            />
          ) : null
        ))}
        {currentScene && isPlaying && (
            <div className="absolute top-0 left-0 h-1 bg-indigo-600 transition-all duration-100 ease-linear" style={{ width: `${(elapsedTime / ((currentScene?.duration || 1) * 1000)) * 100}%` }}></div>
        )}
      </div>
      {scenes.length > 0 && (
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${totalDuration > 0 ? (playedDuration / totalDuration) * 100 : 0}%`, transition: playedDuration > 0 ? 'width 0.1s linear' : 'none' }}></div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayPause}
            disabled={scenes.length === 0 || isGenerating || isDownloading}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors text-indigo-400 hover:text-indigo-300"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
           <button
            onClick={handleRestart}
            disabled={scenes.length === 0 || isGenerating || isDownloading}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm text-indigo-400 hover:text-indigo-300"
            aria-label="Restart"
          >
            Restart
          </button>
        </div>
        <div className="text-xs sm:text-sm text-gray-400 truncate">
          {currentScene ? `Scene ${currentSceneIndex + 1}/${scenes.length}` : (scenes.length > 0 ? `Ready` : `No video`)}
          {currentScene && isPlaying && ` (${Math.ceil(elapsedTime/1000)}s / ${currentScene.duration}s)`}
          {currentScene && ttsPlaybackStatus === 'playing' && isTTSEnabled && <span className="ml-1 animate-pulse">(🔊)</span>}
          {!isPlaying && scenes.length > 0 && currentSceneIndex === scenes.length -1 && elapsedTime >= (currentScene?.duration || 0) * 1000 && " Ended"}
        </div>
        <button
          onClick={onDownloadRequest}
          disabled={scenes.length === 0 || isGenerating || isDownloading}
          className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-md shadow-sm transition-colors"
          aria-live="polite"
        >
          <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          {isDownloading ? 'Rendering Video...' : 'Download Video'}
        </button>
      </div>
    </div>
  );
};

export default VideoPreview;