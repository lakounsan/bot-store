# 🛍️ Telegram Digital Store Bot (ប្រព័ន្ធលក់អាខោន & កម្មវិធីស្វ័យប្រវត្តិ)

ប្រព័ន្ធ **Telegram Bot លក់អាខោន កម្មវិធី និងទំនិញឌីជីថល** ភ្ជាប់ជាមួយប្រព័ន្ធបង់ប្រាក់ស្វ័យប្រវត្តិ **Bakong KHQR**, ប្រព័ន្ធកាបូបលុយ (Wallet), ប្រព័ន្ធណែនាំមិត្តភក្តិ (Referral Affiliate), ប្រព័ន្ធ Voice AI (TTS & STT), និង **Admin Dashboard (React + Tailwind CSS)** សម្រាប់គ្រប់គ្រងស្តុក និងរបាយការណ៍។

---

## 🌟 មុខងារសំខាន់ៗរបស់ប្រព័ន្ធ (Key Features)

1. **🛍️ ហាងទំនិញ & Auto Delivery (Instant Stock)**:
   - បែងចែកតាម Categories (អាខោន Premium, License Keys, Software...)
   - ពេលអតិថិជនចុចទិញ ប្រព័ន្ធកាត់លុយ និង **ផ្ញើ Account (User:Pass) ឬ License Key ចូលក្នុង Telegram Chat ភ្លាមៗ (១ វិនាទី)**
2. **💳 ប្រព័ន្ធកាបូបលុយ & Bakong KHQR (Auto Payment)**:
   - បង្កើតរូបភាពកូដ KHQR ស្វ័យប្រវត្តិតាមចំនួនទឹកប្រាក់ដែលអតិថិជនចង់បញ្ចូល
   - គាំទ្រការស្កេនពីគ្រប់ធនាគារ (Bakong, ABA, ACLEDA, Wing, Canadia...)
   - បញ្ចូលលុយស្វ័យប្រវត្តិចូល Wallet របស់អតិថិជន
3. **👥 Referral Affiliate Program (ណែនាំមិត្តភក្តិ)**:
   - សមាជិកម្នាក់ៗមាន Link ផ្ទាល់ខ្លួន (`https://t.me/Bot?start=ref_USERID`)
   - ទទួលបានកម្រៃជើងសារ (Commission 10%) រាល់ពេលដែលមិត្តភក្តិទិញទំនិញ
4. **📢 Broadcast System (ផ្ញើសារដំណឹងម្តងទាំងអស់)**:
   - Admin អាចសរសេរសារផ្សព្វផ្សាយដំណឹងប្រូម៉ូសិន ផ្ញើទៅកាន់សមាជិកទាំងអស់ក្នុង Bot ដោយមាន Rate Limiting ការពារ Telegram Block
5. **👑 React Admin Dashboard**:
   - មើលរបាយការណ៍ចំណូល ($), ចំនួន Orders, អតិថិជនសរុប
   - បន្ថែម/លុប ផលិតផល និងកំណត់តម្លៃ
   - **Bulk Stock Upload**: Paste អាខោន 50 ឬ 100 ក្នុងពេលតែមួយ (១ បន្ទាត់ = ១ អាខោន)
   - ឆែកមើលបញ្ជីអតិថិជន និងប្រវត្តិការទិញ
6. **🚨 Instant Admin Alerts**:
   - ពេលមានអ្នកចុះឈ្មោះថ្មី, បញ្ចូលលុយ, ឬទិញទំនិញ Bot នឹងផ្ញើសារដំណឹង (Alert) ទៅកាន់ Telegram Admin ឬ Private Channel ភ្លាមៗ
7. **🎤 Voice AI (TTS & STT)**:
   - `/tts <អត្ថបទ>` : បង្កើតសំឡេងនិយាយជាភាសាខ្មែរ (Text-to-Speech)
   - ផ្ញើ Voice Message ទៅកាន់ Bot នោះ Bot នឹងបម្លែងជាអក្សរជូនភ្លាមៗ (Speech-to-Text)
8. **📥 All-in-One Video Downloader (ទាញយកវីដេអូគ្រប់វេបសាយ)**:
   - គាំទ្រការទាញយកវីដេអូ និង MP3 ពីបណ្តាញសង្គមធំៗទាំងអស់៖ **TikTok (គ្មាន Watermark), YouTube & Shorts, Facebook, Instagram Reels, Twitter/X, Threads, Reddit, Pinterest... និងវេបសាយជាង 1000+**
   - គ្រាន់តែ Copy Link វីដេអូរួច Paste ចូលក្នុង Bot នោះ Bot នឹងទាញយកវីដេអូ MP4 ជូនភ្លាមៗ
   - ពាក្យបញ្ជាបន្ថែម៖ `/dl <link>` (ទាញយកវីដេអូ), `/mp3 <link>` (ទាញយកតែសំឡេង MP3)
   - មានប៊ូតុងចុចបម្លែងជា MP3 ភ្លាមៗក្រោមវីដេអូនីមួយៗ

---

## 📁 រចនាសម្ព័ន្ធ Folder (Project Structure)

```
store-bot/
├── backend/
│   ├── src/
│   │   ├── bot.js                  # Telegram Bot Commands & Shop Logic
│   │   ├── db.js                   # Database Engine (JSON Relational)
│   │   ├── server.js               # Express API & Admin Dashboard Server
│   │   ├── config.js               # Environment Settings
│   │   ├── services/
│   │   │   ├── paymentService.js   # Bakong KHQR QR Code Generator
│   │   │   ├── voiceService.js     # Voice TTS & STT
│   │   │   └── videoDownloaderService.js # Video & MP3 Downloader (yt-dlp)
│   │   └── index.js                # Server Bootstrap
│   ├── data/                       # Database Storage (Users, Stock, Orders)
│   ├── temp_downloads/             # Auto-cleaned temporary media cache
│   ├── .env                        # Private Configuration (Token, Admin ID)
│   └── package.json
├── admin-dashboard/                # React 18 + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── components/             # Metrics, Stock, Products, Broadcast
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── dist/                       # Compiled Dashboard Assets
│   └── package.json
├── render.yaml                     # 1-Click Free Hosting Auto-Deploy
└── README_KH.md
```

---

## 🚀 របៀបដំឡើង និងដំណើរការលើកុំព្យូទ័រ (Local Setup)

### ជំហានទី ១៖ យក Bot Token និង Admin Telegram ID
1. **យក Bot Token**:
   - បើក Telegram ស្វែងរក `@BotFather` -> វាយ `/newbot`
   - កំណត់ឈ្មោះ និង Username រួចចម្លង **Bot Token**
2. **យក Telegram ID របស់អ្នក (Admin ID)**:
   - បើក Telegram ស្វែងរក `@userinfobot`
   - ចុច Start វានឹងបង្ហាញ **Id: 123456789** (ចម្លងលេខសម្គាល់នេះ)

### ជំហានទី ២៖ កំណត់ក្នុងឯកសារ `.env`
បើកឯកសារ `store-bot/backend/.env` ហើយបំពេញ៖
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
ADMIN_TELEGRAM_ID=123456789
ADMIN_SECRET_KEY=admin123456
BAKONG_ACCOUNT_ID=your_merchant_account@acleda
BAKONG_MERCHANT_NAME=KHMER DIGITAL STORE
PORT=4000
```

### ជំហានទី ៣៖ ដំណើរការដោយចុច ១ Click
- ចុចពីរដង (Double-click) លើ File **`start-store.bat`**
- ប្រព័ន្ធនឹងបើក Web Admin Dashboard លើ `http://localhost:4000`
- Telegram Bot របស់អ្នកនឹងចាប់ផ្តើមដំណើរការទទួល Orders 24/7!

---

## 🌐 របៀប Hosting Free មិនអស់លុយ + GitHub Auto-Deploy (Render.com)

### ជំហានទី ១៖ បង្កើត GitHub Repository និង Push កូដ
1. បង្កើត Account លើ [github.com](https://github.com) រួចបង្កើត Repository ថ្មីមួយ (ឧ. `my-store-bot`)
2. បើក Terminal ក្នុង Folder Project ហើយវាយ៖
   ```bash
   git init
   git add .
   git commit -m "feat: digital store bot"
   git branch -M main
   git remote add origin https://github.com/USERNAME/my-store-bot.git
   git push -u origin main
   ```

### ជំហានទី ២៖ Deploy លើ Render.com (ឥតគិតថ្លៃ)
1. ចូលទៅកាន់ [Render.com](https://render.com) ហើយ Sign Up ជាមួយ GitHub
2. ចុច **New +** -> ជ្រើសរើស **Web Service**
3. ជ្រើសរើស GitHub Repository របស់អ្នក (`my-store-bot`)
4. កំណត់ការកំណត់ (Settings)៖
   - **Root Directory**: `store-bot/backend`
   - **Build Command**: `npm install && cd ../admin-dashboard && npm install && npm run build`
   - **Start Command**: `npm start`
5. ក្នុងប្រអប់ **Environment Variables** បន្ថែម៖
   - `TELEGRAM_BOT_TOKEN` = (Bot Token របស់អ្នក)
   - `ADMIN_TELEGRAM_ID` = (Telegram ID របស់អ្នក)
   - `ADMIN_SECRET_KEY` = `admin123456`
   - `PORT` = `10000`
6. ចុច **Create Web Service**!
   - Render នឹងធ្វើការ Deploy Bot របស់អ្នកភ្លាមៗ។
   - ចាប់ពីពេលនេះទៅ រាល់ពេលអ្នកកែប្រែកូដហើយ `git push` ទៅ GitHub នោះ Render នឹង **Auto-Deploy កែភ្លាម ចេញលទ្ធផលភ្លាមៗ 100% ស្វ័យប្រវត្តិ!**

---

## 🛡️ ការគ្រប់គ្រងសុវត្ថិភាព (Security Best Practices)
- មិនត្រូវ Commit file `.env` ឡើង GitHub ជាដាច់ខាត (មានក្នុង `.gitignore` រួចជាស្រេច)
- Admin Dashboard ត្រូវបានការពារដោយ `x-admin-key` Authorization Header
- ប្រព័ន្ធស្តុកធានាថា Stock Item មួយត្រូវបានលក់តែម្តងគត់ (Zero Double-Selling)
- ការផ្ញើសារ Broadcast មានគម្លាត 40ms/message ការពារកុំឱ្យ Telegram Block

