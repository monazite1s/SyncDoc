export default () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET 环境变量未设置，请检查 .env 文件');
  }

  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    wsPort: parseInt(process.env.WS_PORT ?? '3002', 10),
    database: {
      url: process.env.DATABASE_URL,
    },
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    },
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    },
  };
};
