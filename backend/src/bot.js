import { Telegraf, Markup } from 'telegraf';
import { config } from './config.js';
import { db } from './db.js';
import { generateKHQR, verifyPayment } from './services/paymentService.js';
import { textToSpeech, speechToText } from './services/voiceService.js';
import {
  extractUrl,
  downloadVideo,
  downloadAudio
} from './services/videoDownloaderService.js';

export function createStoreBot() {
  if (!config.botToken) {
    console.warn('⚠️ No TELEGRAM_BOT_TOKEN set in store-bot/backend/.env');
    return null;
  }

  const bot = new Telegraf(config.botToken);

  // Retrieve and store bot's username for referral links
  bot.telegram.getMe().then((me) => {
    config.botUsername = me.username;
    console.log(`🤖 Telegram Bot connected as @${me.username}`);
  }).catch((e) => {
    console.warn('Could not fetch bot username:', e.message);
  });

  // --- Start & Main Menu ---
  bot.start(async (ctx) => {
    const startPayload = ctx.startPayload || '';
    let referrerId = null;

    if (startPayload.startsWith('ref_')) {
      referrerId = startPayload.replace('ref_', '').trim();
    }

    const user = db.getOrCreateUser(ctx.from, referrerId);

    // Notify admin on new user registration
    if (config.adminId && String(ctx.from.id) !== String(config.adminId)) {
      bot.telegram.sendMessage(
        config.adminId,
        `👤 *សមាជិកថ្មីបានចុះឈ្មោះ (New User)*\n` +
        `• ឈ្មោះ៖ ${escapeMarkdown(user.firstName)} (@${user.username || 'NoUsername'})\n` +
        `• ID៖ \`${user.telegramId}\`\n` +
        `• អ្នកណែនាំ៖ ${user.referredBy ? `\`${user.referredBy}\`` : 'None'}`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    const welcomeText =
      `👋 *សូមស្វាគមន៍មកកាន់ ${escapeMarkdown(config.bakong.merchantName)}!*\n\n` +
      `យើងខ្ញុំមានលក់ អាខោន Premium, License Keys និងកម្មវិធីផ្សេងៗ ប្រកបដោយទំនុកចិត្ត និងប្រព័ន្ធទូទាត់ប្រាក់ស្វ័យប្រវត្ត 24/7។\n\n` +
      `👤 *ព័ត៌មានគណនីរបស់អ្នក៖*\n` +
      `• ឈ្មោះ៖ *${escapeMarkdown(user.firstName)}*\n` +
      `• User ID៖ \`${user.telegramId}\`\n` +
      `• សមតុល្យកាបូប (Balance)៖ *$${user.balance.toFixed(2)} USD*\n\n` +
      `សូមជ្រើសរើសមុខងារខាងក្រោម៖`;

    const buttons = [
      [Markup.button.callback('🛍️ មើលទំនិញ (Shop)', 'menu_categories'), Markup.button.callback('💳 កាបូបលុយ (Wallet)', 'menu_wallet')],
      [Markup.button.callback('📦 ប្រវត្តិទិញ (Orders)', 'menu_orders'), Markup.button.callback('👥 ណែនាំមិត្ត (Referral)', 'menu_referral')],
      [Markup.button.callback('🎤 Voice AI (TTS & STT)', 'menu_voice'), Markup.button.callback('📥 ទាញយកវីដេអូ (Downloader)', 'menu_downloader')]
    ];

    if (config.adminId && String(ctx.from.id) === String(config.adminId)) {
      buttons.push([Markup.button.callback('👑 Admin Dashboard', 'menu_admin')]);
    }

    await ctx.replyWithMarkdown(welcomeText, Markup.inlineKeyboard(buttons));
  });

  // --- Category Browser ---
  bot.action('menu_categories', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const categories = db.getCategories();

    const buttons = categories.map((cat) => [
      Markup.button.callback(`${cat.icon} ${cat.name}`, `cat_${cat.id}`)
    ]);
    buttons.push([Markup.button.callback('🔙 ត្រឡប់ក្រោយ (Main Menu)', 'main_menu')]);

    await ctx.editMessageText(
      `📂 *សូមជ្រើសរើសប្រភេទផលិតផល (Categories)*\n\nជ្រើសរើសប្រភេទខាងក្រោមដើម្បីមើលផលិតផល និងចំនួនស្តុកដែលមានស្រាប់៖`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
  });

  // --- Products in Category ---
  bot.action(/^cat_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const catId = ctx.match[1];
    const products = db.getProducts(catId);

    if (products.length === 0) {
      return ctx.editMessageText(
        `⚠️ មិនទាន់មានផលិតផលក្នុងប្រភេទនេះនៅឡើយទេ។`,
        Markup.inlineKeyboard([[Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'menu_categories')]])
      );
    }

    const buttons = products.map((p) => {
      const stockBadge = p.stockCount > 0 ? `(${p.stockCount} ក្នុងស្តុក)` : '(អស់ស្តុក)';
      return [Markup.button.callback(`${p.icon} ${p.name} - $${p.price.toFixed(2)} ${stockBadge}`, `prod_${p.id}`)];
    });
    buttons.push([Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'menu_categories')]);

    await ctx.editMessageText(
      `🛍️ *បញ្ជីផលិតផល (Products List)*\n\nសូមចុចលើផលិតផលដើម្បីមើលព័ត៌មានលម្អិត និងទិញ៖`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
  });

  // --- Product Detail View ---
  bot.action(/^prod_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const prodId = ctx.match[1];
    const product = db.getProductById(prodId);

    if (!product) {
      return ctx.reply('⚠️ រកមិនឃើញផលិតផលនេះទេ។');
    }

    const inStock = product.stockCount > 0;
    const detailText =
      `${product.icon} *${escapeMarkdown(product.name)}*\n\n` +
      `📝 *ការពិពណ៌នា៖*\n${escapeMarkdown(product.description)}\n\n` +
      `💵 *តម្លៃ៖* *$${product.price.toFixed(2)} USD*\n` +
      `📦 *ស្ថានភាពស្តុក៖* ${inStock ? `✅ នៅសល់ *${product.stockCount}*` : '❌ *អស់ពីស្តុក (Out of Stock)*'}\n\n` +
      `⚡ *ប្រព័ន្ធដឹកជញ្ជូន៖* ទទួលបាន Account / License Key ភ្លាមៗក្នុង Chat ក្រោយពេលទូទាត់!`;

    const buttons = [];
    if (inStock) {
      buttons.push([Markup.button.callback(`🛒 ទិញឥឡូវនេះ ($${product.price.toFixed(2)})`, `buy_${product.id}`)]);
    }
    buttons.push([
      Markup.button.callback('🔙 ត្រឡប់ក្រោយ', `cat_${product.categoryId}`),
      Markup.button.callback('🏠 ទំព័រដើម', 'main_menu')
    ]);

    await ctx.editMessageText(detailText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  });

  // --- Buy & Instant Stock Delivery Flow ---
  bot.action(/^buy_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('កំពុងដំណើរការទិញ...').catch(() => {});
    const prodId = ctx.match[1];
    const product = db.getProductById(prodId);
    const user = db.getUser(ctx.from.id);

    if (!product) return ctx.reply('⚠️ ផលិតផលមិនត្រឹមត្រូវ។');
    if (product.stockCount <= 0) return ctx.reply('❌ ផលិតផលនេះអស់ពីស្តុកហើយ។ សូមរង់ចាំការ Restock ថ្មី!');

    // Check balance
    if (user.balance < product.price) {
      const shortfall = (product.price - user.balance).toFixed(2);
      return ctx.reply(
        `⚠️ *សមតុល្យកាបូបរបស់អ្នកមិនគ្រប់គ្រាន់ទេ!*\n\n` +
        `• តម្លៃទំនិញ៖ *$${product.price.toFixed(2)} USD*\n` +
        `• សមតុល្យបច្ចុប្បន្ន៖ *$${user.balance.toFixed(2)} USD*\n` +
        `• ខ្វះចំនួន៖ *$${shortfall} USD*\n\n` +
        `សូមចុចប៊ូតុងខាងក្រោមដើម្បីបញ្ចូលលុយ (Top Up) តាម KHQR៖`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💳 បញ្ចូលលុយ (Top Up)', 'menu_wallet')],
            [Markup.button.callback('🔙 ត្រឡប់ក្រោយ', `prod_${product.id}`)]
          ])
        }
      );
    }

    // Process purchase
    const stockItem = db.consumeStockItem(product.id, ctx.from.id);
    if (!stockItem) {
      return ctx.reply('❌ ការទិញបរាជ័យ ដោយសារមានអ្នកទិញមុនមួយជំហាន។ សូមព្យាយាមម្តងទៀត!');
    }

    // Deduct balance
    db.updateBalance(ctx.from.id, -product.price);

    // Save order
    const order = db.createOrder({
      telegramId: ctx.from.id,
      productId: product.id,
      productName: product.name,
      price: product.price,
      content: stockItem.content
    });

    // Handle Referral Commission
    const refResult = db.rewardReferral(ctx.from.id, product.price);
    if (refResult) {
      bot.telegram.sendMessage(
        refResult.referrerId,
        `🎉 *អ្នកទទួលបានប្រាក់កម្រៃជើងសារ (Referral Bonus)!*\n\n` +
        `មិត្តដែលអ្នកបានណែនាំទើបតែបានទិញផលិតផល។ អ្នកទទួលបានប្រាក់កម្រៃ *$${refResult.commission.toFixed(2)} USD* ចូលក្នុងកាបូបរបស់អ្នក!`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    // Deliver product to customer
    const deliveryMessage =
      `🎉 *ការទិញទទួលបានជោគជ័យ (Purchase Successful)!*\n\n` +
      `🛍️ *ទំនិញ៖* ${escapeMarkdown(product.name)}\n` +
      `🧾 *លេខ Order៖* \`${order.id}\`\n` +
      `💵 *កាត់ប្រាក់៖* $${product.price.toFixed(2)} USD\n\n` +
      `🔐 *ព័ត៌មានអាខោន / LICENSE KEY របស់អ្នក៖*\n` +
      `\`\`\`\n${stockItem.content}\n\`\`\`\n\n` +
      `⚠️ *ចំណាំ៖* សូមរក្សាទុកព័ត៌មានខាងលើឱ្យមានសុវត្ថិភាព។ អរគុណសម្រាប់ការគាំទ្រ!`;

    await ctx.replyWithMarkdown(deliveryMessage, Markup.inlineKeyboard([
      [Markup.button.callback('📦 មើលប្រវត្តិទិញ', 'menu_orders'), Markup.button.callback('🛍️ ទិញបន្ត', 'menu_categories')]
    ]));

    // Notify Admin / Channel
    const adminAlert =
      `🚨 *មានការបញ្ជាទិញថ្មី (New Order Placed)!*\n\n` +
      `• អតិថិជន៖ ${escapeMarkdown(ctx.from.first_name)} (@${ctx.from.username || 'NoUser'})\n` +
      `• User ID៖ \`${ctx.from.id}\`\n` +
      `• ទំនិញ៖ ${escapeMarkdown(product.name)}\n` +
      `• តម្លៃ៖ *$${product.price.toFixed(2)} USD*\n` +
      `• លេខ Order៖ \`${order.id}\``;

    if (config.adminId) {
      bot.telegram.sendMessage(config.adminId, adminAlert, { parse_mode: 'Markdown' }).catch(() => {});
    }
    if (config.adminChannelId) {
      bot.telegram.sendMessage(config.adminChannelId, adminAlert, { parse_mode: 'Markdown' }).catch(() => {});
    }
  });

  // --- Wallet & KHQR Deposit ---
  bot.action('menu_wallet', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const user = db.getUser(ctx.from.id);

    const text =
      `💳 *កាបូបលុយរបស់អ្នក (My Wallet)*\n\n` +
      `• ឈ្មោះ៖ *${escapeMarkdown(user.firstName)}*\n` +
      `• សមតុល្យបច្ចុប្បន្ន៖ *$${user.balance.toFixed(2)} USD*\n` +
      `• បានចំណាយសរុប៖ *$${(user.totalSpent || 0).toFixed(2)} USD*\n\n` +
      `ជ្រើសរើសចំនួនប្រាក់ដែលចង់បញ្ចូលតាម *Bakong KHQR* ស្វ័យប្រវត្តិ៖`;

    const buttons = [
      [Markup.button.callback('💵 +$1.00', 'topup_1'), Markup.button.callback('💵 +$3.00', 'topup_3')],
      [Markup.button.callback('💵 +$5.00', 'topup_5'), Markup.button.callback('💵 +$10.00', 'topup_10')],
      [Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'main_menu')]
    ];

    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  });

  // Topup KHQR Generation
  bot.action(/^topup_([0-9.]+)$/, async (ctx) => {
    await ctx.answerCbQuery('កំពុងបង្កើតកូដ KHQR...').catch(() => {});
    const amount = parseFloat(ctx.match[1]);
    const billNo = `KHQR${Date.now().toString().slice(-6)}`;

    // Create pending deposit in database
    db.createDeposit({
      telegramId: ctx.from.id,
      amount,
      billNo
    });

    const qrData = await generateKHQR({ amount, billNo });

    const caption =
      `🇰🇭 *ទូទាត់ប្រាក់តាមរយៈ BAKONG KHQR*\n\n` +
      `• ម្ចាស់គណនី៖ *${escapeMarkdown(qrData.merchantName)}*\n` +
      `• ទឹកប្រាក់៖ *$${amount.toFixed(2)} USD*\n` +
      `• លេខ Bill៖ \`${billNo}\`\n\n` +
      `📌 *របៀបទូទាត់៖*\n` +
      `1. រក្សាទុករូបភាព QR Code ឬ Screenshot\n` +
      `2. បើកកម្មវិធីធនាគារណាក៏បាន (ABA, Bakong, ACLEDA, Wing, etc.)\n` +
      `3. ស្កេន និងផ្ទេរប្រាក់ $${amount.toFixed(2)} USD ឱ្យបានត្រឹមត្រូវ\n` +
      `4. ប្រព័ន្ធនឹងបញ្ចូលប្រាក់ស្វ័យប្រវត្តក្នុងរយៈពេល ១ នាទី!`;

    await ctx.replyWithPhoto(
      { source: qrData.qrBuffer },
      {
        caption,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 ពិនិត្យការទូទាត់ (Check Status)', `checkpay_${billNo}`)],
          [Markup.button.callback('🔙 ត្រឡប់ទៅកាបូប', 'menu_wallet')]
        ])
      }
    );
  });

  // Manual / Immediate payment verification check
  bot.action(/^checkpay_(.+)$/, async (ctx) => {
    const billNo = ctx.match[1];
    await ctx.answerCbQuery('កំពុងផ្ទៀងផ្ទាត់...').catch(() => {});

    // In demo/test mode, clicking approve approves it instantly for smooth testing
    const approved = await verifyPayment(billNo, bot);
    if (approved) {
      await ctx.reply(
        `✅ *ការទូទាត់ជោគជ័យ!*\n\n` +
        `ប្រាក់ *$${approved.amount.toFixed(2)} USD* ត្រូវបានបញ្ចូលទៅក្នុងកាបូបរបស់អ្នករួចរាល់ហើយ!\n` +
        `ឥឡូវនេះអ្នកអាចចូលទៅទិញទំនិញបាន។`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🛍️ ទៅកាន់ហាងទំនិញ', 'menu_categories')]])
        }
      );
    } else {
      await ctx.reply('⏳ មិនទាន់ទទួលបានទិន្នន័យផ្ទេរប្រាក់ពីធនាគារនៅឡើយទេ។ សូមរង់ចាំបន្តិច ឬព្យាយាមម្តងទៀត។');
    }
  });

  // --- Orders History ---
  bot.action('menu_orders', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const orders = db.getUserOrders(ctx.from.id);

    if (orders.length === 0) {
      return ctx.editMessageText(
        `📦 *ប្រវត្តិការបញ្ជាទិញ (Order History)*\n\nអ្នកមិនទាន់មានប្រវត្តិទិញទំនិញនៅឡើយទេ។`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ ទៅមើលទំនិញ', 'menu_categories')],
            [Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'main_menu')]
          ])
        }
      );
    }

    let text = `📦 *ប្រវត្តិការបញ្ជាទិញរបស់អ្នក (${orders.length} ទំនិញ)៖*\n\n`;
    orders.slice(0, 5).forEach((ord, index) => {
      text += `*${index + 1}. ${escapeMarkdown(ord.productName)}*\n`;
      text += `• លេខ Order: \`${ord.id}\` | តម្លៃ: $${ord.price.toFixed(2)}\n`;
      text += `• ព័ត៌មាន Account/Key:\n\`\`\`\n${ord.content}\n\`\`\`\n\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'main_menu')]])
    });
  });

  // --- Referral Program ---
  bot.action('menu_referral', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const stats = db.getReferralStats(ctx.from.id);

    const refText =
      `👥 *កម្មវិធីណែនាំមិត្តភក្តិ (Referral Program)*\n\n` +
      `ចែករំលែក Link របស់អ្នកទៅកាន់មិត្តភក្តិ ឬតាមបណ្តាញសង្គម ដើម្បីទទួលបានកម្រៃជើងសារ *${stats.commissionPercent}%* រាល់ពេលដែលពួកគេទិញទំនិញ!\n\n` +
      `📊 *ស្ថិតិរបស់អ្នក៖*\n` +
      `• ចំនួនមិត្តដែលបានចុះឈ្មោះ៖ *${stats.totalInvited} នាក់*\n` +
      `• ប្រាក់កម្រៃជើងសារដែលទទួលបាន៖ *$${stats.totalCommission.toFixed(2)} USD*\n\n` +
      `🔗 *Link ណែនាំផ្ទាល់ខ្លួនរបស់អ្នក៖*\n` +
      `\`${stats.referralLink}\`\n\n` +
      `ចុច Copy Link ខាងលើផ្ញើទៅកាន់មិត្តរបស់អ្នកឥឡូវនេះ!`;

    await ctx.editMessageText(refText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'main_menu')]])
    });
  });

  // --- Voice AI Menu (TTS & STT) ---
  bot.action('menu_voice', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const voiceText =
      `🎤 *សេវាកម្ម Voice AI (TTS & STT)*\n\n` +
      `1️⃣ *Text-To-Speech (បង្កើតសំឡេងនិយាយ)៖*\n` +
      `វាយពាក្យបញ្ជា \`/tts <អត្ថបទរបស់អ្នក>\`\n` +
      `ឧទាហរណ៍៖ \`/tts សួស្តី សូមស្វាគមន៍មកកាន់ហាងរបស់យើង\`\n\n` +
      `2️⃣ *Speech-To-Text (បំប្លែងសំឡេងជាអក្សរ)៖*\n` +
      `គ្រាន់តែផ្ញើ Voice Message (សារជាសំឡេង) មកក្នុង Chat នេះ នោះ Bot នឹងបម្លែងជាអក្សរជូនភ្លាមៗ!`;

    await ctx.editMessageText(voiceText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'main_menu')]])
    });
  });

  // TTS Command
  bot.command('tts', async (ctx) => {
    const text = ctx.message.text.replace('/tts', '').trim();
    if (!text) {
      return ctx.reply('⚠️ សូមបញ្ចូលអត្ថបទដែលអ្នកចង់បង្កើតជាសំឡេង។\nឧទាហរណ៍៖ `/tts សួស្តីបងប្អូនទាំងអស់គ្នា`', { parse_mode: 'Markdown' });
    }

    const waitMsg = await ctx.reply('🎙️ កំពុងបង្កើតសំឡេង សូមរង់ចាំ...');
    try {
      const audioBuffer = await textToSpeech(text, 'km');
      await ctx.replyWithVoice({ source: audioBuffer });
      await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ កំហុសក្នុងការបង្កើតសំឡេង៖ ${err.message}`);
    }
  });

  // STT Voice Note Handler
  bot.on('voice', async (ctx) => {
    const statusMsg = await ctx.reply('🎧 កំពុងស្តាប់ និងបម្លែងសំឡេងរបស់អ្នកជាអក្សរ...');
    try {
      const fileId = ctx.message.voice.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const res = await fetch(fileLink.href);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const transcript = await speechToText(buffer);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        null,
        `📝 *អត្ថបទដែលបម្លែងបាន (Transcription)៖*\n\n"${transcript}"`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, `❌ មិនអាចបកប្រែសំឡេងបានទេ៖ ${err.message}`);
    }
  });

  // --- Admin Menu ---
  bot.action('menu_admin', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!config.adminId || String(ctx.from.id) !== String(config.adminId)) {
      return ctx.reply('⛔ អ្នកគ្មានសិទ្ធិជា Admin ទេ។');
    }

    const metrics = db.getDashboardMetrics();
    const adminText =
      `👑 *ផ្ទាំងគ្រប់គ្រង ADMIN (Control Panel)*\n\n` +
      `• ចំនួនអតិថិជនសរុប៖ *${metrics.totalUsers} នាក់*\n` +
      `• ការបញ្ជាទិញសរុប៖ *${metrics.totalOrders} Orders*\n` +
      `• ចំណូលសរុបទូទាត់៖ *$${metrics.totalRevenue.toFixed(2)} USD*\n` +
      `• ចំនួន Account ក្នុងស្តុក៖ *${metrics.availableStockCount} Items*\n\n` +
      `🛠️ *ពាក្យបញ្ជា Admin រហ័ស៖*\n` +
      `• \`/broadcast <អត្ថបទ>\` : ផ្ញើសារដំណឹងទៅសមាជិកទាំងអស់\n` +
      `• \`/addstock <prod_id> <user:pass>\` : បញ្ចូលស្តុកទំនិញ`;

    await ctx.editMessageText(adminText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📢 ផ្ញើសារដំណឹង (Broadcast)', 'admin_broadcast_guide')],
        [Markup.button.callback('🔙 ត្រឡប់ក្រោយ', 'main_menu')]
      ])
    });
  });

  // Broadcast Command for Admin
  bot.command('broadcast', async (ctx) => {
    if (!config.adminId || String(ctx.from.id) !== String(config.adminId)) return;

    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
      return ctx.reply('⚠️ សូមវាយអត្ថបទដែលចង់ផ្សាយ។\nឧទាហរណ៍៖ `/broadcast 🎉 ប្រូម៉ូសិនពិសេស បញ្ចុះតម្លៃ 20% លើ Netflix!`', { parse_mode: 'Markdown' });
    }

    const users = db.getAllUsers();
    let sentCount = 0;
    const alertMsg = await ctx.reply(`📢 កំពុងចាប់ផ្តើមផ្ញើសារទៅកាន់សមាជិក ${users.length} នាក់...`);

    for (const u of users) {
      try {
        await bot.telegram.sendMessage(
          u.telegramId,
          `📢 *សេចក្តីជូនដំណឹងពីហាង (Announcement)*\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
        sentCount++;
        // Delay 40ms to respect Telegram flood rate limit
        await new Promise(r => setTimeout(r, 40));
      } catch (err) {
        // user may have blocked bot
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      alertMsg.message_id,
      null,
      `✅ បានផ្ញើសារដំណឹងជោគជ័យទៅកាន់សមាជិកចំនួន *${sentCount}/${users.length}* នាក់!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Return to main menu
  bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const user = db.getUser(ctx.from.id);
    const welcomeText =
      `👋 *សូមស្វាគមន៍មកកាន់ ${escapeMarkdown(config.bakong.merchantName)}!*\n\n` +
      `👤 *គណនីរបស់អ្នក៖* *${escapeMarkdown(user.firstName)}*\n` +
      `• សមតុល្យកាបូប៖ *$${user.balance.toFixed(2)} USD*\n\n` +
      `សូមជ្រើសរើសមុខងារខាងក្រោម៖`;

    const buttons = [
      [Markup.button.callback('🛍️ មើលទំនិញ (Shop)', 'menu_categories'), Markup.button.callback('💳 កាបូបលុយ (Wallet)', 'menu_wallet')],
      [Markup.button.callback('📦 ប្រវត្តិទិញ (Orders)', 'menu_orders'), Markup.button.callback('👥 ណែនាំមិត្ត (Referral)', 'menu_referral')],
      [Markup.button.callback('🎤 Voice AI (TTS & STT)', 'menu_voice'), Markup.button.callback('📥 ទាញយកវីដេអូ (Downloader)', 'menu_downloader')]
    ];

    if (config.adminId && String(ctx.from.id) === String(config.adminId)) {
      buttons.push([Markup.button.callback('👑 Admin Dashboard', 'menu_admin')]);
    }

    await ctx.editMessageText(welcomeText, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  });

  // --- All-in-One Video & Audio Downloader System ---
  const urlCache = new Map();

  function cacheUrl(url) {
    const id = Math.random().toString(36).slice(2, 10);
    urlCache.set(id, { url, time: Date.now() });
    if (urlCache.size > 200) {
      const now = Date.now();
      for (const [key, val] of urlCache.entries()) {
        if (now - val.time > 2 * 60 * 60 * 1000) {
          urlCache.delete(key);
        }
      }
    }
    return id;
  }

  // Downloader Menu Guide
  bot.action('menu_downloader', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const guideText =
      `📥 *ប្រព័ន្ធទាញយកវីដេអូគ្រប់វេបសាយ (All-in-One Video Downloader)*\n\n` +
      `អ្នកអាចទាញយកវីដេអូ និងសំឡេងពីគ្រប់បណ្តាញសង្គមដោយឥតគិតថ្លៃ និងគ្មាន Watermark!\n\n` +
      `🌐 *គាំទ្រគ្រប់វេបសាយធំៗ (Supported Sites)៖*\n` +
      `• *TikTok* (គ្មាន Watermark / No Watermark)\n` +
      `• *YouTube & Shorts*\n` +
      `• *Facebook* (Reels & Watch)\n` +
      `• *Instagram* (Reels & Posts)\n` +
      `• *Twitter / X*\n` +
      `• *Threads, Reddit, Pinterest, Douyin...*\n` +
      `• និងវេបសាយជាង 1000+ ទៀត!\n\n` +
      `💡 *របៀបប្រើប្រាស់ងាយៗ៖*\n` +
      `1️⃣ គ្រាន់តែ Copy Link វីដេអូដែលចង់បាន\n` +
      `2️⃣ ផ្ញើ (Paste) Link ចូលក្នុង Chat នេះផ្ទាល់\n` +
      `3️⃣ ឬប្រើពាក្យបញ្ជា \`/dl <link>\` (វីដេអូ)\n` +
      `4️⃣ ឬប្រើពាក្យបញ្ជា \`/mp3 <link>\` (សំឡេង MP3)`;

    await ctx.editMessageText(guideText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 ត្រឡប់ក្រោយ (Main Menu)', 'main_menu')]
      ])
    });
  });

  // Handler: Video Download
  async function handleVideoDownload(ctx, rawUrl) {
    const url = extractUrl(rawUrl);
    if (!url) {
      return ctx.reply('⚠️ សូមបញ្ចូល Link វីដេអូឱ្យបានត្រឹមត្រូវ។\nឧទាហរណ៍៖ `/dl https://vt.tiktok.com/...`', { parse_mode: 'Markdown' });
    }

    const waitMsg = await ctx.reply('⏳ កំពុងដំណើរការទាញយកវីដេអូ... សូមរង់ចាំបន្តិច');
    let videoResult = null;

    try {
      videoResult = await downloadVideo(url);
      const shortId = cacheUrl(url);

      const caption =
        `🎬 *${escapeMarkdown(videoResult.title)}*\n\n` +
        `🌐 *ប្រភព៖* ${videoResult.platform}\n` +
        `👤 *អ្នកបង្ហោះ៖* ${escapeMarkdown(videoResult.uploader)}\n` +
        `⏱️ *រយៈពេល៖* ${videoResult.durationFormatted}\n` +
        `📦 *ទំហំ៖* ${(videoResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB\n\n` +
        `🤖 _ទាញយកដោយ @${config.botUsername || 'StoreBot'}_`;

      const buttons = [
        [Markup.button.callback('🎵 ទាញយកតែសំឡេង (MP3)', `dl_mp3_${shortId}`)]
      ];

      await ctx.replyWithVideo(
        { source: videoResult.filePath },
        {
          caption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons)
        }
      );

      await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    } catch (err) {
      console.error('Video download error:', err.message);
      const isOversized = err.message.includes('50MB') || err.message.includes('larger than');
      const shortId = cacheUrl(url);

      if (isOversized) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          waitMsg.message_id,
          null,
          `⚠️ *វីដេអូនេះមានទំហំធំជាង 50MB!*\n\n` +
          `Telegram Bot អនុញ្ញាតឱ្យផ្ញើវីដេអូត្រឹម 50MB ប៉ុណ្ណោះ។\n` +
          `💡 លោកអ្នកអាចទាញយកតែសំឡេង MP3 ដោយចុចប៊ូតុងខាងក្រោម៖`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🎵 ទាញយកជាសំឡេង (MP3)', `dl_mp3_${shortId}`)]
            ])
          }
        );
      } else {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          waitMsg.message_id,
          null,
          `❌ *មិនអាចទាញយកវីដេអូបានទេ*\n\nមូលហេតុ៖ ${escapeMarkdown(err.message)}\n\n💡 សូមពិនិត្យមើល Link ឬសាកល្បងម្ដងទៀត។`,
          { parse_mode: 'Markdown' }
        );
      }
    } finally {
      if (videoResult && typeof videoResult.cleanup === 'function') {
        videoResult.cleanup();
      }
    }
  }

  // Handler: Audio Download
  async function handleAudioDownload(ctx, rawUrl) {
    const url = extractUrl(rawUrl);
    if (!url) {
      return ctx.reply('⚠️ សូមបញ្ចូល Link វីដេអូឱ្យបានត្រឹមត្រូវ។\nឧទាហរណ៍៖ `/mp3 https://www.youtube.com/...`', { parse_mode: 'Markdown' });
    }

    const waitMsg = await ctx.reply('🎵 កំពុងទាញយក និងបម្លែងជាសំឡេង MP3... សូមរង់ចាំបន្តិច');
    let audioResult = null;

    try {
      audioResult = await downloadAudio(url);

      const caption =
        `🎵 *${escapeMarkdown(audioResult.title)}*\n\n` +
        `🌐 *ប្រភព៖* ${audioResult.platform}\n` +
        `👤 *សិល្បករ/អ្នកបង្ហោះ៖* ${escapeMarkdown(audioResult.artist)}\n` +
        `⏱️ *រយៈពេល៖* ${audioResult.durationFormatted}\n` +
        `📦 *ទំហំ៖* ${(audioResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB\n\n` +
        `🤖 _ទាញយកដោយ @${config.botUsername || 'StoreBot'}_`;

      await ctx.replyWithAudio(
        { source: audioResult.filePath },
        {
          caption,
          title: audioResult.title,
          performer: audioResult.artist,
          parse_mode: 'Markdown'
        }
      );

      await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    } catch (err) {
      console.error('Audio download error:', err.message);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitMsg.message_id,
        null,
        `❌ *មិនអាចទាញយកសំឡេងបានទេ*\n\nមូលហេតុ៖ ${escapeMarkdown(err.message)}`,
        { parse_mode: 'Markdown' }
      );
    } finally {
      if (audioResult && typeof audioResult.cleanup === 'function') {
        audioResult.cleanup();
      }
    }
  }

  // Commands
  bot.command(['dl', 'download', 'video'], async (ctx) => {
    const text = ctx.message.text.replace(/^\/(dl|download|video)/i, '').trim();
    if (!text) {
      return ctx.reply(
        `📥 *សូមផ្ញើ Link វីដេអូជាមួយពាក្យបញ្ជា*\n\nឧទាហរណ៍៖\n\`/dl https://vt.tiktok.com/...\`\n\`/dl https://youtu.be/...\`\n\`/dl https://www.facebook.com/.../videos/...\``,
        { parse_mode: 'Markdown' }
      );
    }
    await handleVideoDownload(ctx, text);
  });

  bot.command(['mp3', 'audio', 'music'], async (ctx) => {
    const text = ctx.message.text.replace(/^\/(mp3|audio|music)/i, '').trim();
    if (!text) {
      return ctx.reply(
        `🎵 *សូមផ្ញើ Link ជាមួយពាក្យបញ្ជាដើម្បីទាញយក MP3*\n\nឧទាហរណ៍៖\n\`/mp3 https://youtu.be/...\``,
        { parse_mode: 'Markdown' }
      );
    }
    await handleAudioDownload(ctx, text);
  });

  bot.action(/^dl_mp3_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('🎵 កំពុងដំណើរការទាញយក MP3...').catch(() => {});
    const shortId = ctx.match[1];
    const cached = urlCache.get(shortId);
    if (!cached || !cached.url) {
      return ctx.reply('⚠️ Link នេះបានផុតកំណត់ហើយ។ សូមផ្ញើ Link វីដេអូមកម្តងទៀត។');
    }
    await handleAudioDownload(ctx, cached.url);
  });

  // Help command
  bot.command('help', async (ctx) => {
    const helpText =
      `📖 *សៀវភៅណែនាំពាក្យបញ្ជា Bot (Commands Guide)*\n\n` +
      `🛍️ *ផ្នែកហាង & កាបូបលុយ៖*\n` +
      `• /start : បើកផ្ទាំង Menu មេ\n` +
      `• /help : មើលបញ្ជីពាក្យបញ្ជាទាំងអស់\n\n` +
      `📥 *ផ្នែកទាញយកវីដេអូ & MP3 (Downloader)៖*\n` +
      `• \`/dl <link>\` : ទាញយកវីដេអូ (TikTok, YouTube, FB, IG, X, Reddit...)\n` +
      `• \`/mp3 <link>\` : ទាញយកតែសំឡេងជា MP3\n` +
      `• ឬគ្រាន់តែ Copy & Paste Link ចូលក្នុង Chat នេះផ្ទាល់!\n\n` +
      `🎤 *ផ្នែក Voice AI៖*\n` +
      `• \`/tts <អត្ថបទ>\` : បង្កើតសំឡេងនិយាយជាភាសាខ្មែរ\n` +
      `• ផ្ញើសារសំឡេង (Voice note) : បម្លែងសំឡេងជាអក្សរ`;

    await ctx.replyWithMarkdown(helpText);
  });

  // Auto-detect link sent in chat
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text || '';
    if (text.startsWith('/')) {
      return next();
    }
    const detectedUrl = extractUrl(text);
    if (detectedUrl) {
      return handleVideoDownload(ctx, detectedUrl);
    }
    return next();
  });

  return bot;
}

function escapeMarkdown(text = '') {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

