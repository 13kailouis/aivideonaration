import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export const convertMP4ToWebM = async (
  mp4Blob: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.min(1, progress));
  });
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }
  await ffmpeg.writeFile('input.mp4', await fetchFile(mp4Blob));
  await ffmpeg.exec([
    '-i', 'input.mp4',
    '-c:v', 'libvpx',
    '-b:v', '1M',
    '-c:a', 'libvorbis',
    'output.webm'
  ]);
  const data = await ffmpeg.readFile('output.webm');
  return new Blob([data], { type: 'video/webm' });
};
