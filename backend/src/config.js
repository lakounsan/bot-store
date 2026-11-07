import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  adminId: process.env.ADMIN_TELEGRAM_ID ? parseInt(process.env.ADMIN_TELEGRAM_ID, 10) : null,
  adminChannelId: process.env.ADMIN_CHANNEL_ID || null,
  port: parseInt(process.env.PORT || '4000', 10),
  adminSecretKey: process.env.ADMIN_SECRET_KEY || 'admin123456',
  bakong: {
    accountId: process.env.BAKONG_ACCOUNT_ID || 'merchant@acleda',
    merchantName: process.env.BAKONG_MERCHANT_NAME || 'KHMER DIGITAL STORE',
    city: process.env.BAKONG_CITY || 'Phnom Penh'
  },
  referralCommissionPercent: parseFloat(process.env.REFERRAL_COMMISSION_PERCENT || '10'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  dataDir: path.resolve(__dirname, '../data')
};

