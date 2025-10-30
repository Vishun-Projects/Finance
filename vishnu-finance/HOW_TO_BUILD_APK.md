# Build Android APK

## The Simple Way - 3 Steps

### Step 1: Build Your Website

```bash
npm run build
```

### Step 2: Expose Your Local Server

Install ngrok (or download from https://ngrok.com/download):

```bash
npm install -g ngrok
```

Serve your website:

```bash
npx serve out -p 8080
```

In a **NEW terminal**, expose it:

```bash
ngrok http 8080
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 3: Generate APK

1. Go to: **https://www.pwabuilder.com/**
2. Paste your ngrok URL
3. Click "START"
4. Click "Build My PWA"
5. Click "Android" → "Download"
6. Install APK on your phone!

---

## Alternative: Use Your IP (Same WiFi)

Instead of ngrok, use your computer's IP:

1. Find your IP: `ipconfig` (Windows)
2. On phone, go to: `http://YOUR_IP:8080`
3. Follow Step 3 above with this URL

---

## That's It!

You'll have an APK file you can:
- Install on your phone
- Share with friends
- Upload to Play Store

No domain needed!
