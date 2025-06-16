import { GoogleGenAI } from '@google/genai';
import mime from 'mime';
import { API_KEY } from '../constants.ts';

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map((s) => s.trim());
  const [, format] = fileType.split('/');
  const options: WavConversionOptions = {
    numChannels: 1,
    sampleRate: 44100,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) options.bitsPerSample = bits;
  }

  for (const param of params) {
    const [key, value] = param.split('=').map((s) => s.trim());
    if (key === 'rate') {
      const rate = parseInt(value, 10);
      if (!isNaN(rate)) options.sampleRate = rate;
    }
  }

  return options;
}

function createWavHeader(dataLength: number, opts: WavConversionOptions) {
  const { numChannels, sampleRate, bitsPerSample } = opts;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}

function convertToWav(rawData: string, mimeType: string) {
  const opts = parseMimeType(mimeType);
  const data = Buffer.from(rawData, 'base64');
  const header = createWavHeader(data.length, opts);
  return Buffer.concat([header, data]);
}

let ai: GoogleGenAI | null = null;
function getAi() {
  if (!API_KEY) throw new Error('API_KEY_MISSING');
  if (!ai) ai = new GoogleGenAI({ apiKey: API_KEY });
  return ai;
}

export async function synthesizeSpeech(text: string): Promise<Blob> {
  const gen = getAi();
  const config = {
    temperature: 1.3,
    responseModalities: ['audio'],
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Iapetus' } },
    },
  } as const;
  const model = 'gemini-2.5-flash-preview-tts';
  const contents = [{ role: 'user', parts: [{ text }] }];
  const response = await gen.models.generateContentStream({ model, config, contents });
  const chunks: Uint8Array[] = [];
  let mimeType: string | undefined;
  for await (const chunk of response) {
    const inline = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inline) {
      mimeType = inline.mimeType;
      let buf = Buffer.from(inline.data || '', 'base64');
      if (!mime.getExtension(mimeType || '')) {
        buf = convertToWav(inline.data || '', mimeType || '');
        mimeType = 'audio/wav';
      }
      chunks.push(buf);
    }
  }
  if (chunks.length === 0) throw new Error('No audio received');
  const blob = new Blob(chunks, { type: mimeType || 'audio/wav' });
  return blob;
}

