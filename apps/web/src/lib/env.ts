export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
};
