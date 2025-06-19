
import React, { useState, useEffect, useRef } from 'react';
import { Scene, AspectRatio } from '../types.ts';
import { PlayIcon, PauseIcon, DownloadIcon } from './IconComponents.tsx';

const FADE_DURATION_MS = 1000; // 1 second for cross-fade

interface VideoSlotState {
  scene: Scene | null;
  opacity: number;
  zIndex: number;
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

const getDefaultSlotState = (): VideoSlotState => ({
  scene: null,
  opacity: 0,
  zIndex: 0,
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

  const [videoSlots, setVideoSlots] = useState<[VideoSlotState, VideoSlotState]>([
    getDefaultSlotState(), getDefaultSlotState()
  ]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  const sceneTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const animationTriggerTimeoutRef = useRef<number | null>(null);
  const videoRefs = [useRef<HTMLVideoElement | null>(null), useRef<HTMLVideoElement | null>(null)];

  const currentScene = scenes[currentSceneIndex];

  // Effect for initial scene load and regeneration
  useEffect(() => {
    if (scenes.length > 0 && !isGenerating) {
      setCurrentSceneIndex(0);
      setActiveSlotIndex(0);
      setVideoSlots([getDefaultSlotState(), getDefaultSlotState()]);
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
         setVideoSlots(prevSlots => [
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
    setVideoSlots(prevSlots => {
      const newSlots = [...prevSlots] as [VideoSlotState, VideoSlotState];
      newSlots[primarySlot] = {
        scene: currentScene,
        opacity: 1,
        zIndex: 10,
        transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
      };
      if (newSlots[secondarySlot].opacity !== 0) {
        newSlots[secondarySlot] = { ...newSlots[secondarySlot], opacity: 0, zIndex: 5 };
      } else {
        newSlots[secondarySlot].zIndex = 5;
      }
      return newSlots;
    });

    if (videoRefs[primarySlot].current) {
      videoRefs[primarySlot].current.currentTime = 0;
      videoRefs[primarySlot].current.play().catch(() => {});
    }
    if (videoRefs[secondarySlot].current) {
      videoRefs[secondarySlot].current.pause();
    }

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

        setVideoSlots(prevSlots => {
          const newSlots = [...prevSlots] as [VideoSlotState, VideoSlotState];
          newSlots[primarySlot] = { ...newSlots[primarySlot], opacity: 0, zIndex: 5 };
          newSlots[secondarySlot] = {
            scene: nextScene,
            opacity: 1,
            zIndex: 10,
            transition: `opacity ${FADE_DURATION_MS}ms ease-in-out`,
          };
          return newSlots;
        });

        if (videoRefs[secondarySlot].current) {
          videoRefs[secondarySlot].current.currentTime = 0;
          videoRefs[secondarySlot].current.play().catch(() => {});
        }
        if (videoRefs[primarySlot].current) {
          videoRefs[primarySlot].current.pause();
        }

        animationTriggerTimeoutRef.current = window.setTimeout(() => {
          setVideoSlots(prevSlots => [...prevSlots] as [VideoSlotState, VideoSlotState]);
        }, 50);

        window.setTimeout(() => {
          setCurrentSceneIndex(prevIndex => prevIndex + 1);
          setActiveSlotIndex(secondarySlot);
        }, FADE_DURATION_MS);

      } else {
        setVideoSlots(prevSlots => {
          const newSlots = [...prevSlots] as [VideoSlotState, VideoSlotState];
          newSlots[primarySlot] = { ...newSlots[primarySlot], opacity: 0 };
          return newSlots;
        });
        if (videoRefs[primarySlot].current) videoRefs[primarySlot].current.pause();
        if (videoRefs[secondarySlot].current) videoRefs[secondarySlot].current.pause();
        window.setTimeout(() => {
          setIsPlaying(false);
        }, FADE_DURATION_MS);
      }
    }, Math.max(200, sceneDurationMs - FADE_DURATION_MS));

    return () => {
      if (animationTriggerTimeoutRef.current) clearTimeout(animationTriggerTimeoutRef.current);
      if (sceneTimeoutRef.current) clearTimeout(sceneTimeoutRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      videoRefs.forEach(v => v.current && v.current.pause());
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
    setVideoSlots([getDefaultSlotState(), getDefaultSlotState()]);
    videoRefs.forEach(v => { if (v.current) { v.current.pause(); v.current.currentTime = 0; }});
    setElapsedTime(0);
    setIsPlaying(true);
  };

  const footageAspectRatioClass = aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]';

  const getSlotStyle = (slotState: VideoSlotState): React.CSSProperties => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: slotState.opacity,
    zIndex: slotState.zIndex,
    transition: slotState.transition,
    willChange: 'opacity',
  });

  if (scenes.length === 0 && !isGenerating) {
    return (
      <div className={`w-full bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg flex items-center justify-center text-gray-500 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        Enter narration and click "Generate Video" to see preview.
      </div>
    );
  }

  if (isGenerating && scenes.length === 0) {
     return (
      <div className={`w-full bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg flex flex-col items-center justify-center text-gray-400 ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p>Generating scenes & visuals...</p>
      </div>
    );
  }

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const playedDuration = scenes.slice(0, currentSceneIndex).reduce((sum, s) => sum + s.duration, 0) + (elapsedTime / 1000);

  return (
    <div className="bg-neutral-900 border border-neutral-700 p-1 sm:p-2 rounded-lg shadow-xl">
      <div className={`relative w-full ${footageAspectRatioClass} bg-black overflow-hidden rounded-md`}>
        {videoSlots.map((slot, index) => (
          slot.scene ? (
            <video
              key={`slot-${index}-${slot.scene.id}`}
              ref={videoRefs[index]}
              src={slot.scene.footageUrl}
              style={getSlotStyle(slot)}
              muted
              playsInline
              preload="auto"
            />
          ) : null
        ))}
        {currentScene && isPlaying && (
            <div className="absolute top-0 left-0 h-1 bg-white transition-all duration-100 ease-linear" style={{ width: `${(elapsedTime / ((currentScene?.duration || 1) * 1000)) * 100}%` }}></div>
        )}
      </div>
      {scenes.length > 0 && (
        <div className="mt-2 h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-white" style={{ width: `${totalDuration > 0 ? (playedDuration / totalDuration) * 100 : 0}%`, transition: playedDuration > 0 ? 'width 0.1s linear' : 'none' }}></div>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between space-x-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePlayPause}
            disabled={scenes.length === 0 || isGenerating || isDownloading}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 transition-colors text-white hover:text-gray-300"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
           <button
            onClick={handleRestart}
            disabled={scenes.length === 0 || isGenerating || isDownloading}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 transition-colors text-sm text-white hover:text-gray-300"
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
          className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black text-xs sm:text-sm font-medium rounded-md shadow-sm transition-colors"
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