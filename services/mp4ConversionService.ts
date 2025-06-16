import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export const convertWebMToMP4 = async (
  webmBlob: Blob,
  narrationAudio?: Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress) onProgress(Math.min(1, progress));
  });
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }
  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
  let ffmpegCmd: string[];
  if (narrationAudio) {
    const audioExt = narrationAudio.type.split('/')[1] || 'wav';
    const audioFile = `narration.${audioExt}`;
    await ffmpeg.writeFile(audioFile, await fetchFile(narrationAudio));
    ffmpegCmd = [
      '-i', 'input.webm',
      '-i', audioFile,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      'output.mp4'
    ];
  } else {
    ffmpegCmd = [
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      'output.mp4'
    ];
  }
  await ffmpeg.exec(ffmpegCmd);
  const data = await ffmpeg.readFile('output.mp4');
  return new Blob([data], { type: 'video/mp4' });
};
