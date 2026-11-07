import React, { useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Cpu,
  HardDrive,
  ExternalLink,
  Film,
  Music,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export default function DownloaderManager({ downloadsData, systemStatus, onRefresh, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');

  const stats = downloadsData?.stats || { totalDownloads: 0, totalSizeMB: 0, platforms: {} };
  const recent = downloadsData?.recent || [];

  const platformList = Object.entries(stats.platforms || {}).sort((a, b) => b[1] - a[1]);
  const totalDownloads = stats.totalDownloads || 0;

  // Filtered downloads
  const filteredDownloads = recent.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      (item.title && item.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.firstName && item.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.username && item.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.telegramId && String(item.telegramId).includes(searchTerm));

    const matchesPlatform =
      selectedPlatform === 'ALL' ||
      (item.platform && item.platform.toLowerCase().includes(selectedPlatform.toLowerCase()));

    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <DownloadCloud className="w-5 h-5 text-emerald-400" />
            <span>All-in-One Media Downloader</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time analytics and monitoring for video & audio downloads from TikTok, YouTube, Facebook, Instagram, Twitter/X and 1000+ sites
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all border border-slate-700 shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Engine & System Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* yt-dlp Status */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Downloader Core (yt-dlp)</span>
            {systemStatus?.available ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-3 h-3" />
                Missing
              </span>
            )}
          </div>
          <p className="text-sm font-black text-slate-200">
            v{systemStatus?.ytDlpVersion || 'Unknown'}
          </p>
          <p className="text-[11px] font-mono text-slate-500 truncate mt-1">
            {systemStatus?.executablePath || 'yt-dlp'}
          </p>
        </div>

        {/* FFmpeg Status */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Media Converter (FFmpeg)</span>
            {systemStatus?.ffmpegAvailable ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertCircle className="w-3 h-3" />
                Unavailable
              </span>
            )}
          </div>
          <p className="text-sm font-black text-slate-200 truncate">
            {systemStatus?.ffmpegVersion || 'Not found'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Audio conversion & Video muxing
          </p>
        </div>

        {/* Memory & Host Info */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">System Resources & RAM</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Cpu className="w-3 h-3" />
              Node {systemStatus?.nodeVersion || process.version}
            </span>
          </div>
          <p className="text-sm font-black text-slate-200">
            {systemStatus?.memoryUsageMB || 0} MB <span className="text-xs text-slate-400 font-normal">RAM Usage</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1 capitalize">
            Platform: {systemStatus?.platform || 'windows'} • Uptime: {Math.floor((systemStatus?.uptimeSeconds || 0) / 60)} mins
          </p>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/5 border border-teal-500/20 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Total Media Downloaded</span>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-teal-400">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100">{totalDownloads}</p>
          <p className="text-[11px] text-teal-400 mt-1 font-medium">All Videos and MP3s</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/5 border border-indigo-500/20 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Total Bandwidth Processed</span>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100">
            {stats.totalSizeMB > 1024
              ? `${(stats.totalSizeMB / 1024).toFixed(2)} GB`
              : `${stats.totalSizeMB || 0} MB`}
          </p>
          <p className="text-[11px] text-indigo-400 mt-1 font-medium">Data streamed via Bot</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/20 shadow-lg sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">Media Breakdown</span>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-amber-400">
              <Music className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <span className="text-xs text-slate-400">Video MP4</span>
              <p className="text-lg font-black text-slate-200">
                {recent.filter((r) => r.type === 'video').length}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-xs text-slate-400">Audio MP3</span>
              <p className="text-lg font-black text-slate-200">
                {recent.filter((r) => r.type === 'audio').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {platformList.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Platform Popularity Breakdown
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {platformList.map(([platformName, count]) => {
              const percent = totalDownloads > 0 ? Math.round((count / totalDownloads) * 100) : 0;
              return (
                <div key={platformName} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200 mb-1.5">
                    <span>{platformName}</span>
                    <span className="text-slate-400">{count} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Downloads Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or customer name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="twitter">Twitter / X</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Platform</th>
                <th className="p-4">Format</th>
                <th className="p-4">Title</th>
                <th className="p-4">Size</th>
                <th className="p-4 text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDownloads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500">
                    No download logs found yet.
                  </td>
                </tr>
              ) : (
                filteredDownloads.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-200">{item.firstName || 'User'}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.username ? `@${item.username}` : `ID: ${item.telegramId || '-'}`}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {item.platform || 'Web'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {item.type === 'audio' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                          <Music className="w-3 h-3" /> MP3
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <Film className="w-3 h-3" /> Video
                        </span>
                      )}
                    </td>
                    <td className="p-4 max-w-xs truncate font-medium text-slate-300" title={item.title}>
                      {item.title || 'Untitled'}
                    </td>
                    <td className="p-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {item.sizeBytes
                        ? `${(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                        : '-'}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Open original link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
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
