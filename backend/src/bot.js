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
        `👤 *New User Registered*\n` +
        `• Name: ${escapeMarkdown(user.firstName)} (@${user.username || 'NoUsername'})\n` +
        `• ID: \`${user.telegramId}\`\n` +
        `• Referrer: ${user.referredBy ? `\`${user.referredBy}\`` : 'None'}`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    const welcomeText =
      `👋 *Welcome to ${escapeMarkdown(config.bakong.merchantName)}!*\n\n` +
      `We offer Premium Accounts, Software License Keys & Digital Tools with instant automated delivery 24/7.\n\n` +
      `👤 *Your Account Profile:*\n` +
      `• Name: *${escapeMarkdown(user.firstName)}*\n` +
      `• User ID: \`${user.telegramId}\`\n` +
      `• Wallet Balance: *$${user.balance.toFixed(2)} USD*\n` +
      `• Total Downloads: *${user.downloadCount || 0} media*\n\n` +
      `Please choose an option below:`;

    const buttons = [
      [Markup.button.callback('🛍️ Shop Products', 'menu_categories'), Markup.button.callback('💳 My Wallet', 'menu_wallet')],
      [Markup.button.callback('📦 Order History', 'menu_orders'), Markup.button.callback('👥 Referral Program', 'menu_referral')],
      [Markup.button.callback('🎤 Voice AI (TTS/STT)', 'menu_voice'), Markup.button.callback('📥 Video Downloader', 'menu_downloader')]
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
    buttons.push([Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]);

    await ctx.editMessageText(
      `📂 *Product Categories*\n\nSelect a category below to explore available digital items and instant stock:`,
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
        `⚠️ No products available in this category yet.`,
        Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Categories', 'menu_categories')]])
      );
    }

    const buttons = products.map((p) => {
      const stockBadge = p.stockCount > 0 ? `(${p.stockCount} in stock)` : '(Out of Stock)';
      return [Markup.button.callback(`${p.icon} ${p.name} - $${p.price.toFixed(2)} ${stockBadge}`, `prod_${p.id}`)];
    });
    buttons.push([Markup.button.callback('🔙 Back to Categories', 'menu_categories')]);

    await ctx.editMessageText(
      `🛍️ *Products Catalog*\n\nClick on any product to view details and instant purchase options:`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
  });

  // --- Product Detail View ---
  bot.action(/^prod_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const prodId = ctx.match[1];
    const product = db.getProductById(prodId);

    if (!product) {
      return ctx.reply('⚠️ Product not found.');
    }

    const inStock = product.stockCount > 0;
    const detailText =
      `${product.icon} *${escapeMarkdown(product.name)}*\n\n` +
      `📝 *Description:*\n${escapeMarkdown(product.description)}\n\n` +
      `💵 *Price:* *$${product.price.toFixed(2)} USD*\n` +
      `📦 *Stock Status:* ${inStock ? `✅ *${product.stockCount} available*` : '❌ *Out of Stock*'}\n\n` +
      `⚡ *Instant Delivery:* Account credentials or License Key will be delivered to this chat immediately upon purchase!`;

    const buttons = [];
    if (inStock) {
      buttons.push([Markup.button.callback(`🛒 Buy Now ($${product.price.toFixed(2)})`, `buy_${product.id}`)]);
    }
    buttons.push([
      Markup.button.callback('🔙 Back', `cat_${product.categoryId}`),
      Markup.button.callback('🏠 Home', 'main_menu')
    ]);

    await ctx.editMessageText(detailText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  });

  // --- Buy & Instant Stock Delivery Flow ---
  bot.action(/^buy_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('Processing purchase...').catch(() => {});
    const prodId = ctx.match[1];
    const product = db.getProductById(prodId);
    const user = db.getUser(ctx.from.id);

    if (!product) return ctx.reply('⚠️ Invalid product.');
    if (product.stockCount <= 0) return ctx.reply('❌ This product is currently out of stock. Please wait for restock!');

    // Check balance
    if (user.balance < product.price) {
      const shortfall = (product.price - user.balance).toFixed(2);
      return ctx.reply(
        `⚠️ *Insufficient Wallet Balance!*\n\n` +
        `• Product Price: *$${product.price.toFixed(2)} USD*\n` +
        `• Current Balance: *$${user.balance.toFixed(2)} USD*\n` +
        `• Amount Needed: *$${shortfall} USD*\n\n` +
        `Please top up your wallet using Bakong KHQR:`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💳 Top Up Wallet', 'menu_wallet')],
            [Markup.button.callback('🔙 Back to Product', `prod_${product.id}`)]
          ])
        }
      );
    }

    // Process purchase
    const stockItem = db.consumeStockItem(product.id, ctx.from.id);
    if (!stockItem) {
      return ctx.reply('❌ Purchase failed because the item was just claimed by another customer. Please try again!');
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
        `🎉 *Referral Bonus Received!*\n\n` +
        `A friend you invited just made a purchase. You earned *$${refResult.commission.toFixed(2)} USD* commission credited to your wallet!`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

    // Deliver product to customer
    const deliveryMessage =
      `🎉 *Purchase Successful!*\n\n` +
      `🛍️ *Product:* ${escapeMarkdown(product.name)}\n` +
      `🧾 *Order ID:* \`${order.id}\`\n` +
      `💵 *Amount Deducted:* $${product.price.toFixed(2)} USD\n\n` +
      `🔐 *Your Account Credentials / License Key:*\n` +
      `\`\`\`\n${stockItem.content}\n\`\`\`\n\n` +
      `⚠️ *Note:* Please save these details safely. Thank you for shopping with us!`;

    await ctx.replyWithMarkdown(deliveryMessage, Markup.inlineKeyboard([
      [Markup.button.callback('📦 Order History', 'menu_orders'), Markup.button.callback('🛍️ Continue Shopping', 'menu_categories')]
    ]));

    // Notify Admin / Channel
    const adminAlert =
      `🚨 *New Order Placed!*\n\n` +
      `• Customer: ${escapeMarkdown(ctx.from.first_name)} (@${ctx.from.username || 'NoUser'})\n` +
      `• User ID: \`${ctx.from.id}\`\n` +
      `• Item: ${escapeMarkdown(product.name)}\n` +
      `• Price: *$${product.price.toFixed(2)} USD*\n` +
      `• Order ID: \`${order.id}\``;

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
      `💳 *My Wallet & Balance*\n\n` +
      `• Name: *${escapeMarkdown(user.firstName)}*\n` +
      `• Current Balance: *$${user.balance.toFixed(2)} USD*\n` +
      `• Total Spent: *$${(user.totalSpent || 0).toFixed(2)} USD*\n\n` +
      `Select an amount to top up via automatic *Bakong KHQR*:`;

    const buttons = [
      [Markup.button.callback('💵 +$1.00', 'topup_1'), Markup.button.callback('💵 +$3.00', 'topup_3')],
      [Markup.button.callback('💵 +$5.00', 'topup_5'), Markup.button.callback('💵 +$10.00', 'topup_10')],
      [Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]
    ];

    await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
  });

  // Topup KHQR Generation
  bot.action(/^topup_([0-9.]+)$/, async (ctx) => {
    await ctx.answerCbQuery('Generating KHQR code...').catch(() => {});
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
      `🇰🇭 *Pay via BAKONG KHQR*\n\n` +
      `• Merchant: *${escapeMarkdown(qrData.merchantName)}*\n` +
      `• Amount: *$${amount.toFixed(2)} USD*\n` +
      `• Bill No: \`${billNo}\`\n\n` +
      `📌 *Instructions:*\n` +
      `1. Save or screenshot this QR code\n` +
      `2. Open your mobile banking app (ABA, Bakong, ACLEDA, Wing, Canadia, etc.)\n` +
      `3. Scan the QR code and confirm the $${amount.toFixed(2)} USD transfer\n` +
      `4. Your wallet will update automatically within 1 minute!`;

    await ctx.replyWithPhoto(
      { source: qrData.qrBuffer },
      {
        caption,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Check Status', `checkpay_${billNo}`)],
          [Markup.button.callback('🔙 Back to Wallet', 'menu_wallet')]
        ])
      }
    );
  });

  // Manual payment verification check
  bot.action(/^checkpay_(.+)$/, async (ctx) => {
    const billNo = ctx.match[1];
    await ctx.answerCbQuery('Verifying payment...').catch(() => {});

    const approved = await verifyPayment(billNo, bot);
    if (approved) {
      await ctx.reply(
        `✅ *Payment Confirmed!*\n\n` +
        `*$${approved.amount.toFixed(2)} USD* has been added to your wallet balance!\n` +
        `You can now proceed to shop.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[Markup.button.callback('🛍️ Go to Shop', 'menu_categories')]])
        }
      );
    } else {
      await ctx.reply('⏳ No transaction found yet. Please complete the transfer in your bank app and try again in a few moments.');
    }
  });

  // --- Orders History ---
  bot.action('menu_orders', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const orders = db.getUserOrders(ctx.from.id);

    if (orders.length === 0) {
      return ctx.editMessageText(
        `📦 *Order History*\n\nYou haven't placed any orders yet.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛍️ Explore Shop', 'menu_categories')],
            [Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]
          ])
        }
      );
    }

    let text = `📦 *Your Order History (${orders.length} items):*\n\n`;
    orders.slice(0, 5).forEach((ord, index) => {
      text += `*${index + 1}. ${escapeMarkdown(ord.productName)}*\n`;
      text += `• Order ID: \`${ord.id}\` | Price: $${ord.price.toFixed(2)}\n`;
      text += `• Credentials / Key:\n\`\`\`\n${ord.content}\n\`\`\`\n\n`;
    });

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]])
    });
  });

  // --- Referral Program ---
  bot.action('menu_referral', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const stats = db.getReferralStats(ctx.from.id);

    const refText =
      `👥 *Referral Affiliate Program*\n\n` +
      `Share your personal link with friends or on social media to earn a *${stats.commissionPercent}%* commission on every purchase they make!\n\n` +
      `📊 *Your Referral Stats:*\n` +
      `• Friends Invited: *${stats.totalInvited}*\n` +
      `• Total Commission Earned: *$${stats.totalCommission.toFixed(2)} USD*\n\n` +
      `🔗 *Your Unique Referral Link:*\n` +
      `\`${stats.referralLink}\`\n\n` +
      `Copy and share the link above to start earning!`;

    await ctx.editMessageText(refText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]])
    });
  });

  // --- Voice AI Menu (TTS & STT) ---
  bot.action('menu_voice', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const voiceText =
      `🎤 *Voice AI Services (TTS & STT)*\n\n` +
      `1️⃣ *Text-To-Speech (TTS):*\n` +
      `Type the command \`/tts <your text>\`\n` +
      `Example: \`/tts Welcome to our digital store!\`\n\n` +
      `2️⃣ *Speech-To-Text (STT):*\n` +
      `Simply send a Voice Note into this chat, and the bot will transcribe it to text instantly!`;

    await ctx.editMessageText(voiceText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]])
    });
  });

  // TTS Command
  bot.command('tts', async (ctx) => {
    const text = ctx.message.text.replace('/tts', '').trim();
    if (!text) {
      return ctx.reply('⚠️ Please provide the text you want converted to speech.\nExample: `/tts Hello everyone, welcome to our store!`', { parse_mode: 'Markdown' });
    }

    const waitMsg = await ctx.reply('🎙️ Generating voice audio, please wait...');
    try {
      const audioBuffer = await textToSpeech(text, 'en');
      await ctx.replyWithVoice({ source: audioBuffer });
      await ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, null, `❌ Failed to generate voice: ${err.message}`);
    }
  });

  // STT Voice Note Handler
  bot.on('voice', async (ctx) => {
    const statusMsg = await ctx.reply('🎧 Listening and transcribing your voice message...');
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
        `📝 *Voice Transcription:*\n\n"${transcript}"`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, `❌ Could not transcribe audio: ${err.message}`);
    }
  });

  // --- Admin Menu ---
  bot.action('menu_admin', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    if (!config.adminId || String(ctx.from.id) !== String(config.adminId)) {
      return ctx.reply('⛔ Unauthorized: You do not have admin access.');
    }

    const metrics = db.getDashboardMetrics();
    const adminText =
      `👑 *ADMIN Control Panel*\n\n` +
      `• Total Customers: *${metrics.totalUsers}*\n` +
      `• Total Orders: *${metrics.totalOrders}*\n` +
      `• Total Revenue: *$${metrics.totalRevenue.toFixed(2)} USD*\n` +
      `• Total Downloads: *${metrics.totalDownloads || 0}*\n` +
      `• Items in Stock: *${metrics.availableStockCount}*\n\n` +
      `🛠️ *Quick Admin Commands:*\n` +
      `• \`/broadcast <message>\` : Broadcast message to all users\n` +
      `• \`/addstock <prod_id> <user:pass>\` : Add stock item`;

    await ctx.editMessageText(adminText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📢 Broadcast Guide', 'admin_broadcast_guide')],
        [Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]
      ])
    });
  });

  // Broadcast Command for Admin
  bot.command('broadcast', async (ctx) => {
    if (!config.adminId || String(ctx.from.id) !== String(config.adminId)) return;

    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
      return ctx.reply('⚠️ Please provide the message content to broadcast.\nExample: `/broadcast 🎉 Special 20% discount on Netflix accounts today!`', { parse_mode: 'Markdown' });
    }

    const users = db.getAllUsers();
    let sentCount = 0;
    const alertMsg = await ctx.reply(`📢 Starting broadcast to ${users.length} members...`);

    for (const u of users) {
      try {
        await bot.telegram.sendMessage(
          u.telegramId,
          `📢 *Announcement*\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
        sentCount++;
        await new Promise(r => setTimeout(r, 40));
      } catch (err) {
        // user may have blocked bot
      }
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      alertMsg.message_id,
      null,
      `✅ Broadcast successfully sent to *${sentCount}/${users.length}* members!`,
      { parse_mode: 'Markdown' }
    );
  });

  // Return to main menu
  bot.action('main_menu', async (ctx) => {
    await ctx.answerCbQuery().catch(() => {});
    const user = db.getUser(ctx.from.id);
    const welcomeText =
      `👋 *Welcome to ${escapeMarkdown(config.bakong.merchantName)}!*\n\n` +
      `👤 *Your Account Profile:* *${escapeMarkdown(user.firstName)}*\n` +
      `• Wallet Balance: *$${user.balance.toFixed(2)} USD*\n` +
      `• Total Downloads: *${user.downloadCount || 0} media*\n\n` +
      `Please choose an option below:`;

    const buttons = [
      [Markup.button.callback('🛍️ Shop Products', 'menu_categories'), Markup.button.callback('💳 My Wallet', 'menu_wallet')],
      [Markup.button.callback('📦 Order History', 'menu_orders'), Markup.button.callback('👥 Referral Program', 'menu_referral')],
      [Markup.button.callback('🎤 Voice AI (TTS/STT)', 'menu_voice'), Markup.button.callback('📥 Video Downloader', 'menu_downloader')]
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
    const user = db.getUser(ctx.from.id);
    const guideText =
      `📥 *All-in-One Video & Audio Downloader*\n\n` +
      `👤 *Your Download Stats:* *${(user && user.downloadCount) || 0}* media files\n\n` +
      `Download videos and audio from all popular social media platforms without watermarks!\n\n` +
      `🌐 *Supported Sites:*\n` +
      `• *TikTok* (No Watermark)\n` +
      `• *YouTube & Shorts*\n` +
      `• *Facebook* (Reels & Watch)\n` +
      `• *Instagram* (Reels & Posts)\n` +
      `• *Twitter / X*\n` +
      `• *Threads, Reddit, Pinterest, Douyin...*\n` +
      `• And 1000+ other websites!\n\n` +
      `💡 *How to use:*\n` +
      `1️⃣ Copy the video link from any app or website\n` +
      `2️⃣ Paste the link directly into this chat\n` +
      `3️⃣ Or use command: \`/dl <link>\` (Video)\n` +
      `4️⃣ Or use command: \`/mp3 <link>\` (Audio MP3)`;

    await ctx.editMessageText(guideText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Back to Main Menu', 'main_menu')]
      ])
    });
  });

  // Handler: Video Download
  async function handleVideoDownload(ctx, rawUrl) {
    const url = extractUrl(rawUrl);
    if (!url) {
      return ctx.reply('⚠️ Please provide a valid video link.\nExample: `/dl https://vt.tiktok.com/...`', { parse_mode: 'Markdown' });
    }

    const waitMsg = await ctx.reply('⏳ Downloading video... Please wait a moment');
    let videoResult = null;

    try {
      videoResult = await downloadVideo(url);
      const shortId = cacheUrl(url);

      // Record download analytics
      db.recordDownload({
        telegramId: ctx.from?.id,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        url,
        title: videoResult.title,
        platform: videoResult.platform,
        type: 'video',
        sizeBytes: videoResult.sizeBytes
      });

      const caption =
        `🎬 *${escapeMarkdown(videoResult.title)}*\n\n` +
        `🌐 *Platform:* ${videoResult.platform}\n` +
        `👤 *Uploader:* ${escapeMarkdown(videoResult.uploader)}\n` +
        `⏱️ *Duration:* ${videoResult.durationFormatted}\n` +
        `📦 *Size:* ${(videoResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB\n\n` +
        `🤖 _Downloaded via @${config.botUsername || 'StoreBot'}_`;

      const buttons = [
        [Markup.button.callback('🎵 Download Audio (MP3)', `dl_mp3_${shortId}`)]
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
          `⚠️ *Video file exceeds 50MB!*\n\n` +
          `Telegram bots can only upload files up to 50MB.\n` +
          `💡 You can download the audio MP3 version instead by clicking below:`,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🎵 Download Audio (MP3)', `dl_mp3_${shortId}`)]
            ])
          }
        );
      } else {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          waitMsg.message_id,
          null,
          `❌ *Could not download video*\n\nReason: ${escapeMarkdown(err.message)}\n\n💡 Please check the link or try again.`,
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
      return ctx.reply('⚠️ Please provide a valid video link.\nExample: `/mp3 https://www.youtube.com/...`', { parse_mode: 'Markdown' });
    }

    const waitMsg = await ctx.reply('🎵 Extracting and downloading MP3 audio... Please wait a moment');
    let audioResult = null;

    try {
      audioResult = await downloadAudio(url);

      // Record audio download analytics
      db.recordDownload({
        telegramId: ctx.from?.id,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        url,
        title: audioResult.title,
        platform: audioResult.platform,
        type: 'audio',
        sizeBytes: audioResult.sizeBytes
      });

      const caption =
        `🎵 *${escapeMarkdown(audioResult.title)}*\n\n` +
        `🌐 *Platform:* ${audioResult.platform}\n` +
        `👤 *Artist/Uploader:* ${escapeMarkdown(audioResult.artist)}\n` +
        `⏱️ *Duration:* ${audioResult.durationFormatted}\n` +
        `📦 *Size:* ${(audioResult.sizeBytes / (1024 * 1024)).toFixed(1)} MB\n\n` +
        `🤖 _Downloaded via @${config.botUsername || 'StoreBot'}_`;

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
        `❌ *Could not extract audio*\n\nReason: ${escapeMarkdown(err.message)}`,
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
        `📥 *Please provide a video link with the command*\n\nExample:\n\`/dl https://vt.tiktok.com/...\`\n\`/dl https://youtu.be/...\`\n\`/dl https://www.facebook.com/.../videos/...\``,
        { parse_mode: 'Markdown' }
      );
    }
    await handleVideoDownload(ctx, text);
  });

  bot.command(['mp3', 'audio', 'music'], async (ctx) => {
    const text = ctx.message.text.replace(/^\/(mp3|audio|music)/i, '').trim();
    if (!text) {
      return ctx.reply(
        `🎵 *Please provide a video link to extract MP3*\n\nExample:\n\`/mp3 https://youtu.be/...\``,
        { parse_mode: 'Markdown' }
      );
    }
    await handleAudioDownload(ctx, text);
  });

  bot.action(/^dl_mp3_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery('🎵 Downloading MP3...').catch(() => {});
    const shortId = ctx.match[1];
    const cached = urlCache.get(shortId);
    if (!cached || !cached.url) {
      return ctx.reply('⚠️ This download session has expired. Please send the video link again.');
    }
    await handleAudioDownload(ctx, cached.url);
  });

  // Help command
  bot.command('help', async (ctx) => {
    const helpText =
      `📖 *Bot Commands & User Guide*\n\n` +
      `🛍️ *Shop & Wallet:*\n` +
      `• /start : Open the Main Menu\n` +
      `• /help : Show this commands guide\n\n` +
      `📥 *Video & Audio Downloader:*\n` +
      `• \`/dl <link>\` : Download video (TikTok, YouTube, FB, IG, X, Reddit...)\n` +
      `• \`/mp3 <link>\` : Download audio only as MP3\n` +
      `• Or simply paste any video URL directly into this chat!\n\n` +
      `🎤 *Voice AI:*\n` +
      `• \`/tts <text>\` : Convert text into voice speech\n` +
      `• Send voice note : Transcribe speech into text`;

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
