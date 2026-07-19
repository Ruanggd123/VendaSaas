const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/manager/:path*',
        destination: 'http://manager:80/:path*',
      },
      {
        source: '/manager',
        destination: 'http://manager:80',
      },
      {
        source: '/assets/:path*',
        destination: 'http://manager:80/assets/:path*',
      },
    ];
  },
};

export default nextConfig;
