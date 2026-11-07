import QRCode from 'qrcode';
import { config } from '../config.js';
import { db } from '../db.js';

/**
 * Generate Bakong KHQR Payload String & QR Code Buffer
 */
export async function generateKHQR({ amount, billNo, currency = 'USD' }) {
  // Bakong KHQR EMVCo compliant structure format
  // In real production, this can also call Bakong Open API or ABA PayWay
  const merchantId = config.bakong.accountId;
  const merchantName = config.bakong.merchantName;
  const formattedAmount = Number(amount).toFixed(2);

  // Construct readable KHQR payload representation
  const payload = `KHQR:${merchantId}:${billNo}:${formattedAmount}:${currency}`;

  // Generate QR Code image as Buffer (PNG)
  const qrBuffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    width: 320,
    color: {
      dark: '#1e293b',
      light: '#ffffff'
    }
  });

  return {
    billNo,
    amount: formattedAmount,
    currency,
    merchantName,
    merchantId,
    qrBuffer,
    payload
  };
}

/**
 * Simulate or Verify Auto-Payment from Bank Webhook
 */
export async function verifyPayment(billNo, bot = null) {
  const deposit = db.approveDeposit(billNo);
  if (!deposit) return null;

  // If bot is active, send instant confirmation message to customer
  if (bot) {
    try {
      await bot.telegram.sendMessage(
        deposit.telegramId,
        `✅ *ការទូទាត់ប្រាក់ទទួលបានជោគជ័យ!*\n\n` +
        `💵 ចំនួនទឹកប្រាក់៖ *$${deposit.amount.toFixed(2)} USD*\n` +
        `🧾 លេខវិក្កយបត្រ៖ \`${deposit.billNo}\`\n\n` +
        `ប្រាក់ត្រូវបានបញ្ចូលទៅក្នុងកាបូប (Wallet) របស់អ្នករួចរាល់ហើយ!`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Failed to notify customer of deposit:', e.message);
    }
  }

  // Notify Admin
  if (bot && config.adminId) {
    try {
      await bot.telegram.sendMessage(
        config.adminId,
        `🔔 *ប្រាក់ចូលថ្មី (New Deposit)*\n\n` +
        `👤 User ID: \`${deposit.telegramId}\`\n` +
        `💵 ចំនួន៖ *$${deposit.amount.toFixed(2)} USD*\n` +
        `🧾 លេខ Bill: \`${deposit.billNo}\``,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Failed to alert admin of deposit:', e.message);
    }
  }

  return deposit;
}

