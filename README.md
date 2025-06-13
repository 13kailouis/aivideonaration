# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional) Set the `PEXELS_API_KEY` in `.env.local` to enable higher-quality
   placeholder images from Pexels.
4. Run the app:
   `npm run dev`

The generated video will now download as an MP4 file.

### Faster MP4 conversion

The app uses ffmpeg.wasm to convert the rendered WebM file into an MP4 file
directly in the browser. This conversion can be computationally intensive, so a
fast preset (`ultrafast`) is enabled by default to speed up the process. If you
prefer higher quality over speed you can modify the preset in
`services/mp4ConversionService.ts`.
