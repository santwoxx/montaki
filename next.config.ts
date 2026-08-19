import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de comprovante/manual/ocorrência são enviadas para o Vercel
    // Blob (ver lib/actions/montagens.ts). Sem isso, next/image recusa
    // otimizar imagens hospedadas fora do domínio do próprio site.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
