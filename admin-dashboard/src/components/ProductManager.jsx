import React, { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';

export default function ProductManager({ products, categories, onAddProduct, onDeleteProduct }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    categoryId: categories[0]?.id || 'cat_accounts',
    price: '',
    description: '',
    icon: '📦'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return;
    onAddProduct(form);
    setForm({ name: '', categoryId: categories[0]?.id || 'cat_accounts', price: '', description: '', icon: '📦' });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">គ្រប់គ្រងផលិតផល (Products Management)</h2>
          <p className="text-xs text-slate-400">បន្ថែម ឬលុបផលិតផល និងកំណត់តម្លៃលក់</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>បន្ថែមផលិតផលថ្មី</span>
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">រូបតំណាង</th>
                <th className="p-4">ឈ្មោះផលិតផល</th>
                <th className="p-4">ប្រភេទ</th>
                <th className="p-4">តម្លៃ ($ USD)</th>
                <th className="p-4">ស្តុកនៅសល់</th>
                <th className="p-4 text-right">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((p) => {
                const cat = categories.find((c) => c.id === p.categoryId);
                const hasStock = p.stockCount > 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-xl">{p.icon}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-100">{p.name}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{p.description}</p>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{cat?.name || p.categoryId}</td>
                    <td className="p-4 font-bold text-emerald-400">${Number(p.price).toFixed(2)}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          hasStock
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {hasStock ? `${p.stockCount} Available` : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 mb-4">បន្ថែមផលិតផលថ្មី</h3>
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">ឈ្មោះផលិតផល</label>
                <input
                  type="text"
                  required
                  placeholder="ឧ. Netflix Premium 4K"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">ប្រភេទ (Category)</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">តម្លៃ ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="3.50"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">រូប Icon (Emoji)</label>
                <input
                  type="text"
                  placeholder="🎬, 💻, 🤖, 🍿"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">ការពិពណ៌នា</label>
                <textarea
                  rows="3"
                  placeholder="ព័ត៌មានបន្ថែមអំពីផលិតផល..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  រក្សាទុក
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

