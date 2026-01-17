from flask import Flask, request, jsonify, make_response
import sqlite3
import json
import os
from datetime import datetime
import re
from werkzeug.exceptions import HTTPException

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

    scores = data.get("scores", {})   # object
    answers = data.get("answers", {}) # object
    result = data.get("result", {})   # object (optional)

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

# ======================
# AI Coach (High-level)
# ======================
@app.route("/ai-coach/<firebase_uid>", methods=["GET"])
def ai_coach(firebase_uid):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        user_id = user["id"]

        cursor.execute("SELECT * FROM personality WHERE user_id = ?", (user_id,))
        personality = cursor.fetchone()

        cursor.execute("SELECT * FROM analysis WHERE user_id = ?", (user_id,))
        analysis = cursor.fetchone()

        if not personality or not analysis:
            return jsonify({"error": "Incomplete profile"}), 400

        gaps = safe_json_loads(analysis["gaps"], [])
        direction = analysis["direction"] or "General Developer"
        priority = gaps[0] if gaps else "Foundations"

        advice = []
        if personality["motivation_state"] == "low":
            advice.append("Focus on very small daily wins (30 minutes max).")
        if personality["learning_style"] == "self":
            advice.append("Build mini-projects instead of watching too many tutorials.")
        if personality["clarity_level"] == "lost":
            advice.append("Working with a coach will help you regain direction.")

        weekly_plan = [
            f"Day 1–2: Learn basics of {priority}",
            f"Day 3–4: Practice {priority} with exercises",
            f"Day 5: Build a small project using {priority}",
            "Day 6: Review mistakes",
            "Day 7: Rest & reflect"
        ]

        return jsonify({
            "direction": direction,
            "priority": priority,
            "advice": advice,
            "weekly_plan": weekly_plan
        })
    finally:
        conn.close()

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
