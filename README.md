# CineSynth

**AI-Powered Video Narration Tool**

CineSynth transforms text scripts into marketing-ready videos in minutes. Powered by Gemini and Imagen models, it handles scene analysis, placeholder footage, subtitles and final video rendering right in your browser.

## Features

- Smart narration analysis with Google Gemini
- Automatic editing and subtitle generation
- Optional AI‑generated imagery using Imagen
- Browser-based WebM to MP4 conversion via ffmpeg.wasm

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Create a `.env.local` file and set `GEMINI_API_KEY`. Optionally add `PEXELS_API_KEY` for higher quality placeholder images.
3. Start the development server
   ```bash
   npm run dev
   ```

During development the app and landing page run on the same domain. Click **Get Started** on the landing page to load the main editor. When deployed, the landing page should live on your root domain with the editor served from an `app.` subdomain. This behaviour is handled automatically by the code.

Development mode automatically provides the required cross-origin isolation headers so ffmpeg.wasm can use `SharedArrayBuffer`. Always run the app via `npm run dev` or `npm run preview` after building.

### Faster MP4 Conversion

By default the browser-based conversion uses the `ultrafast` preset for speed. Edit `services/mp4ConversionService.ts` if you prefer higher quality.

## Deployment

When deploying to Vercel, create a `vercel.json` file so each request includes the cross-origin headers needed by ffmpeg.wasm:

```json
{
  "headers": [
    {
      "source": "/*",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

This ensures the MP4 conversion works correctly in the hosted app.

