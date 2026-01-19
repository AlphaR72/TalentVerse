from flask import Flask, request, jsonify, make_response
import sqlite3
import json
import os
from datetime import datetime
import re
import random
import hashlib
from werkzeug.exceptions import HTTPException
import os, json, datetime

app = Flask(__name__)

# ======================
# CORS (Local Dev)
# ======================
LOCALHOST_ORIGIN_RE = re.compile(r"^http://(localhost|127\.0\.0\.1):\d+$")

@app.before_request
def handle_preflight():
    # Always return OK for preflight so the browser can continue
    if request.method == "OPTIONS":
        return make_response("", 200)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "")
    if origin and LOCALHOST_ORIGIN_RE.match(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"

    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Admin-Email"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    response.headers["Access-Control-Max-Age"] = "3600"
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    # Preserve correct HTTP codes for abort(404), etc.
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    return jsonify({"error": str(e)}), 500

# ======================
# Helpers
# ======================
def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def safe_json_loads(value, default):
    if value is None or value == "":
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except Exception:
        return default

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def is_admin_request():
    """
    Simple admin check for demo:
    Put admin email in env ADMIN_EMAIL (or fallback).
    Request must include header: X-Admin-Email
    """
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com").lower()
    req_email = (request.headers.get("X-Admin-Email") or "").lower().strip()
    return req_email != "" and req_email == admin_email

def ensure_user(firebase_uid, email=None):
    """Create user if not exists, return user_id (schema-compatible)."""
    if not firebase_uid or not isinstance(firebase_uid, str) or len(firebase_uid) < 3:
        raise ValueError("Invalid firebase_uid")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
        user = cursor.fetchone()
        if user:
            return user["id"]

        # Insert with new schema if available; fallback for old schema
        try:
            cursor.execute(
                "INSERT INTO users (firebase_uid, email, role, coach_level, created_at) VALUES (?, ?, 'user', NULL, ?)",
                (firebase_uid, (email or "").strip(), now_iso()),
            )
        except sqlite3.OperationalError:
            cursor.execute(
                "INSERT INTO users (firebase_uid, email) VALUES (?, ?)",
                (firebase_uid, (email or "").strip()),
            )

        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

# ======================
# Init DB
# ======================
def init_db():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                firebase_uid TEXT UNIQUE,
                email TEXT,
                role TEXT DEFAULT 'user',
                coach_level TEXT DEFAULT NULL,
                created_at TEXT
            )
        """)

        # Safe migration for older DBs
        existing_cols = [row["name"] for row in conn.execute("PRAGMA table_info(users)")]
        if "role" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
        if "coach_level" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN coach_level TEXT DEFAULT NULL")
        if "created_at" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN created_at TEXT")

        # personality
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS personality (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                learning_style TEXT,
                decision_style TEXT,
                work_preference TEXT,
                motivation_state TEXT,
                clarity_level TEXT,
                mbti_type TEXT,
                mbti_scores TEXT,
                mbti_answers TEXT,
                mbti_percentages TEXT,
                user_id INTEGER UNIQUE,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        # analysis
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                strengths TEXT,
                gaps TEXT,
                direction TEXT,
                user_id INTEGER UNIQUE,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        # profile
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                display_name TEXT,
                avatar TEXT,
                bio TEXT,
                interests TEXT,
                user_id INTEGER UNIQUE,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        # project progress
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS project_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                project_id TEXT,
                progress INTEGER,
                tasks TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        # Big Five
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS big5 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                scores TEXT,
                answers TEXT,
                result TEXT,
                created_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        # Coach Applications
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS coach_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                full_name TEXT,
                email TEXT,
                field TEXT,
                years_experience TEXT,
                linkedin TEXT,
                github TEXT,
                portfolio TEXT,
                bio TEXT,
                motivation TEXT,
                availability_hours TEXT,
                status TEXT,
                created_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)

        conn.commit()
    finally:
        conn.close()

# ======================
# Personality
# ======================
@app.route("/personality", methods=["POST"])
def save_personality():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    email = data.get("email")

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    user_id = ensure_user(firebase_uid, email)

    required = ["learning_style", "decision_style", "work_preference", "motivation_state", "clarity_level"]
    for k in required:
        if k not in data:
            return jsonify({"error": f"Missing {k}"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Upsert personality by user_id UNIQUE
        cursor.execute("SELECT id FROM personality WHERE user_id = ?", (user_id,))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("""
                UPDATE personality SET
                    learning_style=?, decision_style=?, work_preference=?,
                    motivation_state=?, clarity_level=?
                WHERE user_id=?
            """, (
                data["learning_style"],
                data["decision_style"],
                data["work_preference"],
                data["motivation_state"],
                data["clarity_level"],
                user_id
            ))
        else:
            cursor.execute("""
                INSERT INTO personality (
                    learning_style, decision_style, work_preference,
                    motivation_state, clarity_level, user_id
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                data["learning_style"],
                data["decision_style"],
                data["work_preference"],
                data["motivation_state"],
                data["clarity_level"],
                user_id
            ))

        conn.commit()
        return jsonify({"status": "personality_saved"})
    finally:
        conn.close()

@app.route("/personality/<firebase_uid>", methods=["GET"])
def get_personality(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.learning_style, p.decision_style, p.work_preference,
                   p.motivation_state, p.clarity_level, p.mbti_type,
                   p.mbti_scores, p.mbti_answers, p.mbti_percentages
            FROM personality p
            JOIN users u ON p.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No personality"}), 404

        result = dict(row)
        result["mbti_scores"] = safe_json_loads(result.get("mbti_scores"), {})
        result["mbti_answers"] = safe_json_loads(result.get("mbti_answers"), {})
        result["mbti_percentages"] = safe_json_loads(result.get("mbti_percentages"), {})
        return jsonify(result)
    finally:
        conn.close()

# ======================
# Big Five
# ======================
@app.route("/save-big5", methods=["POST"])
def save_big5():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    email = data.get("email")

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    # Accept both legacy payload and current frontend payload
    # Legacy: {scores, answers, result}
    # Current FE: {scores_sum, scores_percent, answers, label, model}
    scores = data.get("scores", {}) or {}
    answers = data.get("answers", {}) or {}
    result = data.get("result", {}) or {}

    if not scores and (data.get("scores_sum") or data.get("scores_percent") or data.get("label")):
        scores = {
            "sum": data.get("scores_sum") or {},
            "percent": data.get("scores_percent") or {},
            "model": data.get("model") or "big5_v1",
        }
        result = {
            "label": data.get("label") or "",
            "percent": data.get("scores_percent") or {},
        }

    user_id = ensure_user(firebase_uid, email)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM big5 WHERE user_id = ?", (user_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE big5
                SET scores = ?, answers = ?, result = ?, created_at = ?
                WHERE user_id = ?
            """, (
                json.dumps(scores),
                json.dumps(answers),
                json.dumps(result),
                now_iso(),
                user_id
            ))
        else:
            cursor.execute("""
                INSERT INTO big5 (user_id, scores, answers, result, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                user_id,
                json.dumps(scores),
                json.dumps(answers),
                json.dumps(result),
                now_iso()
            ))

        conn.commit()
        return jsonify({"status": "big5_saved"})
    finally:
        conn.close()

@app.route("/big5/<firebase_uid>", methods=["GET"])
def get_big5(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT b.scores, b.answers, b.result, b.created_at
            FROM big5 b
            JOIN users u ON b.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No big5"}), 404

        return jsonify({
            "scores": safe_json_loads(row["scores"], {}),
            "answers": safe_json_loads(row["answers"], {}),
            "result": safe_json_loads(row["result"], {}),
            "created_at": row["created_at"]
        })
    finally:
        conn.close()

# ======================
# Profile
# ======================
@app.route("/profile", methods=["POST"])
def save_profile():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    user_id = ensure_user(firebase_uid, data.get("email"))

    display_name = (data.get("display_name") or "").strip()
    avatar = (data.get("avatar") or "").strip()
    bio = (data.get("bio") or "").strip()
    interests = data.get("interests", [])

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM profile WHERE user_id = ?", (user_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE profile SET display_name=?, avatar=?, bio=?, interests=?
                WHERE user_id=?
            """, (display_name, avatar, bio, json.dumps(interests), user_id))
        else:
            cursor.execute("""
                INSERT INTO profile (display_name, avatar, bio, interests, user_id)
                VALUES (?, ?, ?, ?, ?)
            """, (display_name, avatar, bio, json.dumps(interests), user_id))

        conn.commit()
        return jsonify({"status": "profile_saved"})
    finally:
        conn.close()

@app.route("/profile/<firebase_uid>", methods=["GET"])
def get_profile(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.display_name, p.avatar, p.bio, p.interests
            FROM profile p
            JOIN users u ON p.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No profile"}), 404

        return jsonify({
            "display_name": row["display_name"],
            "avatar": row["avatar"],
            "bio": row["bio"],
            "interests": safe_json_loads(row["interests"], [])
        })
    finally:
        conn.close()

# ======================
# Analysis
# ======================
ANALYSIS_MAP = {
    "frontend": {
        "beginner": {
            "strengths": ["HTML", "CSS"],
            "gaps": ["JavaScript", "React"],
            "direction": "Junior Frontend Developer"
        },
        "intermediate": {
            "strengths": ["HTML", "CSS", "JavaScript"],
            "gaps": ["React Advanced", "TypeScript", "Testing"],
            "direction": "Frontend Developer"
        }
    },
    "fullstack": {
        "beginner": {
            "strengths": ["HTML", "CSS"],
            "gaps": ["JavaScript", "React", "Node.js"],
            "direction": "Junior Fullstack Developer"
        }
    }
}

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    email = data.get("email")

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    field = (data.get("field") or "").lower().strip()
    level = (data.get("level") or "").lower().strip()

    user_id = ensure_user(firebase_uid, email)

    analysis_result = ANALYSIS_MAP.get(field, {}).get(level, {
        "strengths": ["General programming"],
        "gaps": ["Core concepts"],
        "direction": "General Developer"
    })

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Upsert analysis (user_id UNIQUE)
        cursor.execute("SELECT id FROM analysis WHERE user_id = ?", (user_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE analysis SET strengths=?, gaps=?, direction=?
                WHERE user_id=?
            """, (
                json.dumps(analysis_result["strengths"]),
                json.dumps(analysis_result["gaps"]),
                analysis_result["direction"],
                user_id
            ))
        else:
            cursor.execute("""
                INSERT INTO analysis (strengths, gaps, direction, user_id)
                VALUES (?, ?, ?, ?)
            """, (
                json.dumps(analysis_result["strengths"]),
                json.dumps(analysis_result["gaps"]),
                analysis_result["direction"],
                user_id
            ))

        conn.commit()
        return jsonify(analysis_result)
    finally:
        conn.close()

@app.route("/analysis/<firebase_uid>", methods=["GET"])
def get_analysis(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.strengths, a.gaps, a.direction
            FROM analysis a
            JOIN users u ON a.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No analysis"}), 404

        return jsonify({
            "strengths": safe_json_loads(row["strengths"], []),
            "gaps": safe_json_loads(row["gaps"], []),
            "direction": row["direction"]
        })
    finally:
        conn.close()

# ======================
# Projects suggested from analysis
# ======================
@app.route("/projects/<firebase_uid>", methods=["GET"])
def projects(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.gaps, p.learning_style, p.motivation_state
            FROM users u
            JOIN analysis a ON a.user_id = u.id
            LEFT JOIN personality p ON p.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No data"}), 404

        gaps = safe_json_loads(row["gaps"], [])
        motivation = row["motivation_state"] or "medium"
        learning_style = row["learning_style"] or "guided"

        projects_list = []
        for gap in gaps:
            projects_list.append({
                "title": f"{gap} Mini Project",
                "description": f"Practice {gap} ({learning_style})",
                "difficulty": "Very Easy" if motivation == "low" else "Easy",
                "estimated_time": "3 days" if motivation == "low" else "1 week"
            })

        return jsonify({"projects": projects_list})
    finally:
        conn.close()

# ======================
# Matching
# ======================
@app.route("/matching/<firebase_uid>", methods=["GET"])
def matching(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.work_preference, p.clarity_level, a.direction
            FROM users u
            JOIN personality p ON p.user_id = u.id
            JOIN analysis a ON a.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        row = cursor.fetchone()

        if not row:
            return jsonify({"error": "No data"}), 404

        matches = []
        if row["clarity_level"] == "lost":
            matches.append({"type": "Coach", "reason": "You need guidance and clarity"})
        if row["work_preference"] in ["peer", "mentor"]:
            matches.append({"type": "Peer", "reason": "Learning together boosts progress"})

        return jsonify({"matches": matches})
    finally:
        conn.close()

# ==========================
# AI Coach Route (Paste into app.py)
# ==========================


try:
    from openai import OpenAI  # pip install openai
    _OPENAI_AVAILABLE = True
except Exception:
    _OPENAI_AVAILABLE = False

def _daily_seed(uid: str) -> str:
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    return f"{uid}:{today}"

def _safe_json(v, default):
    if v is None:
        return default
    if isinstance(v, (dict, list)):
        return v
    try:
        return json.loads(v)
    except Exception:
        return default

def _infer_intent(msg: str) -> str:
    m = (msg or "").lower()
    if any(k in m for k in ["خطة أسبوع", "weekly", "أسبوع"]): return "weekly_plan"
    if any(k in m for k in ["مشروع", "project", "فكرة مشروع"]): return "suggest_project"
    if any(k in m for k in ["أتعلم", "تعلم", "learn", "دراسة"]): return "learn_now"
    if any(k in m for k in ["أولويات", "رتب", "priorit"]): return "priorities"
    if any(k in m for k in ["5 أسئلة", "تشخيص", "diagnose"]): return "diagnose"
    return "chat"

def _coach_persona():
    return (
        "أنت AI Coach داخل منصة TalentVerse لمتعددي المواهب الضايعين بالأولويات.\n"
        "هدفك: تحويل الضياع إلى أولوية واضحة + خطة أسبوع + مشروع مناسب + خطوة اليوم.\n"
        "لا تعطي نصائح عامة فارغة. لا تخرج عن سياق TalentVerse.\n"
        "إذا المستخدم عالق أو عم يعيد نفس المشكلة، اقترح حلول داخل المنصة: Matching للأقران أو Coach Apply.\n"
        "أسلوبك: مختصر، عملي، داعم. اسأل 1-2 سؤال فقط إذا يلزم.\n"
        "أعطِ مخرجات قابلة للتنفيذ."
    )

def _fetch_context(uid: str):
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute("SELECT display_name, avatar, bio, interests FROM profile WHERE firebase_uid = ?", (uid,))
        prow = cur.fetchone()
        profile = dict(prow) if prow else {}
        profile["interests"] = _safe_json(profile.get("interests"), {})

        cur.execute("SELECT direction, gaps, strengths FROM analysis WHERE firebase_uid = ? ORDER BY id DESC LIMIT 1", (uid,))
        arow = cur.fetchone()
        analysis = dict(arow) if arow else {}
        analysis["gaps"] = _safe_json(analysis.get("gaps"), [])
        analysis["strengths"] = _safe_json(analysis.get("strengths"), [])

        cur.execute("SELECT big5_percent, label FROM big5 WHERE firebase_uid = ? ORDER BY id DESC LIMIT 1", (uid,))
        brow = cur.fetchone()
        big5 = dict(brow) if brow else {}
        big5["big5_percent"] = _safe_json(big5.get("big5_percent"), {})

        cur.execute("SELECT project_id, progress, updated_at FROM project_progress WHERE firebase_uid = ? ORDER BY updated_at DESC LIMIT 6", (uid,))
        rows = cur.fetchall()
        progress = [dict(r) for r in rows] if rows else []
        for p in progress:
            p["progress"] = _safe_json(p.get("progress"), {})

        return {"profile": profile, "analysis": analysis, "big5": big5, "progress": progress}
    finally:
        conn.close()

def _stuck_detect(history):
    # إذا آخر 3 رسائل user فيها كلمات تدل على عجز/تكرار
    user_texts = [m.get("content","") for m in (history or []) if m.get("role") == "user"][-3:]
    if len(user_texts) < 3: return False
    j = " ".join(user_texts).lower()
    return any(k in j for k in ["ضايع", "ما بعرف", "محتار", "مو قادر", "ما عم استفيد", "تعبت", "زهقان"])

def _fallback_response(message, ctx, intent, history):
    profile = ctx.get("profile", {})
    meta = profile.get("interests", {}) if isinstance(profile.get("interests"), dict) else {}
    skills = meta.get("skills") or []
    interests = meta.get("interests") or []
    direction = ctx.get("analysis", {}).get("direction") or ""
    gaps = ctx.get("analysis", {}).get("gaps") or []

    stuck = _stuck_detect(history)
    name = profile.get("display_name") or "صديقي"

    priorities = []
    if direction: priorities.append(f"ثبّت اتجاهك: {direction}")
    if gaps: priorities.append(f"سدّ أكبر فجوة: {gaps[0]}")
    if skills: priorities.append(f"استثمر مهاراتك: {', '.join(skills[:3])}")
    if not priorities: priorities = ["حدد هدف 3 أسابيع", "اختر مهارتين", "طبّق بمشروع صغير"]

    suggestions = [
      {"label":"تشخيص سريع","message":"اسألني 5 أسئلة فقط وبعدين أعطني خطة.","intent":"diagnose"},
      {"label":"خطة أسبوع","message":"اعمل لي خطة أسبوع عملية.","intent":"weekly_plan"},
      {"label":"اقترح مشروع","message":"اقترح مشروع مناسب لمهاراتي.","intent":"suggest_project"},
      {"label":"شو أتعلم؟","message":"شو أتعلم الآن بالضبط؟","intent":"learn_now"},
    ]
    if stuck:
      suggestions.insert(0, {"label":"جرّب Matching للأقران","type":"navigate","to":"/matching"})
      suggestions.insert(1, {"label":"قدّم على كوتش","type":"navigate","to":"/coach-apply"})

    return {
      "assistant_message": f"تمام يا {name}. خلّينا نشتغل ضمن TalentVerse بخطوة واضحة اليوم.",
      "intent": intent,
      "priorities": priorities[:5],
      "today_task": f"مهمة اليوم ({_daily_seed(profile.get('display_name','u'))[-10:]}): اكتب هدفك + 3 نتائج قابلة للقياس.",
      "weekly_plan": {"days":[
        {"day":"Sat","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
        {"day":"Sun","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
        {"day":"Mon","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
        {"day":"Tue","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
        {"day":"Wed","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
        {"day":"Thu","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
        {"day":"Fri","tasks":["60 دقيقة تعلم","45 دقيقة تطبيق","15 دقيقة تلخيص"]},
      ]},
      "suggestions": suggestions[:6],
      "safety": {"flagged": False},
    }

@app.post("/ai/coach")
def ai_coach():
    body = request.get_json(silent=True) or {}
    uid = body.get("firebase_uid")
    email = body.get("email")
    message = (body.get("message") or "").strip()
    intent = (body.get("intent") or "").strip()
    history = body.get("history") or []

    if not uid or not message:
        return jsonify({"error": "firebase_uid and message are required"}), 400

    # ensure user exists
    conn = get_conn()
    try:
        ensure_user(conn, uid, email)
    finally:
        conn.close()

    if not intent:
        intent = _infer_intent(message)

    ctx = _fetch_context(uid)

    # --- OpenAI real call (optional) ---
    api_key = os.environ.get("OPENAI_API_KEY")
    if not (_OPENAI_AVAILABLE and api_key):
        return jsonify(_fallback_response(message, ctx, intent, history)), 200

    client = OpenAI(api_key=api_key)

    # compact context passed to the model (personalization)
    profile = ctx.get("profile", {})
    meta = profile.get("interests", {}) if isinstance(profile.get("interests"), dict) else {}
    context_obj = {
        "display_name": profile.get("display_name"),
        "bio": profile.get("bio"),
        "skills": meta.get("skills", []),
        "interests": meta.get("interests", []),
        "analysis": ctx.get("analysis", {}),
        "big5": ctx.get("big5", {}),
        "progress": ctx.get("progress", []),
        "daily_seed": _daily_seed(uid),
        "intent": intent
    }

    # IMPORTANT: the model must return suggestions[] too (dynamic buttons)
    prompt_user = f"""
رسالة المستخدم: {message}

أرجع JSON فقط بالشكل التالي:
{{
  "assistant_message": "...",
  "intent": "{intent}",
  "priorities": ["...", "..."],
  "today_task": "...",
  "weekly_plan": {{"days":[{{"day":"Sat","tasks":["..."]}}]}},
  "suggestions": [
    {{"label":"...", "message":"...", "intent":"..."}},
    {{"label":"...", "type":"navigate", "to":"/matching"}}
  ],
  "safety": {{"flagged": false}}
}}
"""

    resp = client.responses.create(
        model=os.environ.get("OPENAI_MODEL", "gpt-4.1-mini"),
        input=[
            {"role":"system","content": _coach_persona()},
            {"role":"system","content": "Context(JSON): " + json.dumps(context_obj, ensure_ascii=False)},
            *history[-10:],
            {"role":"user","content": prompt_user}
        ],
        temperature=0.7,
    )

    text = getattr(resp, "output_text", "") or ""
    try:
        data = json.loads(text)
    except Exception:
        data = _fallback_response(message, ctx, intent, history)

    # enforce “stuck” suggestion from server too (حتى لو الموديل ما اقترح)
    if _stuck_detect(history):
        data.setdefault("suggestions", [])
        data["suggestions"] = [
            {"label":"جرّب Matching للأقران","type":"navigate","to":"/matching"},
            {"label":"قدّم على كوتش","type":"navigate","to":"/coach-apply"},
            *data["suggestions"]
        ][:6]

    return jsonify(data), 200


# ======================
# AI Coach (Rule-based "AI" for MVP)
# ======================
def _stable_daily_rng(firebase_uid: str) -> random.Random:
    day = datetime.utcnow().strftime("%Y-%m-%d")
    seed_src = f"{firebase_uid}:{day}".encode("utf-8")
    seed = int(hashlib.sha256(seed_src).hexdigest()[:12], 16)
    return random.Random(seed)


def _fetch_user_bundle(firebase_uid: str):
    """Fetch everything AI needs in one place."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, firebase_uid, email, role, coach_level, created_at FROM users WHERE firebase_uid = ?", (firebase_uid,))
        u = cursor.fetchone()
        if not u:
            return None
        user_id = u["id"]

        cursor.execute("SELECT display_name, avatar, bio, interests FROM profile WHERE user_id = ?", (user_id,))
        p = cursor.fetchone()

        cursor.execute("SELECT strengths, gaps, direction FROM analysis WHERE user_id = ?", (user_id,))
        a = cursor.fetchone()

        cursor.execute("SELECT learning_style, decision_style, work_preference, motivation_state, clarity_level FROM personality WHERE user_id = ?", (user_id,))
        pers = cursor.fetchone()

        cursor.execute("SELECT scores, result, created_at FROM big5 WHERE user_id = ?", (user_id,))
        b5 = cursor.fetchone()

        cursor.execute("SELECT project_id, progress, tasks FROM project_progress WHERE user_id = ? ORDER BY id DESC LIMIT 12", (user_id,))
        prog = cursor.fetchall() or []

        profile_meta = safe_json_loads(p["interests"], {}) if p else {}
        if not isinstance(profile_meta, dict):
            profile_meta = {"interests": profile_meta}

        return {
            "user": dict(u),
            "profile": {
                "display_name": (p["display_name"] if p else "") or "",
                "avatar": (p["avatar"] if p else "") or "",
                "bio": (p["bio"] if p else "") or "",
                "meta": profile_meta,
            },
            "analysis": {
                "strengths": safe_json_loads(a["strengths"], []) if a else [],
                "gaps": safe_json_loads(a["gaps"], []) if a else [],
                "direction": (a["direction"] if a else "") or "",
            },
            "personality": dict(pers) if pers else {},
            "big5": {
                "scores": safe_json_loads(b5["scores"], {}) if b5 else {},
                "result": safe_json_loads(b5["result"], {}) if b5 else {},
                "created_at": (b5["created_at"] if b5 else "") or "",
            },
            "progress": [
                {
                    "project_id": r["project_id"],
                    "progress": r["progress"],
                    "tasks": safe_json_loads(r["tasks"], []),
                }
                for r in prog
            ],
        }
    finally:
        conn.close()


def _big5_style(bundle, override_percent=None, override_label=None):
    """Return a compact style profile used by the planner."""
    percent = override_percent or bundle.get("big5", {}).get("result", {}).get("percent")
    if not isinstance(percent, dict):
        # maybe stored as scores.percent
        percent = bundle.get("big5", {}).get("scores", {}).get("percent")
    if not isinstance(percent, dict):
        percent = {}

    def get(k):
        try:
            return int(percent.get(k, 0))
        except Exception:
            return 0

    O = get("O")
    C = get("C")
    E = get("E")
    A = get("A")
    N = get("N")

    label = override_label or bundle.get("big5", {}).get("result", {}).get("label") or ""
    if not label and isinstance(bundle.get("big5", {}).get("scores", {}), dict):
        label = (bundle.get("big5", {}).get("scores", {}).get("label") or "")

    return {
        "label": label,
        "O": O,
        "C": C,
        "E": E,
        "A": A,
        "N": N,
        "creative": O >= 65,
        "structured": C >= 60,
        "social": E >= 60,
        "sensitive": N >= 65,
    }


def _pick_focus(bundle, rng: random.Random):
    gaps = bundle.get("analysis", {}).get("gaps") or []
    gaps = [g for g in gaps if isinstance(g, str) and g.strip()]
    if gaps:
        return gaps[0]
    # fallback: infer from profile skills/interests
    meta = bundle.get("profile", {}).get("meta") or {}
    skills = meta.get("skills") or []
    interests = meta.get("interests") or []
    pool = []
    for x in (skills + interests):
        if isinstance(x, str) and x.strip():
            pool.append(x.strip())
    return rng.choice(pool) if pool else "Foundations"


def _generate_priorities(bundle, style, rng: random.Random):
    gaps = bundle.get("analysis", {}).get("gaps") or []
    strengths = bundle.get("analysis", {}).get("strengths") or []
    direction = (bundle.get("analysis", {}).get("direction") or "").strip() or "General Developer"

    meta = bundle.get("profile", {}).get("meta") or {}
    skills = meta.get("skills") or []
    interests = meta.get("interests") or []

    # Build a ranked list (not static: depends on user data + daily seed)
    items = []
    for g in gaps[:8]:
        if isinstance(g, str) and g.strip():
            items.append({"item": g.strip(), "why": "It shows up as a gap in your analysis."})

    # add 1–2 "leverage" items
    leverage_pool = [s for s in strengths if isinstance(s, str) and s.strip()] + [s for s in skills if isinstance(s, str) and s.strip()]
    rng.shuffle(leverage_pool)
    for s in leverage_pool[:2]:
        items.append({"item": f"Leverage: {s}", "why": "Use this strength to build faster and stay motivated."})

    # add 1 curiosity item
    curiosity_pool = [i for i in interests if isinstance(i, str) and i.strip()]
    if curiosity_pool:
        items.append({"item": rng.choice(curiosity_pool).strip(), "why": "It matches your interests, so consistency will be easier."})

    # Clean + unique
    seen = set()
    uniq = []
    for it in items:
        key = it["item"].lower()
        if key in seen:
            continue
        seen.add(key)
        uniq.append(it)

    # Style adjustments
    constraints = []
    if style.get("sensitive"):
        constraints.append("Keep sessions short to reduce stress (25–45min).")
    if not style.get("structured"):
        constraints.append("Use checklists and tiny milestones to avoid feeling lost.")
    if style.get("structured"):
        constraints.append("Track progress daily (even 1 small checkmark).")

    return {
        "direction": direction,
        "priorities": uniq[:5] if uniq else [{"item": "Foundations", "why": "Start with basics to unlock everything else."}],
        "constraints": constraints,
    }


def _generate_weekly_plan(bundle, style, rng: random.Random):
    focus = _pick_focus(bundle, rng)
    direction = (bundle.get("analysis", {}).get("direction") or "").strip() or "General Developer"

    # effort scaling
    if style.get("structured") and not style.get("sensitive"):
        daily_minutes = rng.choice([60, 75, 90])
    elif style.get("sensitive"):
        daily_minutes = rng.choice([25, 30, 40, 45])
    else:
        daily_minutes = rng.choice([35, 45, 60])

    # Plan skeleton
    plan = []
    day_templates = [
        ("Learn", ["Read/watch a focused resource", "Take short notes", "Do 3 micro-exercises"]),
        ("Practice", ["Solve 5 targeted exercises", "Fix 2 mistakes", "Write 1 short summary"]),
        ("Build", ["Create a tiny feature", "Commit your progress", "Write what you learned"]),
        ("Build", ["Add 1 more feature", "Refactor 1 part", "Test the happy path"]),
        ("Project", ["Finish MVP", "Polish UI/logic", "Prepare a short demo"]),
        ("Review", ["Review mistakes", "Write an improvement list", "Plan next week"]),
        ("Recover", ["Light reading", "Organize notes", "Rest & reflect"]),
    ]
    rng.shuffle(day_templates)

    for i in range(7):
        mode, steps = day_templates[i]
        plan.append({
            "day": i + 1,
            "mode": mode,
            "focus": focus,
            "time_minutes": daily_minutes,
            "steps": steps,
        })

    return {
        "direction": direction,
        "focus": focus,
        "daily_minutes": daily_minutes,
        "days": plan,
    }


def _project_templates():
    return [
        {
            "key": "portfolio-dashboard",
            "title": "Personal Progress Dashboard",
            "goal": "Track your learning + projects in one place.",
            "stack": ["React", "Flask", "SQLite"],
            "milestones": [
                {"title": "MVP UI", "tasks": ["Dashboard layout", "Cards for stats", "Navigation"]},
                {"title": "Backend API", "tasks": ["Create endpoints", "Validate inputs", "Store progress"]},
                {"title": "Polish", "tasks": ["Loading states", "Error states", "Nice transitions"]},
            ],
        },
        {
            "key": "mini-project-recommender",
            "title": "Course + Project Recommender",
            "goal": "Given profile + analysis, recommend next course & a mini-project.",
            "stack": ["React", "Flask"],
            "milestones": [
                {"title": "Inputs", "tasks": ["Profile form", "Save user meta", "Basic validation"]},
                {"title": "Scoring", "tasks": ["Rank items", "Explain why", "Add filters"]},
                {"title": "Demo", "tasks": ["Seed sample data", "Show results", "Export plan"]},
            ],
        },
        {
            "key": "collab-planner",
            "title": "Collaboration Planner",
            "goal": "Plan tasks with peers and track progress asynchronously.",
            "stack": ["React", "Flask", "SQLite"],
            "milestones": [
                {"title": "Project room", "tasks": ["Create room", "Invite placeholder", "Room notes"]},
                {"title": "Tasks", "tasks": ["Milestones list", "Task checklist", "Save progress"]},
                {"title": "Insights", "tasks": ["Weekly summary", "Bottlenecks", "Next actions"]},
            ],
        },
    ]


def _suggest_project(bundle, style, rng: random.Random):
    focus = _pick_focus(bundle, rng)
    direction = (bundle.get("analysis", {}).get("direction") or "").strip() or "General Developer"
    templates = _project_templates()

    # Choose template depending on what user lacks
    progress = bundle.get("progress", []) or []
    has_any_progress = any((p.get("progress", 0) or 0) > 0 for p in progress)

    if not has_any_progress:
        chosen = templates[0]
    else:
        chosen = rng.choice(templates)

    # Personalize title slightly
    title = chosen["title"]
    if focus and isinstance(focus, str) and focus.strip() and focus.lower() not in title.lower():
        title = f"{title} ({focus})"

    # Difficulty guess
    difficulty = "Beginner" if not style.get("structured") else rng.choice(["Beginner", "Intermediate"])
    if style.get("structured") and not style.get("sensitive"):
        est_days = rng.choice([7, 10, 14])
    elif style.get("sensitive"):
        est_days = rng.choice([10, 14])
    else:
        est_days = rng.choice([7, 10])

    return {
        "direction": direction,
        "focus": focus,
        "project": {
            "title": title,
            "goal": chosen["goal"],
            "difficulty": difficulty,
            "estimated_days": est_days,
            "stack": chosen["stack"],
            "milestones": chosen["milestones"],
        },
    }


def _learn_now(bundle, style, rng: random.Random):
    gaps = bundle.get("analysis", {}).get("gaps") or []
    direction = (bundle.get("analysis", {}).get("direction") or "").strip() or "General Developer"

    # Reuse COURSE_CATALOG ranking logic
    ranked = []
    for c in COURSE_CATALOG:
        sc = course_score(c, gaps, None, direction)
        item = dict(c)
        item["_score"] = sc
        ranked.append(item)
    ranked.sort(key=lambda x: x.get("_score", 0), reverse=True)

    top = ranked[:3]
    for t in top:
        t.pop("_score", None)

    focus = _pick_focus(bundle, rng)
    micro_steps = [
        f"Spend 20–30min understanding the core ideas of {focus}.",
        f"Do 3–5 small exercises about {focus}.",
        f"Build a tiny feature using {focus}.",
        "Write 5 bullet points of what you learned.",
    ]

    if style.get("sensitive"):
        micro_steps.insert(0, "Start with 10 minutes فقط — الهدف كسر الجمود.")

    return {
        "direction": direction,
        "focus": focus,
        "recommended_courses": top,
        "micro_steps": micro_steps,
    }


def _daily_checkin(bundle, style, rng: random.Random):
    focus = _pick_focus(bundle, rng)
    progress = bundle.get("progress", []) or []
    latest = progress[0] if progress else None
    progress_line = "No project progress yet — today is a great day to start a tiny MVP." if not latest else f"Latest: {latest.get('project_id')} — {latest.get('progress', 0)}%"

    advice_pool = [
        "Pick one tiny task and finish it before you start anything else.",
        "If you feel lost, write a 3-step plan: Learn → Practice → Build.",
        "Don’t optimize early. Build the smallest version that works.",
        "Keep a simple log: what I did / what blocked me / next step.",
    ]
    if style.get("sensitive"):
        advice_pool += [
            "Use a 25-minute timer, then stop. Momentum beats intensity.",
            "Lower the bar: ‘show up’ is the win today.",
        ]
    if style.get("structured"):
        advice_pool += ["Turn your goal into checkboxes. Checkboxes reduce anxiety."]

    rng.shuffle(advice_pool)
    advice = advice_pool[:3]

    reminder = rng.choice([
        "Reminder: 1 small commit today > 0 perfect plans.",
        "Reminder: finish one task, then reward yourself.",
        "Reminder: if stuck for 15min, write the question and move on.",
    ])

    metric = rng.choice([
        "minutes_done",
        "tasks_checked",
        "one_commit",
        "one_note",
    ])

    return {
        "focus": focus,
        "progress": progress_line,
        "advice": advice,
        "reminder": reminder,
        "metric": metric,
    }


def _render_reply(action: str, payload: dict):
    # Keep replies readable for chat UI too.
    if action == "priorities":
        lines = [f"Direction: {payload.get('direction','')}", "Top priorities:"]
        for i, p in enumerate(payload.get("priorities", []), 1):
            lines.append(f"{i}) {p.get('item')} — {p.get('why')}")
        if payload.get("constraints"):
            lines.append("Constraints:")
            for c in payload["constraints"]:
                lines.append(f"- {c}")
        return "\n".join(lines)

    if action == "weekly_plan":
        lines = [f"Weekly plan — focus: {payload.get('focus','')}", f"Daily time: {payload.get('daily_minutes',0)} min"]
        for d in payload.get("days", []):
            lines.append(f"Day {d.get('day')}: {d.get('mode')} ({d.get('time_minutes')}m) — {', '.join(d.get('steps', []))}")
        return "\n".join(lines)

    if action == "project":
        proj = payload.get("project", {})
        lines = [f"Suggested project: {proj.get('title','')}", f"Goal: {proj.get('goal','')}", f"Difficulty: {proj.get('difficulty','')} — ~{proj.get('estimated_days','?')} days"]
        if proj.get("stack"):
            lines.append("Stack: " + ", ".join(proj.get("stack")))
        for i, m in enumerate(proj.get("milestones", []), 1):
            lines.append(f"Milestone {i}: {m.get('title')}")
            for t in m.get("tasks", []):
                lines.append(f"  - {t}")
        return "\n".join(lines)

    if action == "learn_now":
        lines = [f"Learn now — focus: {payload.get('focus','')}", "Micro-steps:"]
        for s in payload.get("micro_steps", []):
            lines.append(f"- {s}")
        courses = payload.get("recommended_courses", [])
        if courses:
            lines.append("Top resources:")
            for c in courses:
                lines.append(f"- {c.get('title')} ({c.get('provider')})")
        return "\n".join(lines)

    if action == "daily":
        lines = [f"Today focus: {payload.get('focus','')}", payload.get("progress", "")]
        lines.append("Advice:")
        for a in payload.get("advice", []):
            lines.append(f"- {a}")
        lines.append(payload.get("reminder", ""))
        lines.append(f"Track: {payload.get('metric','')}")
        return "\n".join([l for l in lines if l])

    # fallback
    return payload.get("summary") or "I'm here to help."


def _infer_action(message: str):
    m = (message or "").lower()
    if any(k in m for k in ["priority", "priorit", "اولوي", "أولو", "رتب", "order"]):
        return "priorities"
    if any(k in m for k in ["week", "weekly", "خطة", "اسبوع", "أسبوع", "plan"]):
        return "weekly_plan"
    if any(k in m for k in ["project", "مشروع", "build", "idea"]):
        return "project"
    if any(k in m for k in ["learn", "تعلم", "course", "كور", "what now", "شو"]):
        return "learn_now"
    if any(k in m for k in ["motivat", "حماس", "تعب", "stress", "قلق"]):
        return "daily"
    return "priorities"


def _generate_ai(action: str, bundle: dict, override_big5=None, override_label=None):
    uid = (bundle.get("user", {}).get("firebase_uid") or "seed")
    rng = _stable_daily_rng(uid)
    style = _big5_style(bundle, override_percent=override_big5, override_label=override_label)

    if action == "priorities":
        out = _generate_priorities(bundle, style, rng)
    elif action == "weekly_plan":
        out = _generate_weekly_plan(bundle, style, rng)
    elif action == "project":
        out = _suggest_project(bundle, style, rng)
    elif action == "learn_now":
        out = _learn_now(bundle, style, rng)
    elif action == "daily":
        out = _daily_checkin(bundle, style, rng)
    else:
        out = _generate_priorities(bundle, style, rng)

    return style, out


@app.route("/ai/coach", methods=["POST"])
def ai_coach_post():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    email = data.get("email")
    action = (data.get("action") or "").strip() or None
    message = (data.get("message") or "").strip()

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    ensure_user(firebase_uid, email)
    bundle = _fetch_user_bundle(firebase_uid)
    if not bundle:
        return jsonify({"error": "User not found"}), 404

    # Overrides from frontend localStorage (recommended for MVP)
    override_big5 = data.get("big5_percent") if isinstance(data.get("big5_percent"), dict) else None
    override_label = data.get("big5_label") if isinstance(data.get("big5_label"), str) else None

    if not action:
        action = _infer_action(message)

    style, out = _generate_ai(action, bundle, override_big5=override_big5, override_label=override_label)

    payload = {
        "action": action,
        "generated_at": now_iso(),
        "style": style,
        "output": out,
        "reply": _render_reply(action, out),
    }
    return jsonify(payload)


# Backward compatible alias for older frontend builds
@app.route("/ai-coach", methods=["POST"])
def ai_coach_alias():
    return ai_coach_post()


# Backward compatible simple GET
@app.route("/ai-coach/<firebase_uid>", methods=["GET"])
def ai_coach_legacy(firebase_uid):
    ensure_user(firebase_uid, None)
    bundle = _fetch_user_bundle(firebase_uid)
    if not bundle:
        return jsonify({"error": "User not found"}), 404
    style, out = _generate_ai("daily", bundle)
    return jsonify({
        "direction": (bundle.get("analysis", {}).get("direction") or "General Developer"),
        "priority": out.get("focus") if isinstance(out, dict) else "Foundations",
        "advice": out.get("advice", []) if isinstance(out, dict) else [],
        "weekly_plan": [],
        "generated_at": now_iso(),
    })

# ======================
# Save Progress
# ======================
@app.route("/save-progress", methods=["POST"])
def save_progress():
    data = request.get_json() or {}

    firebase_uid = data.get("firebase_uid")
    project_id = data.get("projectId")
    progress = data.get("progress", 0)
    tasks = data.get("tasks", [])

    if not firebase_uid or not project_id:
        return jsonify({"error": "Missing data"}), 400

    # validation
    try:
        progress_num = int(progress)
    except Exception:
        return jsonify({"error": "Progress must be a number"}), 400

    if progress_num < 0 or progress_num > 100:
        return jsonify({"error": "Progress must be between 0 and 100"}), 400

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        user_id = user["id"]

        cursor.execute("""
            SELECT id FROM project_progress
            WHERE user_id = ? AND project_id = ?
        """, (user_id, project_id))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
                UPDATE project_progress
                SET progress = ?, tasks = ?
                WHERE id = ?
            """, (progress_num, json.dumps(tasks), existing["id"]))
        else:
            cursor.execute("""
                INSERT INTO project_progress (user_id, project_id, progress, tasks)
                VALUES (?, ?, ?, ?)
            """, (user_id, project_id, progress_num, json.dumps(tasks)))

        conn.commit()
        return jsonify({"status": "progress_saved"})
    finally:
        conn.close()

@app.route("/project-progress/<firebase_uid>/<project_id>", methods=["GET"])
def get_project_progress(firebase_uid, project_id):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"progress": 0, "tasks": []})

        user_id = user["id"]

        cursor.execute("""
            SELECT progress, tasks
            FROM project_progress
            WHERE user_id = ? AND project_id = ?
        """, (user_id, project_id))
        row = cursor.fetchone()

        if not row:
            return jsonify({"progress": 0, "tasks": []})

        return jsonify({
            "progress": row["progress"],
            "tasks": safe_json_loads(row["tasks"], [])
        })
    finally:
        conn.close()

# ======================
# Courses: Catalog + "Semi-Dynamic" Ranking
# ======================
COURSE_CATALOG = [
    {
        "id": "mdn-js",
        "title": "JavaScript — MDN Guide",
        "provider": "MDN",
        "level": "Beginner",
        "duration": "6–10h",
        "tags": ["JavaScript", "Fundamentals"],
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    },
    {
        "id": "react-docs",
        "title": "React — Official Docs (Learn)",
        "provider": "React",
        "level": "Beginner",
        "duration": "5–8h",
        "tags": ["React", "Components"],
        "url": "https://react.dev/learn",
    },
    {
        "id": "fcc-js",
        "title": "JavaScript Algorithms and Data Structures",
        "provider": "freeCodeCamp",
        "level": "Beginner",
        "duration": "20–40h",
        "tags": ["JavaScript", "Practice"],
        "url": "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/",
    },
    {
        "id": "webdev-http",
        "title": "HTTP — web.dev learn",
        "provider": "web.dev",
        "level": "Beginner",
        "duration": "1–2h",
        "tags": ["Web", "HTTP"],
        "url": "https://web.dev/learn/",
    },
]

def course_score(course, gaps, level, direction):
    score = 0
    tags = course.get("tags", []) or []
    title = (course.get("title") or "").lower()

    # gaps boost (better match)
    for g in (gaps or []):
        g_low = (g or "").lower().strip()
        if not g_low:
            continue
        if any(g_low in (t or "").lower() for t in tags) or g_low in title:
            score += 5

    # level match
    if level and (course.get("level", "").lower() == str(level).lower()):
        score += 2

    # direction hint (simple)
    if direction and "frontend" in direction.lower():
        if any((t or "").lower() == "react" for t in tags):
            score += 1

    return score

@app.route("/courses/<firebase_uid>", methods=["GET"])
def get_courses(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # analysis (optional)
        cursor.execute("""
            SELECT a.gaps, a.direction
            FROM analysis a
            JOIN users u ON a.user_id = u.id
            WHERE u.firebase_uid = ?
        """, (firebase_uid,))
        a = cursor.fetchone()

        gaps = []
        direction = "General Developer"
        if a:
            gaps = safe_json_loads(a["gaps"], [])
            direction = a["direction"] or direction

        # NOTE: if you store level later in DB, wire it here
        level = None

        ranked = []
        for c in COURSE_CATALOG:
            sc = course_score(c, gaps, level, direction)
            item = dict(c)
            item["reason"] = "Recommended based on your gaps and learning path."
            item["_score"] = sc
            ranked.append(item)

        ranked.sort(key=lambda x: x["_score"], reverse=True)
        for r in ranked:
            r.pop("_score", None)

        return jsonify({"courses": ranked[:18]})
    finally:
        conn.close()

# ======================
# Coach Apply
# ======================
@app.route("/coach-apply", methods=["POST"])
def coach_apply():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    email = data.get("email", "")

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    full_name = (data.get("full_name") or "").strip()
    bio = (data.get("bio") or "").strip()
    motivation = (data.get("motivation") or "").strip()

    github = (data.get("github") or "").strip()
    linkedin = (data.get("linkedin") or "").strip()
    portfolio = (data.get("portfolio") or "").strip()

    if not full_name or not bio or not motivation:
        return jsonify({"error": "Missing required fields"}), 400

    if not (github or linkedin or portfolio):
        return jsonify({"error": "Provide at least one link"}), 400

    user_id = ensure_user(firebase_uid, email)

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO coach_applications (
                user_id, full_name, email, field, years_experience,
                linkedin, github, portfolio, bio, motivation, availability_hours,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            full_name,
            email,
            data.get("field", "Frontend"),
            data.get("years_experience", ""),
            linkedin,
            github,
            portfolio,
            bio,
            motivation,
            data.get("availability_hours", ""),
            "pending",
            now_iso()
        ))

        conn.commit()
        return jsonify({"status": "application_submitted"})
    finally:
        conn.close()

# ======================
# Health check
# ======================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": now_iso()})

# ======================
# Run
# ======================
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
