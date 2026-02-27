"""
VidyaGuide — Agentic AI Backend v6.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEW in v6:
  ★ Voice Interview   — /generate-questions  /evaluate-answer
  ★ Live Job Search   — /find-jobs  (Adzuna API + smart mock fallback)

Full Feature Set:
  1. /tailor-resume      — ATS-optimized resume rewriter
  2. /analyze            — Gap analysis + course URLs
  3. /generate-questions — Tailored interview questions
  4. /evaluate-answer    — Answer scorer with feedback
  5. /generate-projects  — Portfolio project generator
  6. /generate-schedule  — 4-week plan + .ics calendar
  7. /find-jobs          — Live job board matching
  8. /chat               — Agentic career mentor chat
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json, os, re, io, uuid, asyncio
from datetime import datetime, timedelta
import pdfplumber
import httpx
from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
MODEL_NAME     = os.getenv("GROQ_MODEL", "llama3-8b-8192")   # fastest Groq model
MODEL_SMART    = "llama-3.3-70b-versatile"                   # for complex tasks

# Adzuna Job API (free tier — sign up at https://developer.adzuna.com)
ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")

app = FastAPI(title="VidyaGuide API v6.0", version="6.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict = {}

# ── Groq LLM Client ───────────────────────────────────────────────────────────
groq_client = AsyncGroq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

async def ask_llm(
    system: str,
    user: str,
    temperature: float = 0.4,
    max_tokens: int = 1500,
    smart: bool = False,
) -> str:
    if not GROQ_API_KEY or not groq_client:
        raise HTTPException(
            500,
            "GROQ_API_KEY not set. Get your free key at https://console.groq.com"
        )
    model = MODEL_SMART if smart else MODEL_NAME
    resp = await groq_client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()


def safe_json(text: str) -> dict | list:
    cleaned = re.sub(r"```json|```", "", text).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        m = re.search(r"[\[\{].*[\]\}]", cleaned, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return {}


# ═══════════════════════════════════════════════════════════════════════════════
# ROLE KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════════════════
ROLE_REQUIREMENTS = {
    "Full Stack Developer": {
        "critical":  ["React","Node","JavaScript","TypeScript","SQL","REST","Git","HTML","CSS"],
        "moderate":  ["Docker","MongoDB","PostgreSQL","AWS","Redis","GraphQL","Testing"],
        "minor":     ["CI/CD","Kubernetes","Microservices","Linux"],
        "courses": [
            {"title":"The Complete Web Developer Bootcamp","platform":"Udemy","duration":"60hrs",
             "why":"HTML,CSS,JS,Node,React end-to-end","url":"https://www.udemy.com/course/the-complete-web-development-bootcamp/"},
            {"title":"Full Stack Open 2024","platform":"University of Helsinki (Free)","duration":"13 weeks",
             "why":"Modern React + Node + TypeScript + GraphQL","url":"https://fullstackopen.com"},
            {"title":"Docker & Kubernetes Guide","platform":"Udemy","duration":"20hrs",
             "why":"Close the DevOps gap that most FS roles require","url":"https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/"},
        ]
    },
    "Data Scientist": {
        "critical":  ["Python","pandas","numpy","scikit-learn","SQL","Statistics","Machine Learning"],
        "moderate":  ["TensorFlow","PyTorch","Data Visualization","Feature Engineering","Jupyter"],
        "minor":     ["Spark","Hadoop","Tableau","PowerBI","NLP"],
        "courses": [
            {"title":"Python for Data Science Bootcamp","platform":"Udemy","duration":"25hrs",
             "why":"Best beginner-to-advanced data science course","url":"https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/"},
            {"title":"Machine Learning Specialization","platform":"Coursera","duration":"3 months",
             "why":"Andrew Ng — industry gold standard ML course","url":"https://www.coursera.org/specializations/machine-learning-introduction"},
            {"title":"SQL for Data Analysis","platform":"Mode Analytics","duration":"2 weeks",
             "why":"SQL is critical for every DS role","url":"https://mode.com/sql-tutorial/"},
        ]
    },
    "ML Engineer": {
        "critical":  ["Python","TensorFlow","PyTorch","Machine Learning","Deep Learning","SQL","Git"],
        "moderate":  ["Docker","Kubernetes","MLflow","AWS","Feature Engineering","NLP","Computer Vision"],
        "minor":     ["Spark","Kafka","FastAPI","CI/CD"],
        "courses": [
            {"title":"Deep Learning Specialization","platform":"Coursera","duration":"4 months",
             "why":"Covers all DL fundamentals by Andrew Ng","url":"https://www.coursera.org/specializations/deep-learning"},
            {"title":"MLOps Specialization","platform":"Coursera","duration":"4 months",
             "why":"Deploy ML models to production","url":"https://www.coursera.org/specializations/machine-learning-engineering-for-production-mlops"},
            {"title":"Hands-On Machine Learning","platform":"O'Reilly","duration":"Self-paced",
             "why":"Best practical ML reference book","url":"https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/"},
        ]
    },
    "DevOps / Cloud Engineer": {
        "critical":  ["Docker","Kubernetes","Linux","CI/CD","AWS","Git","Bash","Terraform"],
        "moderate":  ["Ansible","Jenkins","Prometheus","Grafana","Python","Networking"],
        "minor":     ["Azure","GCP","Helm","ArgoCD"],
        "courses": [
            {"title":"Docker and Kubernetes Complete Guide","platform":"Udemy","duration":"22hrs",
             "why":"Most comprehensive DevOps course","url":"https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/"},
            {"title":"AWS Solutions Architect","platform":"A Cloud Guru","duration":"40hrs",
             "why":"Industry standard cloud certification","url":"https://acloudguru.com/course/aws-certified-solutions-architect-associate"},
            {"title":"Linux Foundation Sysadmin","platform":"Linux Foundation","duration":"Self-paced",
             "why":"Essential Linux skills for DevOps","url":"https://training.linuxfoundation.org/certification/lfcs/"},
        ]
    },
    "Product Manager": {
        "critical":  ["Product Strategy","User Research","Agile","Scrum","Data Analysis","Roadmapping"],
        "moderate":  ["SQL","Figma","A/B Testing","Stakeholder Management","Python"],
        "minor":     ["Jira","Confluence","OKRs","Go-to-Market"],
        "courses": [
            {"title":"Product Management Fundamentals","platform":"Coursera","duration":"4 weeks",
             "why":"Core PM skills and frameworks","url":"https://www.coursera.org/learn/uva-darden-digital-product-management"},
            {"title":"SQL for Product Managers","platform":"Mode Analytics","duration":"2 weeks",
             "why":"Data-driven PM decisions","url":"https://mode.com/sql-tutorial/"},
            {"title":"Become a Product Manager","platform":"Udemy","duration":"12hrs",
             "why":"End-to-end PM career guide","url":"https://www.udemy.com/course/become-a-product-manager-learn-the-skills-get-a-job/"},
        ]
    },
    "UX Designer": {
        "critical":  ["Figma","User Research","Wireframing","Prototyping","Design Thinking","Usability Testing"],
        "moderate":  ["Adobe XD","Sketch","HTML","CSS","Information Architecture","Accessibility"],
        "minor":     ["Motion Design","Framer","Design Systems","React"],
        "courses": [
            {"title":"Google UX Design Certificate","platform":"Coursera","duration":"6 months",
             "why":"Industry recognized UX certification","url":"https://www.coursera.org/professional-certificates/google-ux-design"},
            {"title":"UI/UX Design Bootcamp","platform":"Udemy","duration":"30hrs",
             "why":"Covers Figma + full design process","url":"https://www.udemy.com/course/ui-ux-web-design-using-adobe-xd/"},
            {"title":"Interaction Design Foundation","platform":"IDF","duration":"Self-paced",
             "why":"Deep UX theory and practice","url":"https://www.interaction-design.org/"},
        ]
    },
    "Cybersecurity Analyst": {
        "critical":  ["Networking","Linux","Python","Security Fundamentals","SIEM","Incident Response"],
        "moderate":  ["Penetration Testing","Wireshark","Metasploit","SQL","Cryptography","Firewalls"],
        "minor":     ["OSCP","CEH","AWS Security","Forensics"],
        "courses": [
            {"title":"Google Cybersecurity Certificate","platform":"Coursera","duration":"6 months",
             "why":"Best entry-level security certification","url":"https://www.coursera.org/professional-certificates/google-cybersecurity"},
            {"title":"CompTIA Security+ Prep","platform":"Udemy","duration":"20hrs",
             "why":"Most recognized security cert","url":"https://www.udemy.com/course/securityplus/"},
            {"title":"Practical Ethical Hacking","platform":"TCM Security","duration":"25hrs",
             "why":"Hands-on penetration testing","url":"https://academy.tcm-sec.com/p/practical-ethical-hacking-the-complete-course"},
        ]
    },
    "Blockchain Developer": {
        "critical":  ["Solidity","Ethereum","JavaScript","Web3.js","Smart Contracts","Git"],
        "moderate":  ["React","Node","Hardhat","Truffle","DeFi","IPFS"],
        "minor":     ["Rust","Polkadot","Solana","NFT Standards"],
        "courses": [
            {"title":"Blockchain Developer Bootcamp","platform":"Udemy","duration":"24hrs",
             "why":"Complete Solidity + Web3 course","url":"https://www.udemy.com/course/blockchain-developer/"},
            {"title":"Ethereum and Solidity Guide","platform":"Udemy","duration":"20hrs",
             "why":"Best Solidity course with real projects","url":"https://www.udemy.com/course/ethereum-and-solidity-the-complete-developers-guide/"},
            {"title":"CryptoZombies","platform":"CryptoZombies (Free)","duration":"2 weeks",
             "why":"Fun interactive Solidity learning","url":"https://cryptozombies.io/"},
        ]
    },
}

DEFAULT_ROLE_REQ = {
    "critical":  ["Communication","Problem Solving","Teamwork","Git","Python"],
    "moderate":  ["SQL","Linux","Docker","REST APIs"],
    "minor":     ["Cloud","CI/CD","Agile"],
    "courses": [
        {"title":"Complete Python Bootcamp","platform":"Udemy","duration":"22hrs",
         "why":"Python is foundational for any tech role","url":"https://www.udemy.com/course/complete-python-bootcamp/"},
        {"title":"Git & GitHub Crash Course","platform":"freeCodeCamp","duration":"1 week",
         "why":"Essential for every developer","url":"https://www.youtube.com/watch?v=RGOj5yH7evk"},
    ]
}

# ── Job board mock data (used when Adzuna keys not set) ───────────────────────
MOCK_JOBS = {
    "Full Stack Developer": [
        {"title":"Senior Full Stack Developer","company":"Razorpay","location":"Bangalore, India","salary":"₹18–35 LPA","type":"Full-time","logo":"🟣","apply_url":"https://www.linkedin.com/jobs/search/?keywords=full+stack+developer&location=Bangalore","posted":"2 days ago","match":94},
        {"title":"Full Stack Engineer (React + Node)","company":"Swiggy","location":"Bangalore, India","salary":"₹20–40 LPA","type":"Full-time","logo":"🟠","apply_url":"https://careers.swiggy.com","posted":"1 day ago","match":91},
        {"title":"Full Stack Developer","company":"Freshworks","location":"Chennai, India","salary":"₹15–28 LPA","type":"Full-time","logo":"🟢","apply_url":"https://www.freshworks.com/company/careers/","posted":"3 days ago","match":88},
        {"title":"Software Engineer – Full Stack","company":"Atlassian","location":"Remote","salary":"$100–140K USD","type":"Remote","logo":"🔵","apply_url":"https://www.atlassian.com/company/careers","posted":"Today","match":85},
        {"title":"Full Stack Intern","company":"Zepto","location":"Mumbai, India","salary":"₹40–60K/month","type":"Internship","logo":"🟡","apply_url":"https://www.linkedin.com/jobs/search/?keywords=full+stack+intern","posted":"4 days ago","match":79},
    ],
    "Data Scientist": [
        {"title":"Data Scientist II","company":"Amazon","location":"Hyderabad, India","salary":"₹25–45 LPA","type":"Full-time","logo":"🟠","apply_url":"https://www.amazon.jobs/en/search?base_query=data+scientist","posted":"1 day ago","match":95},
        {"title":"Senior Data Scientist","company":"Flipkart","location":"Bangalore, India","salary":"₹20–38 LPA","type":"Full-time","logo":"🟡","apply_url":"https://www.flipkartcareers.com","posted":"2 days ago","match":90},
        {"title":"Data Scientist – Fraud Analytics","company":"PhonePe","location":"Bangalore, India","salary":"₹18–32 LPA","type":"Full-time","logo":"🟣","apply_url":"https://careers.phonepe.com","posted":"3 days ago","match":87},
        {"title":"Machine Learning Scientist","company":"Fractal Analytics","location":"Mumbai, India","salary":"₹12–22 LPA","type":"Full-time","logo":"🔷","apply_url":"https://fractal.ai/careers","posted":"Today","match":83},
        {"title":"Data Scientist Intern","company":"CRED","location":"Bangalore, India","salary":"₹50–80K/month","type":"Internship","logo":"⚫","apply_url":"https://www.linkedin.com/jobs/search/?keywords=data+scientist+intern+bangalore","posted":"5 days ago","match":78},
    ],
    "ML Engineer": [
        {"title":"ML Engineer – NLP","company":"Google","location":"Hyderabad, India","salary":"₹30–55 LPA","type":"Full-time","logo":"🔵","apply_url":"https://careers.google.com/jobs/results/?q=machine+learning+engineer","posted":"Today","match":96},
        {"title":"Senior MLOps Engineer","company":"Microsoft","location":"Bangalore, India","salary":"₹28–50 LPA","type":"Full-time","logo":"🔵","apply_url":"https://careers.microsoft.com/us/en/search-results?keywords=ml+engineer","posted":"2 days ago","match":92},
        {"title":"ML Infrastructure Engineer","company":"ShareChat","location":"Bangalore, India","salary":"₹22–40 LPA","type":"Full-time","logo":"🟣","apply_url":"https://sharechat.com/careers","posted":"1 day ago","match":89},
        {"title":"Research Engineer – ML","company":"Sarvam AI","location":"Bangalore, India","salary":"₹20–45 LPA","type":"Full-time","logo":"🤖","apply_url":"https://www.sarvam.ai/careers","posted":"3 days ago","match":85},
        {"title":"ML Engineer (Computer Vision)","company":"Ola","location":"Bangalore, India","salary":"₹18–35 LPA","type":"Full-time","logo":"🟡","apply_url":"https://www.linkedin.com/jobs/search/?keywords=ml+engineer+computer+vision+bangalore","posted":"4 days ago","match":80},
    ],
    "DevOps / Cloud Engineer": [
        {"title":"Senior DevOps Engineer","company":"Infosys","location":"Bangalore, India","salary":"₹12–22 LPA","type":"Full-time","logo":"🔷","apply_url":"https://www.infosys.com/careers/apply.html","posted":"1 day ago","match":88},
        {"title":"Cloud Infrastructure Engineer","company":"Walmart Labs","location":"Bangalore, India","salary":"₹20–38 LPA","type":"Full-time","logo":"🔵","apply_url":"https://careers.walmart.com/results?q=devops","posted":"Today","match":91},
        {"title":"SRE / DevOps Engineer","company":"Razorpay","location":"Bangalore, India","salary":"₹18–32 LPA","type":"Full-time","logo":"🟣","apply_url":"https://razorpay.com/jobs","posted":"2 days ago","match":89},
        {"title":"AWS Cloud Engineer","company":"TCS","location":"Mumbai, India","salary":"₹8–16 LPA","type":"Full-time","logo":"🔵","apply_url":"https://www.tcs.com/careers","posted":"3 days ago","match":82},
        {"title":"DevOps Intern","company":"Freshworks","location":"Chennai, India","salary":"₹30–50K/month","type":"Internship","logo":"🟢","apply_url":"https://www.linkedin.com/jobs/search/?keywords=devops+intern+india","posted":"4 days ago","match":76},
    ],
    "Product Manager": [
        {"title":"Product Manager – Growth","company":"CRED","location":"Bangalore, India","salary":"₹20–38 LPA","type":"Full-time","logo":"⚫","apply_url":"https://www.linkedin.com/jobs/search/?keywords=product+manager+cred","posted":"Today","match":93},
        {"title":"Senior Product Manager","company":"Swiggy","location":"Bangalore, India","salary":"₹25–45 LPA","type":"Full-time","logo":"🟠","apply_url":"https://careers.swiggy.com","posted":"2 days ago","match":90},
        {"title":"Associate PM","company":"Razorpay","location":"Bangalore, India","salary":"₹18–30 LPA","type":"Full-time","logo":"🟣","apply_url":"https://razorpay.com/jobs","posted":"1 day ago","match":87},
        {"title":"Product Manager – Payments","company":"PhonePe","location":"Bangalore, India","salary":"₹22–40 LPA","type":"Full-time","logo":"🟣","apply_url":"https://careers.phonepe.com","posted":"3 days ago","match":84},
        {"title":"APM / PM Intern","company":"Meesho","location":"Bangalore, India","salary":"₹60–80K/month","type":"Internship","logo":"🟡","apply_url":"https://www.linkedin.com/jobs/search/?keywords=product+manager+intern+bangalore","posted":"5 days ago","match":78},
    ],
    "Cybersecurity Analyst": [
        {"title":"Security Analyst L2","company":"IBM","location":"Bangalore, India","salary":"₹8–16 LPA","type":"Full-time","logo":"🔵","apply_url":"https://www.ibm.com/employment/","posted":"2 days ago","match":88},
        {"title":"Cybersecurity Engineer","company":"TCS","location":"Mumbai, India","salary":"₹7–14 LPA","type":"Full-time","logo":"🔵","apply_url":"https://www.tcs.com/careers","posted":"1 day ago","match":84},
        {"title":"Penetration Tester","company":"HackerOne","location":"Remote","salary":"$70–110K USD","type":"Remote","logo":"🔴","apply_url":"https://www.hackerone.com/careers","posted":"Today","match":91},
        {"title":"SOC Analyst","company":"Wipro","location":"Hyderabad, India","salary":"₹6–12 LPA","type":"Full-time","logo":"🟡","apply_url":"https://careers.wipro.com","posted":"3 days ago","match":80},
        {"title":"Security Intern","company":"Razorpay","location":"Bangalore, India","salary":"₹35–55K/month","type":"Internship","logo":"🟣","apply_url":"https://www.linkedin.com/jobs/search/?keywords=security+intern+bangalore","posted":"4 days ago","match":75},
    ],
}

DEFAULT_JOBS = [
    {"title":"Software Engineer","company":"Google","location":"Hyderabad, India","salary":"₹20–45 LPA","type":"Full-time","logo":"🔵","apply_url":"https://careers.google.com","posted":"Today","match":88},
    {"title":"Software Developer","company":"Microsoft","location":"Bangalore, India","salary":"₹22–48 LPA","type":"Full-time","logo":"🔵","apply_url":"https://careers.microsoft.com","posted":"2 days ago","match":85},
    {"title":"Full Stack Engineer","company":"Razorpay","location":"Bangalore, India","salary":"₹18–35 LPA","type":"Full-time","logo":"🟣","apply_url":"https://razorpay.com/jobs","posted":"1 day ago","match":82},
    {"title":"Backend Engineer","company":"Swiggy","location":"Bangalore, India","salary":"₹15–30 LPA","type":"Full-time","logo":"🟠","apply_url":"https://careers.swiggy.com","posted":"3 days ago","match":79},
    {"title":"Software Engineer Intern","company":"Freshworks","location":"Chennai, India","salary":"₹40–60K/month","type":"Internship","logo":"🟢","apply_url":"https://www.freshworks.com/company/careers/","posted":"4 days ago","match":75},
]


# ═══════════════════════════════════════════════════════════════════════════════
# RESUME PARSER
# ═══════════════════════════════════════════════════════════════════════════════
def parse_resume(text: str) -> dict:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    name  = "Candidate"
    for line in lines[:6]:
        if not re.search(r'[@\d\|•\-\+/\\]', line) and 2 <= len(line.split()) <= 5:
            name = line.title(); break

    email = m.group(0) if (m := re.search(r'[\w\.\-\+]+@[\w\.-]+\.\w+', text)) else ""
    phone = m.group(0).strip() if (m := re.search(r'[\+]?[\d\s\-\(\)]{10,15}', text)) else ""

    ALL_TECH = [
        "Python","JavaScript","TypeScript","React","Node","Angular","Vue","Java","C","C++","C#",
        "Go","Rust","Swift","Kotlin","PHP","Ruby","Scala","R","MATLAB","SQL","MySQL","PostgreSQL",
        "MongoDB","Redis","Cassandra","SQLite","Firebase","Supabase","Docker","Kubernetes","AWS",
        "Azure","GCP","Terraform","Ansible","Jenkins","Linux","Bash","Git","GitHub","GitLab",
        "CI/CD","Nginx","Apache","HTML","CSS","Tailwind","Bootstrap","Sass","Webpack","Vite",
        "FastAPI","Django","Flask","Spring","Express","Next.js","Nest.js","Laravel","TensorFlow",
        "PyTorch","Keras","scikit-learn","pandas","numpy","OpenCV","Machine Learning",
        "Deep Learning","NLP","Computer Vision","Data Science","REST","GraphQL","gRPC",
        "WebSocket","Microservices","Agile","Scrum","Figma","Photoshop","Adobe XD","Sketch",
        "Solidity","Web3","Ethereum","Blockchain","Smart Contracts","Penetration Testing",
        "Networking","Cybersecurity","Cryptography",
    ]
    found_skills = [s for s in ALL_TECH if re.search(rf'\b{re.escape(s)}\b', text, re.IGNORECASE)]

    edu = []
    for m in re.finditer(r'(B\.?Tech|B\.?E\.?|B\.?Sc|M\.?Tech|M\.?Sc|MBA|PhD|Bachelor|Master|Diploma|B\.?C\.?A|M\.?C\.?A)[^\n]{0,80}', text, re.IGNORECASE):
        edu.append({"degree": m.group(0).strip()[:80], "institution": ""})
        if len(edu) >= 2: break

    exp = []
    for m in re.finditer(r'(Software|Senior|Junior|Full[\s-]?Stack|Backend|Frontend|Data|ML|DevOps|Cloud|Security|Product|UX)[\w\s]*?(Developer|Engineer|Analyst|Designer|Manager|Intern|Lead|Architect)[^\n]{0,60}', text, re.IGNORECASE):
        exp.append({"title": m.group(0).strip()[:60], "company": ""})
        if len(exp) >= 3: break

    return {"name":name,"email":email,"phone":phone,"skills":found_skills,"education":edu,"experience":exp,"projects":[]}


# ═══════════════════════════════════════════════════════════════════════════════
# GAP ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
def analyze_gaps(profile: dict, target_role: str, experience_level: str) -> dict:
    req         = ROLE_REQUIREMENTS.get(target_role, DEFAULT_ROLE_REQ)
    user_skills = set(s.lower() for s in profile.get("skills", []))

    def has(skill: str) -> bool:
        s = skill.lower()
        return s in user_skills or any(s in us or us in s for us in user_skills)

    crit, mod, minor = req["critical"], req["moderate"], req["minor"]
    ch, mh, nih = sum(1 for s in crit if has(s)), sum(1 for s in mod if has(s)), sum(1 for s in minor if has(s))
    tw   = len(crit)*3 + len(mod)*2 + len(minor)
    sw   = ch*3 + mh*2 + nih
    score = min(95, max(20, int(sw/max(tw,1)*100)))
    if experience_level in ("1-3 years","3+ years") and score < 80:
        score = min(85, score + 8)

    gaps = []
    for s in crit:
        if not has(s): gaps.append({"skill":s,"severity":"critical","reason":f"Core requirement for {target_role} — in 95%+ of job postings"})
    for s in mod:
        if not has(s) and sum(1 for g in gaps if g["severity"]=="moderate") < 3:
            gaps.append({"skill":s,"severity":"moderate","reason":f"Highly preferred for {target_role} roles"})
    for s in minor:
        if not has(s) and sum(1 for g in gaps if g["severity"]=="minor") < 2:
            gaps.append({"skill":s,"severity":"minor","reason":"Nice-to-have that boosts your profile"})

    strengths = [s for s in crit+mod if has(s)][:5] or profile.get("skills",["Programming"])[:3]

    skill_bars = []
    for skill in profile.get("skills",[])[:6]:
        base = 75 if skill in crit else 55 if skill in mod else 45
        skill_bars.append({"name":skill,"percentage":min(90, base+len(skill_bars)*3)})
    if not skill_bars: skill_bars = [{"name":"Programming","percentage":50}]

    first_gap    = gaps[0]["skill"] if gaps else "core skills"
    crit_missing = [g["skill"] for g in gaps if g["severity"]=="critical"]

    roadmap = [
        {"step":1,"title":"Close Critical Gaps","description":f"Focus on {', '.join(crit_missing[:2]) or first_gap}. Spend 2-3 hours daily.","timeframe":"0-1 month","type":"immediate"},
        {"step":2,"title":"Build Real Projects","description":f"Create 2-3 portfolio projects using {', '.join(profile.get('skills',[])[:2]) or 'your skills'}. Push to GitHub.","timeframe":"1-3 months","type":"short"},
        {"step":3,"title":"Apply & Network","description":f"Apply to 10 {target_role} positions/week. Attend meetups, expand LinkedIn.","timeframe":"3-6 months","type":"long"},
    ]

    if score >= 75:
        summary = f"Strong match for {target_role}! Solid foundation with {', '.join(strengths[:2])}. Focus on {crit_missing[0] if crit_missing else 'advanced topics'} to go fully job-ready."
    elif score >= 50:
        summary = f"Good potential for {target_role}. {', '.join(strengths[:2]) if strengths else 'Your skills'} are valuable. Close {len(crit_missing)} critical gaps to boost your chances."
    else:
        summary = f"You're on your way to {target_role}. Focus intensively on {', '.join(crit_missing[:2]) if crit_missing else 'required skills'} — these appear in 90%+ of job postings."

    return {"matchScore":score,"summary":summary,"strengths":strengths,"gaps":gaps[:6],"skillBars":skill_bars[:6],
            "roadmap":roadmap,"courses":req["courses"][:3],"missing_skills":crit_missing[:5]}


# ═══════════════════════════════════════════════════════════════════════════════
# ICS CALENDAR GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════
def generate_ics(schedule: list) -> str:
    lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//VidyaGuide//AI Career Mentor//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"]
    now, uid_c = datetime.utcnow(), 0
    for week in schedule:
        for task in week.get("tasks", []):
            uid_c += 1
            start    = now + timedelta(days=task.get("day_offset", uid_c * 2))
            dtstart  = start.strftime("%Y%m%dT090000Z")
            dtend    = (start + timedelta(hours=2)).strftime("%Y%m%dT110000Z")
            dtstamp  = now.strftime("%Y%m%dT%H%M%SZ")
            lines += [
                "BEGIN:VEVENT", f"UID:{uid_c}-vidyaguide@calendar",
                f"DTSTAMP:{dtstamp}", f"DTSTART:{dtstart}", f"DTEND:{dtend}",
                f"SUMMARY:VidyaGuide – {task.get('title','Study Session')}",
                f"DESCRIPTION:{task.get('description','Complete your study task')}",
                "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY",
                f"DESCRIPTION:Reminder: {task.get('title','Study Session')}", "END:VALARM", "END:VEVENT",
            ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)


# ═══════════════════════════════════════════════════════════════════════════════
# PYDANTIC MODELS
# ═══════════════════════════════════════════════════════════════════════════════
class AnalyzeRequest(BaseModel):
    session_id: str; target_role: str; experience_level: str = "fresher"
    career_field: Optional[str] = ""; job_types: Optional[List[str]] = []
    preferred_location: Optional[str] = ""; salary_range: Optional[str] = ""; career_goal: Optional[str] = ""

class ChatRequest(BaseModel):
    session_id: str; message: str

class TailorRequest(BaseModel):
    session_id: str; job_description: str

class QuestionsRequest(BaseModel):
    session_id: str; num_questions: int = 3

class EvaluateRequest(BaseModel):
    session_id: str; question: str; answer: str

class ProjectsRequest(BaseModel):
    session_id: str

class ScheduleRequest(BaseModel):
    session_id: str

class FindJobsRequest(BaseModel):
    session_id: str
    location: Optional[str] = "India"
    num_results: int = 5


# ═══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"status":"VidyaGuide API v6.0 is live 🚀","model":MODEL_NAME,
            "new_features":["voice-interview","live-job-matching"],"docs":"/docs"}

@app.get("/health")
def health():
    return {"status":"online","groq_configured":bool(GROQ_API_KEY),"model":MODEL_NAME,
            "adzuna_configured":bool(ADZUNA_APP_ID and ADZUNA_APP_KEY)}


# ── 1. UPLOAD RESUME ──────────────────────────────────────────────────────────
@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files accepted.")
    pdf_bytes = await file.read()
    text = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t: text += t + "\n"
    if len(text.strip()) < 50:
        raise HTTPException(422, "Could not extract text from PDF.")
    sid = str(uuid.uuid4())[:8]
    sessions[sid] = {"resume_text": text.strip(), "messages": []}
    return {"session_id": sid, "chars": len(text)}


# ── 2. ANALYZE ────────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    profile = parse_resume(session["resume_text"])
    gap     = analyze_gaps(profile, req.target_role, req.experience_level)
    sessions[req.session_id].update({
        "profile": profile, "gap": gap, "target_role": req.target_role,
        "career_goal": req.career_goal, "preferences": {
            "field": req.career_field, "job_types": req.job_types,
            "location": req.preferred_location, "salary": req.salary_range,
        }
    })
    return {"session_id": req.session_id, "profile": profile, "gap_analysis": gap}


# ── 3. TAILOR RESUME ──────────────────────────────────────────────────────────
@app.post("/tailor-resume")
async def tailor_resume(req: TailorRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    profile = session.get("profile", {})

    system = """You are an expert ATS resume optimizer. Rewrite resume bullet points to perfectly match a job description.
Use strong action verbs (Built, Engineered, Led, Optimized, Deployed, Reduced).
Include JD keywords naturally. Quantify achievements. Keep each bullet under 20 words.
Return ONLY valid JSON."""

    user = f"""Resume Skills: {', '.join(profile.get('skills', [])[:15])}
Experience: {', '.join([e.get('title','') for e in profile.get('experience',[])])}
Resume excerpt: {session['resume_text'][:1500]}
Job Description: {req.job_description[:2000]}

Return JSON:
{{"ats_score_before":45,"ats_score_after":82,
  "key_matches":["keyword1","keyword2"],
  "missing_keywords":["kw1","kw2"],
  "tailored_bullets":["• Built scalable REST APIs using Node.js serving 50K+ daily requests","• Engineered React dashboard reducing page load time by 40%","• Implemented CI/CD pipeline cutting deploy time from 2hrs to 8mins"],
  "summary_statement":"Full Stack Developer with 2+ years...",
  "tips":["Add Docker to skills","Quantify project impact"]}}"""

    raw    = await ask_llm(system, user, temperature=0.3, max_tokens=1200, smart=True)
    result = safe_json(raw)
    if not result:
        result = {"tailored_bullets":["• "+l for l in raw.split("\n") if l.strip()][:5],
                  "ats_score_before":50,"ats_score_after":75,"key_matches":profile.get("skills",[])[:4],
                  "missing_keywords":[],"tips":["Review and customize these bullets."]}
    return result


# ── 4. GENERATE INTERVIEW QUESTIONS ──────────────────────────────────────────
@app.post("/generate-questions")
async def generate_questions(req: QuestionsRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    profile     = session.get("profile", {})
    gap         = session.get("gap", {})
    target_role = session.get("target_role", "Software Engineer")

    system = """You are a senior technical interviewer at a top tech company (FAANG level).
Generate realistic, challenging interview questions tailored to the candidate's background.
Mix: 2 technical questions + 1 behavioral. Make questions specific and thought-provoking.
Return ONLY a valid JSON array."""

    user = f"""Candidate: {profile.get('name','Candidate')}
Target Role: {target_role}
Their Skills: {', '.join(profile.get('skills', [])[:12])}
Their Gaps: {', '.join([g['skill'] for g in gap.get('gaps', [])[:4]])}
Experience: {', '.join([e.get('title','') for e in profile.get('experience', [])])}

Generate {req.num_questions} questions. Return JSON array:
[{{"id":1,"type":"technical","difficulty":"medium",
   "question":"Describe how you would architect a scalable URL shortener. Walk me through your design decisions.",
   "what_they_test":"System design + scalability thinking",
   "good_answer_hints":["Mention hashing approach","Discuss database choice","Talk about caching strategy"]}}]"""

    raw    = await ask_llm(system, user, temperature=0.5, max_tokens=1000, smart=True)
    result = safe_json(raw)
    if not isinstance(result, list):
        result = [{"id":1,"type":"technical","difficulty":"medium",
                   "question":f"Describe a challenging {target_role} project you built and the biggest technical obstacle you overcame.",
                   "what_they_test":"Problem solving + communication","good_answer_hints":["Be specific","Mention trade-offs","Quantify impact"]}]
    sessions[req.session_id]["current_questions"] = result
    return {"questions": result, "role": target_role}


# ── 5. EVALUATE ANSWER ────────────────────────────────────────────────────────
@app.post("/evaluate-answer")
async def evaluate_answer(req: EvaluateRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    target_role = session.get("target_role", "Software Engineer")
    profile     = session.get("profile", {})

    system = """You are a strict but fair technical interview evaluator at a top tech company.
Evaluate the candidate's answer with specific, actionable feedback.
Score honestly — a 10 requires an exceptional, complete answer with examples.
Return ONLY valid JSON."""

    user = f"""Role: {target_role}
Candidate skills: {', '.join(profile.get('skills', [])[:8])}
Question: {req.question}
Candidate's Answer: {req.answer}

Evaluate and return JSON:
{{"score":7,
  "score_breakdown":{{"technical_accuracy":7,"communication":8,"depth":6,"structure":7}},
  "verdict":"Good Answer",
  "strengths":["Mentioned correct approach","Good technical terms used"],
  "improvements":["Could mention edge cases","Lacked specific quantified examples"],
  "ideal_answer_summary":"A strong answer would include...",
  "follow_up_question":"How would you handle this at 10x the scale?"}}"""

    raw    = await ask_llm(system, user, temperature=0.2, max_tokens=800)
    result = safe_json(raw)
    if not result:
        result = {"score":6,"verdict":"Decent Answer",
                  "strengths":["Showed understanding of the concept"],
                  "improvements":["Add more specific examples","Mention trade-offs and alternatives"],
                  "ideal_answer_summary":"A strong answer includes specific technical details with real examples.",
                  "follow_up_question":"Can you elaborate with a real project example?",
                  "score_breakdown":{"technical_accuracy":6,"communication":7,"depth":5,"structure":6}}
    return result


# ── 6. GENERATE PORTFOLIO PROJECTS ────────────────────────────────────────────
@app.post("/generate-projects")
async def generate_projects(req: ProjectsRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    profile     = session.get("profile", {})
    gap         = session.get("gap", {})
    target_role = session.get("target_role", "Developer")

    system = """You are a senior engineer and career coach specializing in portfolio strategy.
Generate specific, buildable, impressive portfolio projects. Be very concrete.
Return ONLY valid JSON array."""

    user = f"""Candidate targeting: {target_role}
Current skills: {', '.join(profile.get('skills', [])[:12])}
Gaps to close: {', '.join([g['skill'] for g in gap.get('gaps', [])[:5]])}

Generate 2 impressive portfolio projects. Return JSON array:
[{{"title":"Real-Time Job Application Tracker",
   "tagline":"Full-stack app with AI insights",
   "difficulty":"Intermediate","time_to_build":"2-3 weeks",
   "tech_stack":["React","Node.js","PostgreSQL","Groq API"],
   "why_impressive":"Shows full-stack + AI integration",
   "gap_it_closes":"Docker, REST APIs",
   "steps":["Set up React frontend","Build Node.js REST API","Add PostgreSQL with Prisma","Integrate Groq AI","Dockerize and deploy"],
   "bonus_features":["Email notifications","Chrome extension"],
   "github_readme_tip":"Add live demo link and architecture diagram"}}]"""

    raw    = await ask_llm(system, user, temperature=0.7, max_tokens=1500, smart=True)
    result = safe_json(raw)
    if not isinstance(result, list):
        result = [{"title":f"{target_role} Portfolio App","tagline":"Showcase your skills",
                   "difficulty":"Intermediate","time_to_build":"3 weeks",
                   "tech_stack":profile.get("skills",["Python","React"])[:4],
                   "why_impressive":"Demonstrates your full skill set to employers",
                   "gap_it_closes":gap.get("missing_skills",["core skills"])[0] if gap.get("missing_skills") else "key skills",
                   "steps":["Plan architecture","Build backend API","Create frontend","Add tests","Deploy publicly"],
                   "bonus_features":["Add authentication","Write documentation"],
                   "github_readme_tip":"Include a live demo link and screenshots"}]
    sessions[req.session_id]["projects"] = result
    return {"projects": result}


# ── 7. GENERATE SCHEDULE ──────────────────────────────────────────────────────
@app.post("/generate-schedule")
async def generate_schedule(req: ScheduleRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    gap         = session.get("gap", {})
    target_role = session.get("target_role", "Developer")
    courses     = gap.get("courses", [])
    gaps_list   = [g["skill"] for g in gap.get("gaps", [])[:4]]

    system = """You are a learning coach creating realistic, structured study plans.
Be specific with daily tasks. Return ONLY valid JSON."""

    user = f"""Target role: {target_role}
Skills to learn: {', '.join(gaps_list)}
Recommended courses: {', '.join([c['title'] for c in courses])}

Create a 4-week schedule. Return JSON:
{{"title":"Your 4-Week {target_role} Roadmap","total_hours":48,
  "weeks":[{{"week":1,"theme":"Foundation","focus":"Core skills","daily_hours":2,
    "tasks":[{{"title":"Docker Fundamentals","description":"Complete Docker crash course","day_offset":1,"duration_hours":2,"type":"course"}}]}}],
  "milestones":[{{"week":2,"goal":"Complete first course"}},{{"week":4,"goal":"Submit 5 applications"}}]}}"""

    raw    = await ask_llm(system, user, temperature=0.4, max_tokens=1500, smart=True)
    result = safe_json(raw)
    if not result or "weeks" not in result:
        result = {"title":f"4-Week {target_role} Roadmap","total_hours":40,
                  "weeks":[{"week":i+1,"theme":f"Week {i+1}","focus":gaps_list[i] if i < len(gaps_list) else "Practice",
                             "daily_hours":2,"tasks":[{"title":f"Study {gaps_list[i] if i < len(gaps_list) else 'core skills'}",
                             "description":"Structured learning","day_offset":(i*7)+1,"duration_hours":2,"type":"course"}]}
                            for i in range(4)],
                  "milestones":[{"week":2,"goal":"Complete first course"},{"week":4,"goal":"Apply to 5 jobs"}]}
    ics_content = generate_ics(result.get("weeks", []))
    sessions[req.session_id]["schedule"] = result
    return {"schedule": result, "ics_download": ics_content}


# ── 8. FIND JOBS (NEW ★) ──────────────────────────────────────────────────────
@app.post("/find-jobs")
async def find_jobs(req: FindJobsRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    target_role = session.get("target_role", "Software Engineer")
    profile     = session.get("profile", {})
    gap         = session.get("gap", {})
    top_skills  = profile.get("skills", [])[:5]
    location    = req.location or session.get("preferences", {}).get("location", "India")

    # ── Try Adzuna real API first ──────────────────────────────────────────────
    if ADZUNA_APP_ID and ADZUNA_APP_KEY:
        try:
            country = "in"   # India
            query   = target_role.replace(" ", "+")
            loc     = location.replace(" ", "+")
            url = (
                f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
                f"?app_id={ADZUNA_APP_ID}&app_key={ADZUNA_APP_KEY}"
                f"&results_per_page={req.num_results}&what={query}&where={loc}"
                f"&content-type=application/json"
            )
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    data   = r.json()
                    jobs_raw = data.get("results", [])
                    jobs = []
                    for j in jobs_raw[:req.num_results]:
                        jobs.append({
                            "title":       j.get("title",""),
                            "company":     j.get("company", {}).get("display_name",""),
                            "location":    j.get("location", {}).get("display_name",""),
                            "salary":      f"£{j.get('salary_min',0):,.0f}–£{j.get('salary_max',0):,.0f}" if j.get("salary_min") else "Competitive",
                            "type":        "Full-time",
                            "logo":        "🏢",
                            "apply_url":   j.get("redirect_url","#"),
                            "posted":      "Recently",
                            "description": (j.get("description","")[:120]+"...") if j.get("description") else "",
                            "match":       max(70, gap.get("matchScore",70)),
                            "source":      "Adzuna"
                        })
                    if jobs:
                        return {"jobs": jobs, "source": "adzuna", "role": target_role, "location": location}
        except Exception:
            pass   # Fall through to mock

    # ── Smart mock fallback (personalised by role + match score) ─────────────
    base_jobs = MOCK_JOBS.get(target_role, DEFAULT_JOBS)
    match_score = gap.get("matchScore", 70)

    # Sort by match % relevance and personalise slightly
    jobs = []
    for j in base_jobs[:req.num_results]:
        personalized_match = min(99, j["match"] + (match_score - 70) // 5)
        jobs.append({**j, "match": max(50, personalized_match),
                     "skills_matched": top_skills[:3], "source": "mock"})

    jobs.sort(key=lambda x: x["match"], reverse=True)
    return {"jobs": jobs, "source": "mock", "role": target_role, "location": location,
            "tip": "Set ADZUNA_APP_ID + ADZUNA_APP_KEY in .env for live job data"}


# ── 9. AGENTIC CHAT ────────────────────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest):
    session = sessions.get(req.session_id)
    if not session: raise HTTPException(404, "Session not found.")
    profile     = session.get("profile", {})
    gap         = session.get("gap", {})
    target_role = session.get("target_role", "")
    history     = session.get("messages", [])
    hist_str    = "\n".join([f"{'User' if m['role']=='user' else 'Assistant'}: {m['content'][:200]}" for m in history[-6:]])

    system = f"""You are VidyaGuide, an elite AI career mentor.

Candidate: {profile.get('name','Student')} | Role: {target_role}
Skills: {', '.join(profile.get('skills',[])[:10])}
Top Gaps: {', '.join([g['skill'] for g in gap.get('gaps',[])[:4]])}
Match Score: {gap.get('matchScore','?')}%
Summary: {gap.get('summary','')}

Be specific, actionable, and encouraging. Reference their actual skills.
Keep responses under 150 words unless asked for detail.
Use **bold** for emphasis and bullet points when listing items."""

    user_msg  = f"{hist_str}\nUser: {req.message}" if hist_str else req.message
    reply     = await ask_llm(system, user_msg, temperature=0.5, max_tokens=400)
    if not reply:
        reply = f"Focus on learning {gap.get('gaps',[{}])[0].get('skill','required skills')} first. Start with a structured course this week."
    session["messages"] += [{"role":"user","content":req.message},{"role":"assistant","content":reply}]
    return {"reply": reply, "model": MODEL_NAME}


@app.get("/session/{sid}")
def get_session(sid: str):
    s = sessions.get(sid)
    if not s: raise HTTPException(404,"Not found.")
    return {"profile":s.get("profile",{}),"gap":s.get("gap",{}),"target_role":s.get("target_role","")}

@app.delete("/session/{sid}")
def clear_session(sid: str):
    if sid in sessions: del sessions[sid]
    return {"message":"Cleared."}