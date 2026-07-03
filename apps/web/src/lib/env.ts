const isProduction = process.env.NODE_ENV === 'production';

function defaultPublicUrl(localUrl: string) {
  return isProduction ? '' : localUrl;
}

export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? defaultPublicUrl('http://localhost:4000'),
  SOCKET_URL:
    process.env.NEXT_PUBLIC_SOCKET_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    defaultPublicUrl('http://localhost:4000'),
};
