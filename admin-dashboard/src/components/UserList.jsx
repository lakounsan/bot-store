import React from 'react';
import { Users } from 'lucide-react';

export default function UserList({ users }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-100">បញ្ជីអតិថិជន (Customers List)</h2>
        <p className="text-xs text-slate-400">អតិថិជនទាំងអស់ដែលបានចុច Start ឬទិញទំនិញលើ Bot</p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Telegram ID</th>
                <th className="p-4">ឈ្មោះ</th>
                <th className="p-4">Username</th>
                <th className="p-4">សមតុល្យ (Balance)</th>
                <th className="p-4">ចំណាយសរុប</th>
                <th className="p-4">អ្នកណែនាំ (Referrer)</th>
                <th className="p-4">កាលបរិច្ឆេទចូលរួម</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.telegramId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-400">{u.telegramId}</td>
                  <td className="p-4 font-bold text-slate-200">{u.firstName}</td>
                  <td className="p-4 text-slate-400">
                    {u.username ? `@${u.username}` : <span className="text-slate-600">-</span>}
                  </td>
                  <td className="p-4 font-bold text-emerald-400">${Number(u.balance || 0).toFixed(2)}</td>
                  <td className="p-4 font-bold text-slate-300">${Number(u.totalSpent || 0).toFixed(2)}</td>
                  <td className="p-4 font-mono text-[11px] text-slate-500">
                    {u.referredBy ? u.referredBy : 'Direct'}
                  </td>
                  <td className="p-4 text-slate-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

