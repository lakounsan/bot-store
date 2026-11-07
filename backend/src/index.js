import { config } from './config.js';
import { createStoreBot } from './bot.js';
import { createStoreServer } from './server.js';

async function bootstrap() {
  console.log('🚀 ចាប់ផ្តើមដំណើរការប្រព័ន្ធ Store Bot & Auto-Payment...');

  let bot = null;
  if (config.botToken) {
    try {
      bot = createStoreBot();
      if (bot) {
        bot.launch()
          .then(() => {
            console.log('✅ Telegram Bot បានភ្ជាប់ជោគជ័យ (Bot Polling Active)!');
          })
          .catch((err) => {
            console.error('❌ កំហុសក្នុងការភ្ជាប់ Telegram Bot:', err.message);
          });
      }
    } catch (e) {
      console.error('❌ Bot launch exception:', e.message);
    }
  } else {
    console.log('⚠️ មិនទាន់បានដាក់ TELEGRAM_BOT_TOKEN ក្នុង store-bot/backend/.env នៅឡើយទេ។');
    console.log('ℹ️ Server កំពុងដំណើរការក្នុង Web API Mode។');
  }

  const app = createStoreServer(bot);

  const server = app.listen(config.port, () => {
    console.log(`🌐 Web API & Admin Dashboard កំពុងដំណើរការលើ៖ http://localhost:${config.port}`);
  });

  const stop = () => {
    console.log('កំពុងបិទប្រព័ន្ធ...');
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

