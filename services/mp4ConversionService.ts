import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;

const getFFmpegInstance = async (): Promise<FFmpeg> => {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  if (!ffmpegInstance.loaded) {
    ffmpegLoadingPromise = ffmpegLoadingPromise ?? ffmpegInstance.load();
    await ffmpegLoadingPromise;
    ffmpegLoadingPromise = null;
  }

  return ffmpegInstance;
};

export const convertWebMToMP4 = async (
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = await getFFmpegInstance();
  const inputFileName = `input_${Date.now()}.webm`;
  const outputFileName = `output_${Date.now()}.mp4`;

  const handleProgress = ({ progress }: { progress: number }) => {
    if (onProgress) {
      onProgress(Math.min(1, progress));
    }
  };

  if (onProgress) {
    ffmpeg.on('progress', handleProgress);
  }

  try {
    await ffmpeg.writeFile(inputFileName, await fetchFile(webmBlob));
    await ffmpeg.exec([
      '-y',
      '-i',
      inputFileName,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      outputFileName,
    ]);
    const data = await ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: 'video/mp4' });
  } finally {
    if (onProgress && typeof (ffmpeg as any).off === 'function') {
      (ffmpeg as any).off('progress', handleProgress);
    }
    try {
      await (ffmpeg as any).deleteFile?.(inputFileName);
    } catch (error) {
      console.warn('Failed to delete temporary input file after conversion.', error);
    }
    try {
      await (ffmpeg as any).deleteFile?.(outputFileName);
    } catch (error) {
      console.warn('Failed to delete temporary output file after conversion.', error);
    }
  }
};
