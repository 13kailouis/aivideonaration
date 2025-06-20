# CineSynth

**AI-Powered Video Narration Tool**

CineSynth transforms text scripts into marketing-ready videos in minutes. Powered by Gemini and Imagen models, it handles scene analysis, placeholder footage, subtitles and final video rendering right in your browser.

## Features

- Smart narration analysis with Google Gemini
- Automatic editing and subtitle generation
- Premium: AI‑generated imagery and TTS narration
- Premium: One-click AI video generation
- Browser-based WebM download, no MP4 conversion needed
- Placeholder footage is pulled as videos directly from Wikimedia Commons, now
  selected randomly from the best search results so each scene has different
  footage when possible

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Create a `.env.local` file and set `GEMINI_API_KEY`. Placeholder footage now comes from Wikimedia Commons and is provided as video only, so no additional API keys are required. If the landing page should redirect to another domain when starting the app, set `LAUNCH_URL` to that URL.
3. Start the development server
   ```bash
   npm run dev
   ```

Development mode automatically provided cross-origin isolation headers for the previous MP4 conversion step. Since downloads are now WebM-only, this is no longer required, but running with `npm run dev` or `npm run preview` is still recommended.

### Download Format

The generated video downloads directly as WebM. If you need MP4, you can still convert manually using `services/mp4ConversionService.ts` and ffmpeg.wasm.

## Deployment

If you plan to enable MP4 conversion via ffmpeg.wasm, create a `vercel.json` file so each request includes the cross-origin headers required by ffmpeg:

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

These headers were previously required for MP4 conversion. They can be omitted if you only use WebM downloads.

If the landing page is served separately from the full editor, provide the
target URL in a `LAUNCH_URL` environment variable. Visitors clicking
**Get Started** will be redirected there.

