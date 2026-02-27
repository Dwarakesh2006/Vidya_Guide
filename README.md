# VidyaGuide AI — 100% Local, No API Key Required
> Powered by Ollama · Runs on your machine · Free forever

---

## ⚡ One-Time Setup (5 minutes)

### Step 1 — Start Ollama & pull the model
```powershell
# Ollama is already installed on your machine
ollama pull phi:3mini
```
> This downloads the model (~4GB, one time only). After that it's instant.

### Step 2 — Create virtual environment
```powershell
cd "C:\Users\DWARKESH\Downloads\Vidya Guide"
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### Step 3 — Install dependencies
```powershell
pip install -r requirements.txt
```

### Step 4 — Run the backend
```powershell
# Terminal 1: Keep Ollama running
ollama serve

# Terminal 2: Start FastAPI
uvicorn main:app --reload --port 8000
```

### Step 5 — Open the frontend
Open `VidyaGuide.jsx` as a React app, OR serve it from any React/Vite project.

---

## 🔧 Fix Pylance Warnings in VS Code
1. `Ctrl+Shift+P` → **Python: Select Interpreter**  
2. Pick `.\.venv\Scripts\python.exe`  
3. Done ✅

---

## 🔄 Want a different model?
```powershell
ollama pull mistral        # faster, lighter
ollama pull phi3           # very fast, Microsoft model
ollama pull llama3:70b     # most powerful (needs 32GB RAM)
```
Then change `OLLAMA_MODEL=mistral` in a `.env` file.

---

## 📡 API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Check Ollama status |
| `POST` | `/upload-resume` | Upload PDF → get `session_id` |
| `POST` | `/analyze` | Full AI profile analysis |
| `POST` | `/chat` | Conversational AI mentor |

---

## 🏗️ Architecture (100% Local)
```
React Frontend  →  FastAPI Backend  →  Ollama (local LLM)
                        ↓
                  pdfplumber (PDF)
                  ChromaDB (vectors)
                  SentenceTransformers (embeddings)
```



Terminal 1 - Start Ollama powershell

ollama serve

Terminal 2-Start Backend powershell

cd "C:\Users\DWARKESH\Downloads\Vidya Guide"
.venv\Scripts\Activate.ps1
uvicorn main:app --port 8000

Terminal 3-Start Frontend powershell
cd "C:\Users\DWARKESH\Downloads\Vidya Guide\frontend"
npm run dev