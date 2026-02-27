# VidyaGuide 🎓
### Agentic AI Career Mentor — Powered by Groq + llama3-8b

> **Hackathon Project** · Full-Stack AI · React + FastAPI + Groq API

VidyaGuide is a local-first AI career mentor that analyzes your resume, maps your skill gaps, coaches you through mock interviews using your voice, generates portfolio projects, builds a study schedule, and finds real job openings — all in one sleek interface.

---

## ✨ Features

| Feature | Description | AI Powered |
|---------|-------------|------------|
| 📄 **Resume Analysis** | Instant skill gap detection & match score | Rule-based (0ms) |
| ✂️ **ATS Resume Tailor** | Rewrites bullets to match any job description | Groq LLM |
| 🎤 **Voice Mock Interview** | Speak your answers, get scored AI feedback | Browser API + Groq |
| 💡 **Project Generator** | 2 custom portfolio projects with build steps | Groq LLM |
| 📅 **Study Schedule** | 4-week plan + downloadable `.ics` calendar | Groq LLM |
| 🗺️ **Career Roadmap** | 3-phase personalized roadmap with courses | Rule-based |
| 💼 **Live Job Matching** | Real job openings matched to your profile | Adzuna API |
| 💬 **AI Career Mentor** | Agentic chat with full resume context | Groq LLM |

---

## 🏗️ Tech Stack

```
Frontend    React 18 (Vite) · Single-file component · Browser SpeechRecognition API
Backend     Python 3.11 · FastAPI · Uvicorn · pdfplumber
AI          Groq API · llama3-8b-8192 (fast) · llama-3.3-70b-versatile (smart)
Jobs API    Adzuna (real-time) · Smart mock fallback (no key required)
Styling     Pure CSS-in-JS · Syne + DM Mono fonts · Dark theme
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free [Groq API key](https://console.groq.com)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/vidyaguide.git
cd vidyaguide
```

**Backend:**
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
npm install
```

---

### 2. Configure Environment

Create a `.env` file in the `backend/` folder:

```env
# Required — Get free at https://console.groq.com
GROQ_API_KEY=gsk_your_key_here

# Optional: change model
GROQ_MODEL=llama3-8b-8192

# Optional: Live job listings — https://developer.adzuna.com (free tier)
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key
```

---

### 3. Add the Frontend Component

Copy `VidyaGuide.jsx` into your React app:

```bash
cp VidyaGuide.jsx frontend/src/VidyaGuide.jsx
```

Update `frontend/src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import VidyaGuide from './VidyaGuide'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VidyaGuide />
  </React.StrictMode>
)
```

---

### 4. Run the App

Open **two terminals:**

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn main:app --port 8000 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge 🎉

---

## 📁 Project Structure

```
vidyaguide/
├── backend/
│   ├── main.py              # FastAPI app — all 9 endpoints
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Your API keys (never commit this)
│   └── .env.example         # Template
│
├── frontend/
│   ├── src/
│   │   ├── VidyaGuide.jsx   # Entire React app (single file, 1454 lines)
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   └── package.json
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload-resume` | Upload PDF → returns session ID |
| `POST` | `/analyze` | Gap analysis (instant, rule-based) |
| `POST` | `/tailor-resume` | ATS-optimize for a job description |
| `POST` | `/generate-questions` | Generate 3 tailored interview questions |
| `POST` | `/evaluate-answer` | Score answer 1–10 with detailed feedback |
| `POST` | `/generate-projects` | Generate 2 portfolio project ideas |
| `POST` | `/generate-schedule` | Build 4-week plan + .ics calendar file |
| `POST` | `/find-jobs` | Live job matches (Adzuna API or smart mock) |
| `POST` | `/chat` | Agentic career mentor chat |
| `GET`  | `/health` | Health check + API config status |

Interactive docs: **http://localhost:8000/docs**

---

## 🎤 Voice Interview — How It Works

Uses the **browser's native Web Speech API** — no external service or cost.

```
User clicks 🎙️ mic button
        ↓
SpeechRecognition starts — transcribes in real-time
        ↓
Interim words appear in italic as you speak
        ↓
Click ⏹ stop — transcript is locked in
        ↓
Transcript sent to /evaluate-answer endpoint
        ↓
Groq llama3-8b scores it 1–10 in ~1 second
        ↓
Shows: score, verdict, strengths, improvements, ideal answer, follow-up Q
```

**Browser support:**
- Chrome ✅ (recommended)
- Edge ✅
- Firefox ⚠️ (partial)
- Safari ⚠️ (partial)

If mic permission is denied, the app shows a clear error and the **Text Mode** tab is always available as a fallback.

---

## 💼 Live Job Search — How It Works

```
/find-jobs called with session_id + location
        ↓
  Adzuna keys in .env?
  ┌────────────────────┐
  │         YES        │ → Fetch live jobs from Adzuna API
  │                    │   Real postings, real salaries, real apply URLs
  └────────────────────┘
  ┌────────────────────┐
  │         NO         │ → Smart curated mock database
  │                    │   Role-specific companies (Google, Swiggy, etc.)
  │                    │   Real apply URLs on LinkedIn/careers pages
  │                    │   Match % personalized to candidate's score
  └────────────────────┘
```

To enable live jobs → sign up at [developer.adzuna.com](https://developer.adzuna.com) (free, takes 2 minutes, 250 API calls/day on free tier).

---

## 🧠 AI Architecture

```
PDF Upload   →  pdfplumber extracts text
                      ↓
Gap Analysis →  Rule-based Python (instant, 0ms, deterministic)
                Skill matching against 8-role knowledge base
                      ↓
AI Features  →  Groq API
                  llama3-8b-8192     for fast responses (chat, eval)
                  llama-3.3-70b      for complex tasks (tailor, projects)
                      ↓
Session Store → In-memory dict (resume + profile + chat history per session)
```

**Why Groq?** Groq's LPU hardware is ~10x faster than GPU providers — interview evaluation feels near-instant even on slow connections.

---

## 🛠️ Supported Roles

Built-in knowledge base with skill requirements + course recommendations for:

| Role | Critical Skills |
|------|----------------|
| Full Stack Developer | React, Node, TypeScript, SQL, REST, Docker |
| Data Scientist | Python, pandas, scikit-learn, SQL, Statistics |
| ML Engineer | PyTorch, TensorFlow, MLflow, Docker, Deep Learning |
| DevOps / Cloud Engineer | Docker, Kubernetes, AWS, Terraform, CI/CD |
| Product Manager | Agile, User Research, SQL, Roadmapping |
| UX Designer | Figma, Wireframing, Usability Testing, Prototyping |
| Cybersecurity Analyst | Networking, Linux, Python, SIEM, Pentesting |
| Blockchain Developer | Solidity, Ethereum, Web3.js, Smart Contracts |

Custom roles are also accepted — the AI adapts to any job title.

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | — | **Required.** Free at console.groq.com |
| `GROQ_MODEL` | `llama3-8b-8192` | Fastest model. Use `llama-3.3-70b-versatile` for higher quality |
| `ADZUNA_APP_ID` | — | Optional. Enables live job listings |
| `ADZUNA_APP_KEY` | — | Optional. Pair with APP_ID |

---

## 🐛 Troubleshooting

**"Failed to fetch" in the browser**
```
✅ Make sure backend is running: uvicorn main:app --port 8000 --reload
✅ Check http://localhost:8000/health returns {"status":"online"}
✅ Use Chrome or Edge (not Firefox/Safari for voice)
```

**"GROQ_API_KEY not set" error**
```
✅ Create .env file in the same folder as main.py
✅ Add: GROQ_API_KEY=gsk_...your key here...
✅ Restart uvicorn after saving .env
```

**Voice recognition not working**
```
✅ Use Chrome or Edge browser
✅ Click "Allow" when browser asks for microphone permission
✅ Check Settings → Privacy → Microphone is not blocked for localhost
✅ Make sure no other tab is using the microphone
```

**PDF not parsing (empty analysis)**
```
✅ PDF must contain real text (not a scanned image)
✅ Try copy-pasting text from the PDF to verify it's readable
✅ File must be .pdf format (not .docx or .jpg)
```

**Port 8000 already in use**
```bash
# Kill the process
npx kill-port 8000
# Or use a different port
uvicorn main:app --port 8001 --reload
# Then update API_BASE in VidyaGuide.jsx to http://localhost:8001
```

---

## 📦 Dependencies

**Python (`requirements.txt`)**
```
fastapi==0.111.0        # Web framework
uvicorn==0.30.1         # ASGI server
python-multipart==0.0.9 # File uploads
pdfplumber==0.11.0      # PDF text extraction
pydantic==2.7.1         # Data validation
python-dotenv==1.0.1    # .env file loading
httpx==0.27.0           # Async HTTP client (Adzuna API)
groq==0.9.0             # Official Groq SDK
```

**Node.js** — Only React + Vite needed. No extra npm packages required for the frontend.

---

## 🚢 Deploying to Production

**Backend on Railway:**
1. Push to GitHub
2. Connect repo to Railway
3. Add environment variables in Railway dashboard
4. Deploy with: `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend on Vercel:**
1. Update `API_BASE` in `VidyaGuide.jsx` to your Railway backend URL
2. `npm run build`
3. Deploy `dist/` folder to Vercel

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute for any purpose.

---

## 🙏 Credits

| Tool | Purpose |
|------|---------|
| [Groq](https://groq.com) | Ultra-fast LLM inference (LPU hardware) |
| [Meta Llama 3](https://llama.meta.com) | Open-source language model |
| [FastAPI](https://fastapi.tiangolo.com) | Modern async Python API framework |
| [Adzuna](https://developer.adzuna.com) | Free job listings API |
| [pdfplumber](https://github.com/jsvine/pdfplumber) | PDF text extraction |
| [Syne Font](https://fonts.google.com/specimen/Syne) | UI headings |

---

<div align="center">

**Built with ❤️ for the hackathon**

VidyaGuide · Groq AI · llama3-8b-8192 · FastAPI · React

</div>