import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Forzamos la raiz del workspace al directorio del proyecto. Next/Turbopack
  // detecta un package-lock.json suelto en el HOME del dev (~/) y, sin esto,
  // infiere mal el root y no resuelve modulos como tailwindcss.
  turbopack: {
    root: import.meta.dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
