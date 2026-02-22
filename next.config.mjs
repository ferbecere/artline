/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permitimos imágenes del dominio de la Met API
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.metmuseum.org',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
