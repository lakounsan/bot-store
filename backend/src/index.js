import { config } from './config.js';
import { createStoreBot } from './bot.js';
import { createStoreServer } from './server.js';

async function bootstrap() {
  console.log('🚀 Starting Store Bot & Auto-Payment System...');

  let bot = null;
  if (config.botToken) {
    try {
      bot = createStoreBot();
      if (bot) {
        bot.launch()
          .then(() => {
            console.log('✅ Telegram Bot connected successfully (Bot Polling Active)!');
          })
          .catch((err) => {
            console.error('❌ Error connecting Telegram Bot:', err.message);
          });
      }
    } catch (e) {
      console.error('❌ Bot launch exception:', e.message);
    }
  } else {
    console.log('⚠️ TELEGRAM_BOT_TOKEN is not set in store-bot/backend/.env.');
    console.log('ℹ️ Running in Web API & Admin Dashboard mode.');
  }

  const app = createStoreServer(bot);

  const server = app.listen(config.port, () => {
    console.log(`🌐 Web API & Admin Dashboard running on: http://localhost:${config.port}`);
  });

  const stop = () => {
    console.log('Shutting down server...');
    if (bot) bot.stop('SIGTERM');
    server.close();
    process.exit(0);
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

bootstrap().catch((err) => {
  console.error('Fatal crash:', err);
  process.exit(1);
});

