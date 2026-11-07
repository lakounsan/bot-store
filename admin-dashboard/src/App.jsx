import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MetricsCards from './components/MetricsCards';
import ProductManager from './components/ProductManager';
import StockManager from './components/StockManager';
import OrdersList from './components/OrdersList';
import UserList from './components/UserList';
import BroadcastModal from './components/BroadcastModal';
import DownloaderManager from './components/DownloaderManager';
import { Lock, RefreshCw, ShieldCheck } from 'lucide-react';

export default function App() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('storebot_admin_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('metrics');
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [downloadsData, setDownloadsData] = useState({ stats: { totalDownloads: 0, totalSizeMB: 0, platforms: {} }, recent: [] });
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    if (adminKey) {
      verifyKey(adminKey);
    }
  }, [adminKey]);

  const verifyKey = async (key) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('storebot_admin_key', key);
        fetchAllData(key);
      } else {
        setIsAuthenticated(false);
        setAuthError('Invalid Admin Secret Key');
      }
    } catch {
      setIsAuthenticated(false);
      setAuthError('Could not connect to server');
    }
  };

  const fetchAllData = async (key = adminKey) => {
    setIsLoading(true);
    const headers = { 'x-admin-key': key };

    try {
      const [mRes, pRes, cRes, sRes, oRes, uRes, dRes, sysRes] = await Promise.all([
        fetch('/api/dashboard/metrics', { headers }),
        fetch('/api/products', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/stock', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/downloads', { headers }),
        fetch('/api/system/status', { headers })
      ]);

      if (mRes.ok) setMetrics(await mRes.json());
      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      if (sRes.ok) setStockItems(await sRes.json());
      if (oRes.ok) setOrders(await oRes.json());
      if (uRes.ok) setUsers(await uRes.json());
      if (dRes && dRes.ok) setDownloadsData(await dRes.json());
      if (sysRes && sysRes.ok) setSystemStatus(await sysRes.json());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAuthError('');
    setAdminKey(keyInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('storebot_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
  };

  const handleAddProduct = async (productData) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('តើអ្នកពិតជាចង់លុបផលិតផលនេះមែនទេ?')) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkAddStock = async (productId, lines) => {
    try {
      const res = await fetch('/api/stock/bulk-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ productId, lines })
      });
      const data = await res.json();
      if (res.ok) {
        fetchAllData();
        return data.addedCount || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  const handleSendBroadcast = async (message) => {
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      return data;
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3">
              <ShieldCheck className="w-7 h-7 text-slate-950 stroke-[2.5]" />
            </div>
            <h1 className="text-xl font-black text-slate-100">StoreBot Admin</h1>
            <p className="text-xs text-slate-400 mt-1">Enter your Admin Secret Key to access control panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter Secret Key (default: admin123456)"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              </div>
              {authError && <p className="text-[11px] text-rose-400 mt-2 font-medium">{authError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all"
            >
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <header className="h-16 bg-slate-900/60 border-b border-slate-800 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-300">Live Store Connected</span>
          </div>

          <button
            onClick={() => fetchAllData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </header>

        <div className="p-8 max-w-6xl w-full">
          {activeTab === 'metrics' && <MetricsCards metrics={metrics} />}
          {activeTab === 'products' && (
            <ProductManager
              products={products}
              categories={categories}
              onAddProduct={handleAddProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}
          {activeTab === 'stock' && (
            <StockManager
              products={products}
              onBulkAddStock={handleBulkAddStock}
              stockItems={stockItems}
            />
          )}
          {activeTab === 'orders' && <OrdersList orders={orders} />}
          {activeTab === 'users' && <UserList users={users} />}
          {activeTab === 'downloader' && (
            <DownloaderManager
              downloadsData={downloadsData}
              systemStatus={systemStatus}
              onRefresh={() => fetchAllData()}
              isLoading={isLoading}
            />
          )}
          {activeTab === 'broadcast' && (
            <BroadcastModal
              onSendBroadcast={handleSendBroadcast}
              userCount={users.length}
            />
          )}
        </div>
      </main>
    </div>
  );
}

