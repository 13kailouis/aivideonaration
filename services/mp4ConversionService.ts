import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<void> | null = null;

export const preloadFFmpeg = async (): Promise<void> => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpegLoadPromise = ffmpeg.load();
  }
  if (ffmpegLoadPromise) {
    await ffmpegLoadPromise;
  }
};

export const convertWebMToMP4 = async (
  webmBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  await preloadFFmpeg();
  if (!ffmpeg) throw new Error('ffmpeg failed to load');

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) onProgress(Math.min(1, progress));
  };
  ffmpeg.on('progress', progressHandler);

  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
  await ffmpeg.exec([
    '-i',
    'input.webm',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-pix_fmt',
    'yuv420p',
    'output.mp4',
  ]);
  const data = await ffmpeg.readFile('output.mp4');

  // Clean up temporary files to free memory for subsequent conversions
  try {
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile('output.mp4');
  } catch {
    // Ignore errors during cleanup
  }

  if ((ffmpeg as any).off) {
    (ffmpeg as any).off('progress', progressHandler);
  } else if ((ffmpeg as any).removeListener) {
    (ffmpeg as any).removeListener('progress', progressHandler);
  }

  return new Blob([data], { type: 'video/mp4' });
};
