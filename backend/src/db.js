import fs from 'fs';
import path from 'path';
import { config } from './config.js';

if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

const DB_FILE = path.join(config.dataDir, 'store_database.json');

// Initial seed data
const DEFAULT_DATA = {
  users: {},
  categories: [
    { id: 'cat_accounts', name: 'Premium Accounts (អាខោន)', icon: '🎬' },
    { id: 'cat_software', name: 'Software & Keys (កម្មវិធី)', icon: '💻' },
    { id: 'cat_tools', name: 'AI & Developer Tools', icon: '🤖' }
  ],
  products: [
    {
      id: 'prod_netflix',
      categoryId: 'cat_accounts',
      name: 'Netflix Premium 4K UHD (1 ខែ)',
      description: 'អាខោន Netflix 4K UHD Profile ផ្ទាល់ខ្លួន អាចមើលបាន 30 ថ្ងៃ',
      price: 3.50,
      icon: '🍿'
    },
    {
      id: 'prod_spotify',
      categoryId: 'cat_accounts',
      name: 'Spotify Premium Individual (3 ខែ)',
      description: 'អាខោន Spotify Premium ស្តាប់ភ្លេងគ្មានពាណិជ្ជកម្ម High Quality',
      price: 2.00,
      icon: '🎵'
    },
    {
      id: 'prod_win11',
      categoryId: 'cat_software',
      name: 'Windows 11 Pro Lifetime Retail Key',
      description: 'License Key ស្របច្បាប់ 100% សម្រាប់ Activate Windows 11 Pro រហូត',
      price: 5.00,
      icon: '🪟'
    },
    {
      id: 'prod_canva',
      categoryId: 'cat_software',
      name: 'Canva Pro Lifetime Education',
      description: 'Upgrade Canva Account របស់អ្នកទៅ Pro ប្រើប្រាស់ Template & AI ពេញលេញ',
      price: 4.00,
      icon: '🎨'
    },
    {
      id: 'prod_chatgpt',
      categoryId: 'cat_tools',
      name: 'ChatGPT Plus Shared Account (1 ខែ)',
      description: 'អាខោន ChatGPT Plus ប្រើប្រាស់ GPT-4o, DALL-E 3 & Canvas',
      price: 6.00,
      icon: '🤖'
    }
  ],
  stock: [
    // Pre-seeded stock items for instant testing
    { id: 'stk_1', productId: 'prod_netflix', content: 'Email: netflix_user01@mail.com | Pass: Khm@2026Net | Pin: 1234', isSold: false, soldTo: null, soldAt: null },
    { id: 'stk_2', productId: 'prod_netflix', content: 'Email: netflix_user02@mail.com | Pass: Pro#9988Uhd | Pin: 5678', isSold: false, soldTo: null, soldAt: null },
    { id: 'stk_3', productId: 'prod_spotify', content: 'Email: spot_kh01@mail.com | Pass: Music#2026!Kh', isSold: false, soldTo: null, soldAt: null },
    { id: 'stk_4', productId: 'prod_win11', content: 'W269N-WFGWX-YVC9B-4J6C9-T83GX (Retail Key)', isSold: false, soldTo: null, soldAt: null },
    { id: 'stk_5', productId: 'prod_canva', content: 'Invitation Link: https://canva.com/brand/join?token=DEMO_CANVA_KEY_2026', isSold: false, soldTo: null, soldAt: null },
    { id: 'stk_6', productId: 'prod_chatgpt', content: 'Email: gpt_plus_shared@mail.com | Pass: OpenAi#2026Kh', isSold: false, soldTo: null, soldAt: null }
  ],
  orders: [],
  deposits: [],
  referrals: []
};

class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to read database, initializing default:', e.message);
    }
    this.save(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  save(data = this.data) {
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (e) {
      console.error('Failed to save database:', e.message);
    }
  }

  // --- Users ---
  getUser(telegramId) {
    return this.data.users[String(telegramId)] || null;
  }

  getOrCreateUser(from, referrerId = null) {
    const id = String(from.id);
    if (!this.data.users[id]) {
      let validReferrer = null;
      if (referrerId && String(referrerId) !== id && this.data.users[String(referrerId)]) {
        validReferrer = String(referrerId);
      }

      this.data.users[id] = {
        telegramId: from.id,
        username: from.username || null,
        firstName: from.first_name || 'Customer',
        balance: 0.00,
        totalSpent: 0.00,
        referredBy: validReferrer,
        createdAt: new Date().toISOString()
      };

      if (validReferrer) {
        this.data.referrals.push({
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          referrerId: validReferrer,
          refereeId: id,
          refereeName: from.first_name || 'Friend',
          totalCommission: 0.00,
          createdAt: new Date().toISOString()
        });
      }

      this.save();
    } else {
      // Keep username & first_name updated
      this.data.users[id].username = from.username || this.data.users[id].username;
      this.data.users[id].firstName = from.first_name || this.data.users[id].firstName;
      this.save();
    }
    return this.data.users[id];
  }

  updateBalance(telegramId, delta) {
    const user = this.getUser(telegramId);
    if (!user) return null;
    user.balance = Math.max(0, parseFloat((user.balance + delta).toFixed(2)));
    if (delta < 0) {
      user.totalSpent = parseFloat(((user.totalSpent || 0) + Math.abs(delta)).toFixed(2));
    }
    this.save();
    return user.balance;
  }

  getAllUsers() {
    return Object.values(this.data.users);
  }

  // --- Categories & Products ---
  getCategories() {
    return this.data.categories;
  }

  getProducts(categoryId = null) {
    let prods = this.data.products;
    if (categoryId) {
      prods = prods.filter(p => p.categoryId === categoryId);
    }
    return prods.map(p => ({
      ...p,
      stockCount: this.countAvailableStock(p.id)
    }));
  }

  getProductById(productId) {
    const p = this.data.products.find(item => item.id === productId);
    if (!p) return null;
    return {
      ...p,
      stockCount: this.countAvailableStock(p.id)
    };
  }

  addProduct(item) {
    const id = item.id || `prod_${Date.now()}`;
    const newProd = {
      id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description || '',
      price: parseFloat(item.price) || 1.0,
      icon: item.icon || '📦'
    };
    this.data.products.push(newProd);
    this.save();
    return newProd;
  }

  deleteProduct(productId) {
    this.data.products = this.data.products.filter(p => p.id !== productId);
    this.save();
  }

  // --- Stock Management ---
  countAvailableStock(productId) {
    return this.data.stock.filter(s => s.productId === productId && !s.isSold).length;
  }

  getStockItems(productId = null) {
    if (productId) {
      return this.data.stock.filter(s => s.productId === productId);
    }
    return this.data.stock;
  }

  addStockItems(productId, itemsArray) {
    let count = 0;
    for (const text of itemsArray) {
      const trimmed = text.trim();
      if (trimmed) {
        this.data.stock.push({
          id: `stk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productId,
          content: trimmed,
          isSold: false,
          soldTo: null,
          soldAt: null
        });
        count++;
      }
    }
    this.save();
    return count;
  }

  consumeStockItem(productId, telegramId) {
    const item = this.data.stock.find(s => s.productId === productId && !s.isSold);
    if (!item) return null;

    item.isSold = true;
    item.soldTo = String(telegramId);
    item.soldAt = new Date().toISOString();
    this.save();
    return item;
  }

  // --- Orders ---
  createOrder({ telegramId, productId, productName, price, content }) {
    const order = {
      id: `ord_${Date.now()}`,
      telegramId,
      productId,
      productName,
      price,
      content,
      createdAt: new Date().toISOString()
    };
    this.data.orders.unshift(order);
    this.save();
    return order;
  }

  getUserOrders(telegramId) {
    return this.data.orders.filter(o => String(o.telegramId) === String(telegramId));
  }

  getAllOrders() {
    return this.data.orders;
  }

  // --- Deposits ---
  createDeposit({ telegramId, amount, method = 'KHQR', billNo }) {
    const dep = {
      id: `dep_${Date.now()}`,
      billNo: billNo || `KHQR${Date.now().toString().slice(-6)}`,
      telegramId,
      amount: parseFloat(amount),
      method,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.data.deposits.unshift(dep);
    this.save();
    return dep;
  }

  approveDeposit(depositId) {
    const dep = this.data.deposits.find(d => d.id === depositId || d.billNo === depositId);
    if (!dep || dep.status === 'completed') return null;

    dep.status = 'completed';
    dep.approvedAt = new Date().toISOString();
    this.updateBalance(dep.telegramId, dep.amount);
    this.save();
    return dep;
  }

  getAllDeposits() {
    return this.data.deposits;
  }

  // --- Referrals ---
  rewardReferral(refereeId, purchaseAmount) {
    const user = this.getUser(refereeId);
    if (!user || !user.referredBy) return null;

    const commission = parseFloat(((purchaseAmount * config.referralCommissionPercent) / 100).toFixed(2));
    if (commission <= 0) return null;

    // Credit commission to referrer
    this.updateBalance(user.referredBy, commission);

    // Update referral record
    const refRecord = this.data.referrals.find(r => r.referrerId === user.referredBy && r.refereeId === String(refereeId));
    if (refRecord) {
      refRecord.totalCommission = parseFloat(((refRecord.totalCommission || 0) + commission).toFixed(2));
    }
    this.save();

    return {
      referrerId: user.referredBy,
      commission
    };
  }

  getReferralStats(telegramId) {
    const id = String(telegramId);
    const referredUsers = this.data.referrals.filter(r => r.referrerId === id);
    const totalCommission = referredUsers.reduce((sum, r) => sum + (r.totalCommission || 0), 0);
    return {
      totalInvited: referredUsers.length,
      totalCommission: parseFloat(totalCommission.toFixed(2)),
      commissionPercent: config.referralCommissionPercent,
      referralLink: `https://t.me/${config.botUsername || 'YourBot'}?start=ref_${id}`
    };
  }

  // --- Dashboard Metrics ---
  getDashboardMetrics() {
    const totalUsers = Object.keys(this.data.users).length;
    const totalOrders = this.data.orders.length;
    const totalRevenue = this.data.orders.reduce((sum, o) => sum + (o.price || 0), 0);
    const availableStockCount = this.data.stock.filter(s => !s.isSold).length;

    return {
      totalUsers,
      totalOrders,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      availableStockCount,
      lowStockProducts: this.getProducts().filter(p => p.stockCount === 0)
    };
  }
}

export const db = new Database();

