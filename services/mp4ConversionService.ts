import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const uniqueName = (base: string, ext: string) =>
  `${base}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

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
  const inputName = uniqueName('input', 'webm');
  const outputName = uniqueName('output', 'mp4');
  await ffmpeg.writeFile(inputName, await fetchFile(webmBlob));
  let ffmpegCmd: string[];
  let narrationFile: string | undefined = undefined;
  if (narrationAudio) {
    const audioExt = (narrationAudio.type.split('/')[1] || 'wav').split(';')[0];
    narrationFile = uniqueName('narration', audioExt);
    await ffmpeg.writeFile(narrationFile, await fetchFile(narrationAudio));
    ffmpegCmd = [
      '-i', inputName,
      '-i', narrationFile,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      outputName
    ];
  } else {
    ffmpegCmd = [
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      outputName
    ];
  }
  try {
    await ffmpeg.exec(ffmpegCmd);
    const data = await ffmpeg.readFile(outputName);
    return new Blob([data], { type: 'video/mp4' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`FFmpeg error: ${message}`);
  } finally {
    ffmpeg.deleteFile(inputName);
    if (narrationFile) ffmpeg.deleteFile(narrationFile);
    ffmpeg.deleteFile(outputName);
    ffmpeg.terminate();
  }
};
