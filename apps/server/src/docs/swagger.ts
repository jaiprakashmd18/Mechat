import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '@/config/env';

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MeCHAT API',
      version: '1.0.0',
      description:
        'REST API for MeCHAT — a fast, modern, encrypted personal messaging application. ' +
        'Realtime events (typing, presence, message delivery, call signaling) are delivered over Socket.IO; see the README Socket API section.',
    },
    servers: [{ url: `${env.API_URL}/api`, description: env.NODE_ENV }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Registration, login, OTP, 2FA, sessions' },
      { name: 'Users', description: 'Profile, search, device keys, blocking' },
      { name: 'Chats', description: 'Direct & group chat management' },
      { name: 'Messages', description: 'Sending, editing, reactions, polls' },
      { name: 'Groups', description: 'Group roles, invites, membership' },
      { name: 'Media', description: 'File uploads and gallery' },
      { name: 'Calls', description: 'Call history' },
      { name: 'Notifications', description: 'Push/in-app notifications' },
      { name: 'Settings', description: 'User preferences' },
      { name: 'Admin', description: 'Admin dashboard and moderation' },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
});
