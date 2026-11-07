import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function OrdersList({ orders }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-100">ប្រវត្តិការបញ្ជាទិញ (Orders History)</h2>
        <p className="text-xs text-slate-400">បញ្ជីរាល់ការទិញទំនិញទាំងអស់របស់អតិថិជនតាម Telegram Bot</p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">លេខ Order</th>
                <th className="p-4">ឈ្មោះទំនិញ</th>
                <th className="p-4">Telegram ID</th>
                <th className="p-4">តម្លៃទូទាត់</th>
                <th className="p-4">ព័ត៌មានដែលបាន Deliver</th>
                <th className="p-4">កាលបរិច្ឆេទ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    <ShoppingCart className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    មិនទាន់មានការបញ្ជាទិញនៅឡើយទេ
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-300">{ord.id}</td>
                    <td className="p-4 font-bold text-slate-100">{ord.productName}</td>
                    <td className="p-4 font-mono text-blue-400">{ord.telegramId}</td>
                    <td className="p-4 font-bold text-emerald-400">${Number(ord.price).toFixed(2)}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {ord.content}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(ord.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

