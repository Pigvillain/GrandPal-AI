# GrandPal AI - Bridge the Generation Gap

AI-powered slang translator that helps grandparents understand modern internet culture, emojis, and youth language.

## Features

- 🤖 AI-powered translations using Google Gemini
- 💬 Local slang database for instant translations
- 🎤 Voice input support
- 📋 Clipboard paste functionality
- 💰 Cost tracking (약 0.14원 per translation)
- 📱 Mobile-responsive design
- 🎨 Modern UI with animations

## Deployment

### Vercel Deployment (Recommended)

1. Fork/Clone this repository
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` in the project directory
4. Set environment variable in Vercel dashboard:
   - `GEMINI_API_KEY`: Your Gemini API key

### Environment Variables

- `GEMINI_API_KEY`: Required for AI translations

### Monetization

1. **Google AdSense**: Replace placeholder ad codes in `index.html`
2. **Premium Subscription**: Integrate with payment provider (Stripe, PayPal)

## Cost Analysis

- Gemini 1.5 Flash API: ~₩0.14 per translation
- Free tier: 3 translations/day
- Premium: $2.99/month for unlimited

## Tech Stack

- Vanilla JavaScript (no framework dependencies)
- Vercel Functions for API proxy
- Google Gemini API
- Marked.js for markdown rendering

## License

MIT