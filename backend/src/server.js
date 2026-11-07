import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { db } from './db.js';
import { verifyPayment } from './services/paymentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createStoreServer(bot = null) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Simple auth middleware for Admin API
  const authMiddleware = (req, res, next) => {
    const key = req.headers['x-admin-key'] || req.query.adminKey;
    if (key !== config.adminSecretKey) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Admin Secret Key' });
    }
    next();
  };

  // Health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      botActive: Boolean(bot),
      time: new Date().toISOString()
    });
  });

  // Admin login check
  app.post('/api/auth/login', (req, res) => {
    const { key } = req.body;
    if (key === config.adminSecretKey) {
      return res.json({ success: true, message: 'Authenticated successfully' });
    }
    return res.status(401).json({ error: 'Invalid Admin Secret Key' });
  });

  // Dashboard Metrics
  app.get('/api/dashboard/metrics', authMiddleware, (req, res) => {
    const metrics = db.getDashboardMetrics();
    res.json(metrics);
  });

  // Categories & Products
  app.get('/api/categories', (req, res) => {
    res.json(db.getCategories());
  });

  app.get('/api/products', (req, res) => {
    const categoryId = req.query.categoryId || null;
    res.json(db.getProducts(categoryId));
  });

  app.post('/api/products', authMiddleware, (req, res) => {
    const { name, categoryId, price, description, icon } = req.body;
    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: 'Name, Category, and Price are required' });
    }
    const created = db.addProduct({ name, categoryId, price, description, icon });
    res.json(created);
  });

  app.delete('/api/products/:id', authMiddleware, (req, res) => {
    db.deleteProduct(req.params.id);
    res.json({ success: true });
  });

  // Stock Management (Bulk add accounts / license keys)
  app.get('/api/stock', authMiddleware, (req, res) => {
    const productId = req.query.productId || null;
    res.json(db.getStockItems(productId));
  });

  app.post('/api/stock/bulk-add', authMiddleware, (req, res) => {
    const { productId, lines } = req.body;
    if (!productId || !lines) {
      return res.status(400).json({ error: 'productId and lines are required' });
    }

    const items = typeof lines === 'string' ? lines.split('\n') : lines;
    const addedCount = db.addStockItems(productId, items);

    // If bot is running, notify users that new stock has arrived!
    if (bot && addedCount > 0) {
      const prod = db.getProductById(productId);
      if (prod) {
        console.log(`Restocked ${addedCount} items for ${prod.name}`);
      }
    }

    res.json({ success: true, addedCount });
  });

  // Orders & Transactions
  app.get('/api/orders', authMiddleware, (req, res) => {
    res.json(db.getAllOrders());
  });

  // Users List
  app.get('/api/users', authMiddleware, (req, res) => {
    res.json(db.getAllUsers());
  });

  // Broadcast Announcement to All Telegram Users
  app.post('/api/broadcast', authMiddleware, async (req, res) => {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    if (!bot) {
      return res.status(500).json({ error: 'Telegram Bot is not connected' });
    }

    const users = db.getAllUsers();
    let delivered = 0;

    for (const u of users) {
      try {
        await bot.telegram.sendMessage(
          u.telegramId,
          `📢 *សេចក្តីជូនដំណឹង (Announcement)*\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
        delivered++;
        await new Promise(r => setTimeout(r, 40));
      } catch (e) {
        // user may have blocked bot
      }
    }

    res.json({ success: true, total: users.length, delivered });
  });

  // Auto-Payment Webhook Endpoint
  app.post('/api/payment/webhook', async (req, res) => {
    const { billNo } = req.body;
    if (!billNo) {
      return res.status(400).json({ error: 'billNo is required' });
    }

    const approved = await verifyPayment(billNo, bot);
    if (approved) {
      return res.json({ success: true, deposit: approved });
    }
    return res.status(404).json({ error: 'Deposit not found or already processed' });
  });

  // Serve static admin dashboard if built
  const dashboardDist = path.resolve(__dirname, '../../admin-dashboard/dist');
  if (fs.existsSync(dashboardDist)) {
    app.use(express.static(dashboardDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(dashboardDist, 'index.html'));
      }
    });
  }

  return app;
}

