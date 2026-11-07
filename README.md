# 🛍️ Telegram Digital Store & All-in-One Media Downloader Bot

A high-performance **Telegram Store & Media Downloader Bot** built with Node.js, Telegraf, and React 18 with Tailwind CSS. Features automated payments via **Bakong KHQR**, instant digital delivery, referral affiliate commissions, Voice AI (TTS/STT), and an **All-in-One Video/Audio Downloader (1000+ sites)** powered by `yt-dlp` and `ffmpeg`.

---

## 🌟 Key Features

1. **🛍️ Digital Store & Instant Auto-Delivery**:
   - Organized by product categories (Premium Accounts, Software License Keys, AI Tools...).
   - When a customer purchases an item, the bot immediately delivers the account credentials (`user:pass`) or license key into the Telegram chat in under 1 second.
2. **💳 Wallet & Bakong KHQR (Automated Payments)**:
   - Dynamic KHQR code generation for any custom top-up amount.
   - Compatible with all banking apps (Bakong, ABA, ACLEDA, Wing, Canadia, etc.).
   - Instant balance crediting upon payment confirmation.
3. **📥 All-in-One Video & MP3 Downloader**:
   - Supports **1000+ social media platforms**: **TikTok (No Watermark), YouTube & Shorts, Facebook Reels & Watch, Instagram Reels & Posts, Twitter/X, Threads, Reddit, Pinterest, Douyin...**
   - **Auto-URL Detection**: Simply copy and paste any video link into the chat—the bot automatically downloads and sends the video file (MP4)!
   - **One-Click MP3 Conversion**: Every video comes with an inline `🎵 Download Audio (MP3)` button for instant audio extraction.
   - Commands: `/dl <url>` for video, `/mp3 <url>` for audio.
4. **👥 Referral Affiliate Program**:
   - Personalized referral link for every user (`https://t.me/YourBot?start=ref_USERID`).
   - Earns 10% commission on every purchase made by invited friends.
5. **🎤 Voice AI (TTS & STT)**:
   - `/tts <text>`: Converts text into spoken voice audio.
   - Voice note transcription: Send a voice note into the chat and the bot automatically transcribes it to text.
6. **📢 Admin Broadcast System**:
   - Send announcements and promotional discounts to all active bot members with rate-limiting to prevent Telegram API flood limits.
7. **👑 React 18 Admin Dashboard**:
   - **Overview**: Real-time revenue, total orders, customers count, inventory levels, and total media downloads.
   - **Products Catalog**: Add, edit, or delete items and prices.
   - **Bulk Stock Upload**: Paste 50 to 100 accounts/keys at once (1 item per line).
   - **Media Downloader Manager**: Monitor `yt-dlp` and `ffmpeg` engine health, RAM usage, platform popularity breakdown, and recent downloads log with search & filters.
   - **Customer Directory & Order History**: Complete customer spending and purchase logs.

---

## 📁 Project Structure

```
store-bot/
├── backend/
│   ├── src/
│   │   ├── bot.js                  # Telegram Bot Commands & Shop Logic
│   │   ├── db.js                   # JSON Relational Database Engine
│   │   ├── server.js               # Express API & Static Dashboard Server
│   │   ├── config.js               # Environment Settings
│   │   ├── services/
│   │   │   ├── paymentService.js   # Bakong KHQR Generator & Verification
│   │   │   ├── voiceService.js     # Voice TTS & STT
│   │   │   └── videoDownloaderService.js # yt-dlp Video & Audio Downloader
│   │   └── index.js                # Application Bootstrap
│   ├── data/                       # Database Storage (store_database.json)
│   ├── temp_downloads/             # Auto-cleaned temporary media cache
│   ├── .env                        # Private Configuration (Token, Admin ID)
│   └── package.json
├── admin-dashboard/                # React 18 + Vite + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/             # DownloaderManager, ProductManager, Stock, etc.
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── dist/                       # Compiled Production Bundle
│   └── package.json
├── render.yaml                     # 1-Click Free Hosting Auto-Deploy configuration
├── README.md                       # English Documentation
└── README_KH.md                    # Khmer Documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **yt-dlp** and **ffmpeg** (for video downloading & audio conversion)

### 2. Configuration (`backend/.env`)
Create or edit `backend/.env`:
```env
# Telegram Bot Token from @BotFather
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Your Telegram User ID (get it from @userinfobot)
ADMIN_TELEGRAM_ID=your_telegram_id

# Web Admin Dashboard Secret Key
ADMIN_SECRET_KEY=admin123456

# Port
PORT=4000

# Bakong KHQR Settings
BAKONG_ACCOUNT_ID=merchant@acleda
BAKONG_MERCHANT_NAME=KHMER DIGITAL STORE
BAKONG_CITY=Phnom Penh

# Referral Commission Percentage
REFERRAL_COMMISSION_PERCENT=10

# Optional: Custom path to yt-dlp binary if not in system PATH
# YTDLP_PATH=C:\ffmpeg\bin\yt-dlp.exe
```

### 3. Run the Bot & Server
```powershell
cd backend
npm start
```
The server will start on `http://localhost:4000` serving both the Web API and the React Admin Dashboard.

### 4. Access Admin Dashboard
Open `http://localhost:4000` in your browser and enter your `ADMIN_SECRET_KEY` (default: `admin123456`).

---

## 📱 Bot Commands

| Command | Description |
|---|---|
| `/start` | Open the main menu & account profile |
| `/help` | Display command guide and instructions |
| `/dl <url>` | Download video from TikTok, YouTube, FB, IG, X, Reddit... |
| `/mp3 <url>` | Extract and download audio only as MP3 |
| `/tts <text>` | Generate voice audio from text |
| `/broadcast <msg>` | (Admin only) Broadcast message to all users |
| `/addstock <id> <data>` | (Admin only) Add stock item |

