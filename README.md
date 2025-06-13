# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional) Set the `PEXELS_API_KEY` in `.env.local` to enable higher-quality
   placeholder images from Pexels.
   Placeholder images are now requested at a smaller resolution (960x540 or
   540x960) to speed up the preview and avoid long preload times.
   If an image fails to load during rendering, the app now substitutes a small
   fallback image so video generation can continue rather than stalling.
4. Run the app:
   `npm run dev`

Video downloads require the browser to be cross-origin isolated so that ffmpeg.wasm can use `SharedArrayBuffer`. The development server now automatically sends the necessary `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers. Make sure you access the app via `npm run dev` (or `npm run preview` after building) rather than opening `index.html` directly.

The generated video will now download as an MP4 file.

### Faster MP4 conversion

The app uses ffmpeg.wasm to convert the rendered WebM file into an MP4 file
directly in the browser. This conversion can be computationally intensive, so a
fast preset (`ultrafast`) is enabled by default to speed up the process. If you
prefer higher quality over speed you can modify the preset in
`services/mp4ConversionService.ts`.
