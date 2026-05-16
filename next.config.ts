import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Em dev, React precisa de 'unsafe-eval' para reconstrução de callstacks (DevTools).
// Em prod, removemos — sem impacto em funcionalidade real.
// Embeds permitidos no painel de revisão (vídeo final)
const EMBED_FRAME_SOURCES = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://drive.google.com",
];

const CSP = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self'",
  // Áudio/vídeo locais, blob: para preview do LiveRecorder, https: para mídia externa direta
  "media-src 'self' blob: data: https:",
  // YouTube/Drive permitidos no iframe do ReviewVideoPanel
  `frame-src 'self' ${EMBED_FRAME_SOURCES.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // microphone=(self) habilita o LiveRecorder (gravação in-browser via MediaRecorder)
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
