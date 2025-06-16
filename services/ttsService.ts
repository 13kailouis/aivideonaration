export interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

import { GoogleGenAI } from '@google/genai';
import { API_KEY } from '../constants.ts';

let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

export async function generateSpeechAudio(text: string): Promise<Blob> {
  const genAI = getAI();
  const response = await genAI.models.generateContentStream({
    model: 'gemini-2.5-pro-preview-tts',
    config: {
      temperature: 1.2,
      responseModalities: ['audio'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Iapetus' } }
      }
    },
    contents: [{ role: 'user', parts: [{ text }] }],
  });

  const chunks: Uint8Array[] = [];
  let mimeType = '';

  for await (const chunk of response) {
    const inline = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (inline) {
      mimeType = inline.mimeType || 'audio/wav';
      const data = inline.data || '';
      chunks.push(base64ToUint8Array(data));
    }
  }

  let buffer = concatUint8Arrays(chunks);
  if (!getExtension(mimeType)) {
    const options = parseMimeType(mimeType);
    buffer = concatUint8Arrays([createWavHeader(buffer.length, options), buffer]);
    mimeType = 'audio/wav';
  }
  return new Blob([buffer], { type: mimeType });
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [, format] = fileType.split('/');
  const options: Partial<WavConversionOptions> = { numChannels: 1 };
  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) options.bitsPerSample = bits;
  }
  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') options.sampleRate = parseInt(value, 10);
  }
  return options as WavConversionOptions;
}

function createWavHeader(length: number, opt: WavConversionOptions): Uint8Array {
  const { numChannels, sampleRate, bitsPerSample } = opt;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;

  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const textEncoder = new TextEncoder();

  const writeString = (offset: number, str: string) => {
    const bytes = textEncoder.encode(str);
    new Uint8Array(buffer, offset, bytes.length).set(bytes);
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  return new Uint8Array(buffer);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const arr of arrays) total += arr.length;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function getExtension(mimeType: string): string | null {
  const match = mimeType.match(/^audio\/([^;]+)/);
  return match ? match[1] : null;
}
