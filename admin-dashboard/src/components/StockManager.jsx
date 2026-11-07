import React, { useState } from 'react';
import { Layers, PlusCircle, CheckCircle, Package } from 'lucide-react';

export default function StockManager({ products, onBulkAddStock, stockItems }) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [lines, setLines] = useState('');
  const [successCount, setSuccessCount] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !lines.trim()) return;

    const count = await onBulkAddStock(selectedProductId, lines);
    setSuccessCount(count);
    setLines('');
    setTimeout(() => setSuccessCount(null), 4000);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentProductStock = stockItems.filter(
    (s) => s.productId === selectedProductId && !s.isSold
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100">គ្រប់គ្រងស្តុក (Stock & Inventory)</h2>
        <p className="text-xs text-slate-400">
          បន្ថែម Account (User:Pass) ឬ License Keys ទៅក្នុងស្តុកដោយស្វ័យប្រវត្តិ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Add Form */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">បញ្ចូលស្តុកថ្មី (Bulk Restock)</h3>
          </div>

          <form onSubmit={handleAdd} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">ជ្រើសរើសផលិតផល</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name} (បច្ចុប្បន្ននៅសល់: {p.stockCount})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">
                  បញ្ជី Accounts ឬ Keys (១ បន្ទាត់ = ១ ទំនិញ)
                </label>
                <span className="text-[11px] text-slate-500">
                  {lines.split('\n').filter((l) => l.trim()).length} Items ត្រៀមបញ្ចូល
                </span>
              </div>
              <textarea
                rows="7"
                required
                placeholder="email1@mail.com:pass123&#10;email2@mail.com:pass456&#10;XXXXX-XXXXX-XXXXX-XXXXX"
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {successCount !== null && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>បានបញ្ចូលចំនួន {successCount} Items ទៅក្នុងស្តុកជោគជ័យ!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!lines.trim()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.99]"
            >
              បញ្ចូលទៅក្នុងស្តុកឥឡូវនេះ
            </button>
          </form>
        </div>

        {/* Current Available Stock for Selected Product */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  ស្តុកដែលមានស្រាប់ ({selectedProduct?.name})
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold">
                {currentProductStock.length} Items Available
              </span>
            </div>

            {currentProductStock.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>គ្មានទំនិញក្នុងស្តុកនៅឡើយទេ។ សូមធ្វើការបញ្ចូលតាម Form ខាងឆ្វេង!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {currentProductStock.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 truncate"
                  >
                    <span className="text-slate-500 mr-2">#{idx + 1}</span>
                    {s.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

