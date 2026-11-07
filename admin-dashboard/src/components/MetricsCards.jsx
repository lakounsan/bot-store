import React from 'react';
import { DollarSign, ShoppingCart, Users, PackageCheck, AlertTriangle } from 'lucide-react';

export default function MetricsCards({ metrics }) {
  if (!metrics) return null;

  const cards = [
    {
      title: 'ចំណូលសរុប (Total Revenue)',
      value: `$${Number(metrics.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      title: 'ការបញ្ជាទិញ (Total Orders)',
      value: metrics.totalOrders || 0,
      icon: ShoppingCart,
      color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400'
    },
    {
      title: 'អតិថិជនសរុប (Total Users)',
      value: metrics.totalUsers || 0,
      icon: Users,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400'
    },
    {
      title: 'ស្តុកនៅសល់ (In-Stock Items)',
      value: metrics.availableStockCount || 0,
      icon: PackageCheck,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-2xl bg-gradient-to-br ${c.color} border shadow-lg backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400">{c.title}</span>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-100">{c.value}</p>
            </div>
          );
        })}
      </div>

      {metrics.lowStockProducts && metrics.lowStockProducts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              មានផលិតផលចំនួន <strong className="font-bold underline">{metrics.lowStockProducts.length}</strong> បានអស់ពីស្តុក (Out of Stock)!
            </span>
          </div>
          <span className="text-[11px] text-rose-400 font-semibold">សូមចូលទៅកាន់ Stock ដើម្បីបន្ថែម Accounts/Keys ថ្មី</span>
        </div>
      )}
    </div>
  );
}

