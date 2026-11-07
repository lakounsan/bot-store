import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = config.tempDownloadDir || path.resolve(__dirname, '../../temp_downloads');

// Ensure temporary download directory exists
if (!fs.existsSync(tempDir)) {
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (err) {
    console.error('Could not create tempDownloadDir:', err.message);
  }
}

/**
 * Locate yt-dlp executable
 */
export function getExecutablePath() {
  if (config.ytdlpPath && fs.existsSync(config.ytdlpPath)) {
    return config.ytdlpPath;
  }

  const commonLocations = [
    'yt-dlp',
    'C:\\ffmpeg\\bin\\yt-dlp.exe',
    'C:\\Program Files\\yt-dlp\\yt-dlp.exe',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp'
  ];

  for (const loc of commonLocations) {
    if (loc === 'yt-dlp') {
      try {
        execSync('yt-dlp --version', { stdio: 'ignore' });
        return 'yt-dlp';
      } catch {}
    } else if (fs.existsSync(loc)) {
      return loc;
    }
  }

  return 'yt-dlp';
}

/**
 * Extract HTTP/HTTPS URL from any text message
 */
export function extractUrl(text = '') {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s<>"')]+/i);
  return match ? match[0] : null;
}

/**
 * Format duration in seconds to mm:ss or hh:mm:ss
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Friendly badge for detected platforms
 */
export function getPlatformBadge(extractor = '') {
  const ext = String(extractor).toLowerCase();
  if (ext.includes('tiktok')) return '🎵 TikTok';
  if (ext.includes('youtube')) return '▶️ YouTube';
  if (ext.includes('facebook')) return '📘 Facebook';
  if (ext.includes('instagram')) return '📸 Instagram';
  if (ext.includes('twitter') || ext.includes('x')) return '🐦 Twitter / X';
  if (ext.includes('reddit')) return '🤖 Reddit';
  if (ext.includes('pinterest')) return '📌 Pinterest';
  if (ext.includes('threads')) return '🧵 Threads';
  if (ext.includes('douyin')) return '🎵 Douyin';
  if (ext.includes('kuaishou')) return '⚡ Kuaishou';
  if (ext.includes('vimeo')) return '🎬 Vimeo';
  if (ext.includes('twitch')) return '🟣 Twitch';
  if (ext.includes('bilibili')) return '📺 Bilibili';
  return '🌐 Web Video';
}

/**
 * Periodically purge stale temporary files older than maxAgeMinutes
 */
export function cleanOldTempFiles(maxAgeMinutes = 30) {
  try {
    if (!fs.existsSync(tempDir)) return;
    const now = Date.now();
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMinutes * 60 * 1000) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
  } catch (err) {
    console.error('Error cleaning temp files:', err.message);
  }
}

// Run cleanup on startup and every 30 minutes
cleanOldTempFiles();
setInterval(() => cleanOldTempFiles(), 30 * 60 * 1000);

/**
 * Download video from URL (TikTok, YouTube, Facebook, Instagram, Twitter, etc.)
 */
export function downloadVideo(url) {
  return new Promise((resolve, reject) => {
    const ytDlp = getExecutablePath();
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const outputPattern = path.join(tempDir, `vid_${fileId}.%(ext)s`);

    let rawTitle = 'Video';
    let durationSec = 0;
    let uploader = 'Unknown';
    let extractorKey = 'Web';

    const args = [
      '--no-playlist',
      '--no-warnings',
      '--print', 'METADATA:%(title)s|||%(duration)s|||%(uploader)s|||%(extractor_key)s',
      '--merge-output-format', 'mp4',
      '--remux-video', 'mp4',
      '-S', 'res:720,ext:mp4:m4a,vcodec:h264',
      '-f', 'bv*[filesize<=45M]+ba/b[filesize<=48M]/bv*+ba/best',
      '--max-filesize', `${config.maxVideoSizeMB}M`,
      '-o', outputPattern,
      url
    ];

    const proc = spawn(ytDlp, args, { windowsHide: true });
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('METADATA:')) {
          const parts = line.replace('METADATA:', '').trim().split('|||');
          if (parts[0]) rawTitle = parts[0];
          if (parts[1] && !isNaN(parts[1])) durationSec = parseFloat(parts[1]);
          if (parts[2]) uploader = parts[2];
          if (parts[3]) extractorKey = parts[3];
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // 2-minute safety timeout
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ទាញយកវីដេអូហួសពេលកំណត់ (Download timed out after 2 minutes)'));
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timeout);

      // Find the created file
      try {
        const files = fs.readdirSync(tempDir);
        const matchedFile = files.find((f) => f.startsWith(`vid_${fileId}`));

        if (!matchedFile) {
          if (stderr.includes('File is larger than max-filesize')) {
            return reject(new Error('ទំហំវីដេអូធំជាង 50MB (លើសពីកម្រិតកំណត់ Telegram)'));
          }
          return reject(new Error(stderr.trim() || `ទាញយកវីដេអូបរាជ័យ (Exit code ${code})`));
        }

        const filePath = path.join(tempDir, matchedFile);
        const stats = fs.statSync(filePath);

        resolve({
          filePath,
          title: rawTitle,
          duration: durationSec,
          durationFormatted: formatDuration(durationSec),
          uploader,
          extractor: extractorKey,
          platform: getPlatformBadge(extractorKey),
          sizeBytes: stats.size,
          cleanup: () => {
            try {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch {}
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`មិនអាចដំណើរការ yt-dlp បានទេ៖ ${err.message}`));
    });
  });
}

/**
 * Download audio only (MP3) from URL
 */
export function downloadAudio(url) {
  return new Promise((resolve, reject) => {
    const ytDlp = getExecutablePath();
    const fileId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const outputPattern = path.join(tempDir, `aud_${fileId}.%(ext)s`);

    let rawTitle = 'Audio';
    let durationSec = 0;
    let uploader = 'Unknown';
    let extractorKey = 'Web';

    const args = [
      '--no-playlist',
      '--no-warnings',
      '--print', 'METADATA:%(title)s|||%(duration)s|||%(uploader)s|||%(extractor_key)s',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--max-filesize', '49M',
      '-o', outputPattern,
      url
    ];

    const proc = spawn(ytDlp, args, { windowsHide: true });
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('METADATA:')) {
          const parts = line.replace('METADATA:', '').trim().split('|||');
          if (parts[0]) rawTitle = parts[0];
          if (parts[1] && !isNaN(parts[1])) durationSec = parseFloat(parts[1]);
          if (parts[2]) uploader = parts[2];
          if (parts[3]) extractorKey = parts[3];
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('ទាញយកសំឡេងហួសពេលកំណត់ (Download timed out)'));
    }, 120000);

    proc.on('close', (code) => {
      clearTimeout(timeout);

      try {
        const files = fs.readdirSync(tempDir);
        const matchedFile = files.find((f) => f.startsWith(`aud_${fileId}`));

        if (!matchedFile) {
          return reject(new Error(stderr.trim() || `ទាញយកសំឡេងបរាជ័យ (Exit code ${code})`));
        }

        const filePath = path.join(tempDir, matchedFile);
        const stats = fs.statSync(filePath);

        resolve({
          filePath,
          title: rawTitle,
          duration: durationSec,
          durationFormatted: formatDuration(durationSec),
          artist: uploader,
          extractor: extractorKey,
          platform: getPlatformBadge(extractorKey),
          sizeBytes: stats.size,
          cleanup: () => {
            try {
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch {}
          }
        });
      } catch (err) {
        reject(err);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`មិនអាចដំណើរការ yt-dlp បានទេ៖ ${err.message}`));
    });
  });
}

