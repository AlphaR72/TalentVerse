from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import sqlite3, json, os
from datetime import datetime

app = Flask(__name__)

# ✅ DEV: اسمح لأي localhost/127.0.0.1 بأي بورت (3000/3001/3002/3003...)
CORS(
    app,
    resources={r"/*": {"origins": [r"http://localhost:\d+", r"http://127\.0\.0\.1:\d+"]}},
    supports_credentials=False,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Email"],
)

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
    Simple admin check for university demo:
    Put admin email in env ADMIN_EMAIL (or fallback).
    Request must include header: X-Admin-Email
    """
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com").lower()
    req_email = (request.headers.get("X-Admin-Email") or "").lower().strip()
    return req_email != "" and req_email == admin_email

# ======================
# Init DB
# ======================
def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

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
            user_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strengths TEXT,
            gaps TEXT,
            direction TEXT,
            user_id INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            display_name TEXT,
            avatar TEXT,
            bio TEXT,
            interests TEXT,
            field TEXT,
            level TEXT,
            goals TEXT,
            user_id INTEGER UNIQUE,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)

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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bigfive (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        scores TEXT,
        answers TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
""")

    # Courses catalog (real links stored in DB; recommendations are dynamic)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            provider TEXT,
            url TEXT NOT NULL,
            field TEXT,
            level TEXT,
            tags TEXT,
            language TEXT DEFAULT 'en',
            is_active INTEGER DEFAULT 1,
            created_at TEXT
        )
    """)

    # Coach applications
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS coach_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            status TEXT DEFAULT 'pending',
            cv_url TEXT,
            github_url TEXT,
            portfolio_url TEXT,
            note TEXT,
            created_at TEXT,
            reviewed_at TEXT,
            reviewed_by TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    """)


    conn.commit()

    # Seed minimal course catalog if empty
    cursor.execute("SELECT COUNT(*) AS c FROM courses")
    count = cursor.fetchone()["c"]
    if count == 0:
        seed_courses(cursor)
        conn.commit()

    conn.close()

def seed_courses(cursor):
    # Real links; stored in DB (admin can manage later)
    items = [
        # Foundations - Web
        ("Responsive Web Design", "freeCodeCamp", "https://www.freecodecamp.org/learn/2022/responsive-web-design/", "frontend", "beginner", "html,css,responsive", "en"),
        ("JavaScript Algorithms and Data Structures", "freeCodeCamp", "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/", "frontend", "beginner", "javascript,basics", "en"),
        ("MDN Web Docs - Learn Web Development", "MDN", "https://developer.mozilla.org/en-US/docs/Learn", "frontend", "beginner", "html,css,js", "en"),
        ("The Odin Project - Full Stack JavaScript", "The Odin Project", "https://www.theodinproject.com/paths/full-stack-javascript", "fullstack", "beginner", "html,css,js,react,node", "en"),
        ("Full Stack Open", "University of Helsinki", "https://fullstackopen.com/en/", "fullstack", "intermediate", "react,node,graphql,testing", "en"),
        ("CS50x - Introduction to Computer Science", "Harvard/edX", "https://www.edx.org/learn/computer-science/harvard-university-cs50-s-introduction-to-computer-science", "general", "beginner", "cs,foundations,c", "en"),
        # Professional track examples
        ("Meta Front-End Developer Professional Certificate", "Coursera", "https://www.coursera.org/professional-certificates/meta-front-end-developer", "frontend", "intermediate", "react,frontend,career", "en"),
    ]

    for (title, provider, url, field, level, tags, lang) in items:
        cursor.execute("""
            INSERT INTO courses (title, provider, url, field, level, tags, language, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (title, provider, url, field, level, tags, lang, now_iso()))

# ======================
# Ensure user exists helper
# ======================
def ensure_user(firebase_uid, email=None):
    """Create user if not exists, return user_id"""
    if not firebase_uid or not isinstance(firebase_uid, str) or len(firebase_uid) < 3:
        raise ValueError("Invalid firebase_uid")
    
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        cursor.execute("SELECT id, firebase_uid, email, role, coach_level FROM users WHERE firebase_uid = ?", (firebase_uid,))
        user = cursor.fetchone()

        if not user:
            cursor.execute(
                "INSERT INTO users (firebase_uid, email, role, coach_level, created_at) VALUES (?, ?, 'user', NULL, ?)",
                (firebase_uid, email or "", now_iso())
            )
            conn.commit()
            user_id = cursor.lastrowid
            return user_id

        return user["id"]
    finally:
        conn.close()

# ======================
# Personality
# ======================
@app.route("/personality", methods=["POST"])
def save_personality():
    try:
        data = request.get_json() or {}
        firebase_uid = data.get("firebase_uid")
        email = data.get("email")

        if not firebase_uid:
            return jsonify({"error": "Missing firebase_uid"}), 400

        user_id = ensure_user(firebase_uid, email)

        # Safe reads (avoid KeyError -> 500)
        learning_style = data.get("learning_style", "").strip()
        decision_style = data.get("decision_style", "").strip()
        work_preference = data.get("work_preference", "").strip()
        motivation_state = data.get("motivation_state", "").strip()
        clarity_level = data.get("clarity_level", "").strip()

        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("DELETE FROM personality WHERE user_id = ?", (user_id,))
            cursor.execute("""
                INSERT INTO personality (
                    learning_style, decision_style, work_preference,
                    motivation_state, clarity_level, user_id
                ) VALUES (?, ?, ?, ?, ?, ?)
            """, (
                learning_style,
                decision_style,
                work_preference,
                motivation_state,
                clarity_level,
                user_id
            ))

            conn.commit()
            return jsonify({"status": "personality_saved"})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/personality/<firebase_uid>", methods=["GET"])
def get_personality(firebase_uid):
    try:
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# MBTI Personality (unchanged core logic)
# ======================
@app.route("/save-mbti", methods=["POST"])
def save_mbti():
    try:
        data = request.get_json() or {}
        firebase_uid = data.get("firebase_uid")
        email = data.get("email")
        mbti_type = data.get("mbti_type")
        scores = data.get("scores", {})
        answers = data.get("answers", {})
        percentages = data.get("percentages", {})

        if not firebase_uid or not mbti_type:
            return jsonify({"error": "Missing firebase_uid or mbti_type"}), 400

        user_id = ensure_user(firebase_uid, email)

        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM personality WHERE user_id = ?", (user_id,))
            personality = cursor.fetchone()

            if personality:
                cursor.execute("""
                    UPDATE personality SET 
                        mbti_type = ?,
                        mbti_scores = ?,
                        mbti_answers = ?,
                        mbti_percentages = ?,
                        learning_style = ?,
                        decision_style = ?,
                        work_preference = ?,
                        motivation_state = ?,
                        clarity_level = ?
                    WHERE user_id = ?
                """, (
                    mbti_type,
                    json.dumps(scores),
                    json.dumps(answers),
                    json.dumps(percentages),
                    get_learning_style_from_mbti(mbti_type),
                    get_decision_style_from_mbti(mbti_type),
                    get_work_preference_from_mbti(mbti_type),
                    get_motivation_from_mbti(mbti_type),
                    get_clarity_from_mbti(mbti_type),
                    user_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO personality (
                        user_id, mbti_type, mbti_scores, mbti_answers, mbti_percentages,
                        learning_style, decision_style, work_preference, motivation_state, clarity_level
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id, mbti_type, json.dumps(scores), json.dumps(answers), json.dumps(percentages),
                    get_learning_style_from_mbti(mbti_type),
                    get_decision_style_from_mbti(mbti_type),
                    get_work_preference_from_mbti(mbti_type),
                    get_motivation_from_mbti(mbti_type),
                    get_clarity_from_mbti(mbti_type)
                ))

            conn.commit()
            return jsonify({"status": "mbti_saved", "mbti_type": mbti_type})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analyze-mbti", methods=["POST"])
def analyze_mbti():
    data = request.get_json() or {}
    mbti_type = data.get("mbti_type", "INTP")

    # keep your mbti_data here (same as your original)
    mbti_data = {
        "INTP": {
            "title": "المفكر",
            "description": "فضولية، منطقية، تركّز على النظريات والمفاهيم",
            "strengths": ["التحليل العميق", "الفضول الفكري", "التفكير النقدي", "التفكير المجرد"],
            "weaknesses": ["التسويف", "الانعزال", "صعوبة التنفيذ العملي", "الإهمال للتفاصيل"],
            "learning_style": "تعلم النظريات، البحث المستقل، حل المشكلات المعقدة",
            "career_suggestions": ["عالم أبحاث", "مطور نظم", "فيلسوف", "مهندس برمجيات"],
            "compatibility": ["ENTJ", "ESTJ", "ENFJ"],
            "famous_examples": ["ألبرت أينشتاين", "بيل غيتس", "سقراط"]
        }
        # (باقي الأنواع عندك…)
    }

    result = mbti_data.get(mbti_type, mbti_data["INTP"])
    result["learning_recommendations"] = get_learning_recommendations(mbti_type)
    result["project_suggestions"] = get_project_suggestions(mbti_type)
    result["communication_tips"] = get_communication_tips(mbti_type)

    return jsonify(result)

# ======================
# Helper Functions for MBTI (same as your originals)
# ======================
def get_learning_style_from_mbti(mbti_type):
    if len(mbti_type) < 4:
        return "guided"
    if mbti_type[1] == "N":
        return "self" if mbti_type[0] == "I" else "guided"
    else:
        return "visual" if mbti_type[3] == "P" else "guided"

def get_decision_style_from_mbti(mbti_type):
    if len(mbti_type) < 3:
        return "analytical"
    return "analytical" if mbti_type[2] == "T" else "validation"

def get_work_preference_from_mbti(mbti_type):
    if len(mbti_type) < 4:
        return "solo"
    if mbti_type[0] == "E":
        return "peer" if mbti_type[3] == "P" else "mentor"
    else:
        return "solo"

def get_motivation_from_mbti(mbti_type):
    if len(mbti_type) < 4:
        return "medium"
    if mbti_type[0] == "E":
        return "high" if mbti_type[3] == "J" else "medium"
    else:
        return "medium" if mbti_type[3] == "J" else "low"

def get_clarity_from_mbti(mbti_type):
    if len(mbti_type) < 4:
        return "vague"
    if mbti_type[3] == "J":
        return "clear" if mbti_type[1] == "S" else "vague"
    else:
        return "vague" if mbti_type[1] == "S" else "lost"

def get_learning_recommendations(mbti_type):
    return ["📚 اقرأ في مجال تخصصك", "💻 مارس التطبيق العملي", "🤝 تعلم مع مجموعة", "🎯 ضع أهدافاً واضحة"]

def get_project_suggestions(mbti_type):
    return ["موقع شخصي", "تطبيق بسيط", "مدونة تقنية"]

def get_communication_tips(mbti_type):
    return "كن واضحاً وصادقاً في تواصلك"


@app.route("/save-big5", methods=["POST"])
def save_big5():
    try:
        data = request.get_json() or {}
        firebase_uid = data.get("firebase_uid")
        email = data.get("email")
        scores = data.get("scores", {})
        answers = data.get("answers", {})

        if not firebase_uid:
            return jsonify({"error": "Missing firebase_uid"}), 400

        # Validate scores and answers are dicts
        if not isinstance(scores, dict) or not isinstance(answers, dict):
            return jsonify({"error": "Scores and answers must be objects"}), 400

        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
            user = cursor.fetchone()

            if not user:
                cursor.execute("INSERT INTO users (firebase_uid, email) VALUES (?, ?)", (firebase_uid, email or ""))
                user_id = cursor.lastrowid
            else:
                user_id = user["id"]

            cursor.execute("SELECT id FROM bigfive WHERE user_id = ?", (user_id,))
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    "UPDATE bigfive SET scores = ?, answers = ? WHERE user_id = ?",
                    (json.dumps(scores), json.dumps(answers), user_id),
                )
            else:
                cursor.execute(
                    "INSERT INTO bigfive (user_id, scores, answers) VALUES (?, ?, ?)",
                    (user_id, json.dumps(scores), json.dumps(answers)),
                )

            conn.commit()
            return jsonify({"status": "big5_saved"})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/big5/<firebase_uid>", methods=["GET"])
def get_big5(firebase_uid):
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404

            user_id = user["id"]
            cursor.execute("SELECT scores, answers FROM bigfive WHERE user_id = ?", (user_id,))
            row = cursor.fetchone()

            if not row:
                return jsonify({"error": "No big5"}), 404

            return jsonify({
                "scores": json.loads(row["scores"]) if row["scores"] else {},
                "answers": json.loads(row["answers"]) if row["answers"] else {}
            })
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# Profile
# ======================
@app.route("/profile", methods=["POST"])
def save_profile():
    try:
        data = request.get_json() or {}
        firebase_uid = data.get("firebase_uid")
        if not firebase_uid:
            return jsonify({"error": "Missing firebase_uid"}), 400

        ensure_user(firebase_uid, data.get("email"))

        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
            user = cursor.fetchone()
            if not user:
                return jsonify({"error": "User not found"}), 404

            user_id = user["id"]

            cursor.execute("DELETE FROM profile WHERE user_id = ?", (user_id,))
            cursor.execute("""
                INSERT INTO profile (display_name, avatar, bio, interests, field, level, goals, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get("display_name", "").strip(),
                data.get("avatar", "").strip(),
                data.get("bio", "").strip(),
                json.dumps(data.get("interests", [])),
                data.get("field", "").strip(),
                data.get("level", "").strip(),   # beginner/intermediate/advanced
                json.dumps(data.get("goals", [])),
                user_id
            ))

            conn.commit()
            return jsonify({"status": "profile_saved"})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/profile/<firebase_uid>", methods=["GET"])
def get_profile(firebase_uid):
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT display_name, avatar, bio, interests, field, level, goals
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
                "interests": safe_json_loads(row["interests"], []),
                "field": row["field"],
                "level": row["level"],
                "goals": safe_json_loads(row["goals"], [])
            })
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
            "gaps": ["React Patterns", "TypeScript"],
            "direction": "Frontend Developer"
        }
    },
    "fullstack": {
        "beginner": {
            "strengths": ["HTML", "CSS"],
            "gaps": ["JavaScript", "Node.js"],
            "direction": "Junior Fullstack Developer"
        }
    }
}

@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json() or {}
        firebase_uid = data.get("firebase_uid")
        email = data.get("email")
        field = (data.get("field") or "").lower().strip()
        level = (data.get("level") or "").lower().strip()

        if not firebase_uid:
            return jsonify({"error": "Missing firebase_uid"}), 400

        user_id = ensure_user(firebase_uid, email)

        analysis_result = ANALYSIS_MAP.get(field, {}).get(level, {
            "strengths": ["General programming"],
            "gaps": ["Core concepts"],
            "direction": "General Developer"
        })

        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("DELETE FROM analysis WHERE user_id = ?", (user_id,))
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analysis/<firebase_uid>", methods=["GET"])
def get_analysis(firebase_uid):
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT strengths, gaps, direction
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# Courses (Dynamic recommendations from DB)
# ======================
@app.route("/courses/recommend/<firebase_uid>", methods=["GET"])
def recommend_courses(firebase_uid):
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT u.id as user_id
                FROM users u
                WHERE u.firebase_uid = ?
            """, (firebase_uid,))
            urow = cursor.fetchone()
            if not urow:
                return jsonify({"error": "User not found"}), 404
            user_id = urow["user_id"]

            cursor.execute("""
                SELECT a.gaps, a.direction
                FROM analysis a
                WHERE a.user_id = ?
            """, (user_id,))
            arow = cursor.fetchone()

            cursor.execute("""
                SELECT p.learning_style, p.motivation_state
                FROM personality p
                WHERE p.user_id = ?
            """, (user_id,))
            prow = cursor.fetchone()

            cursor.execute("""
                SELECT pr.field, pr.level
                FROM profile pr
                WHERE pr.user_id = ?
            """, (user_id,))
            prrow = cursor.fetchone()

            gaps = safe_json_loads(arow["gaps"], []) if arow else []
            direction = arow["direction"] if arow else "General Developer"
            learning_style = (prow["learning_style"] if prow else "") or "guided"
            motivation = (prow["motivation_state"] if prow else "") or "medium"
            field = (prrow["field"] if prrow else "") or ""
            level = (prrow["level"] if prrow else "") or ""

            # Basic scoring: match field + level + tags with gaps
            cursor.execute("""
                SELECT id, title, provider, url, field, level, tags, language
                FROM courses
                WHERE is_active = 1
            """)
            allc = cursor.fetchall()

            scored = []
            for c in allc:
                score = 0
                c_field = (c["field"] or "").lower()
                c_level = (c["level"] or "").lower()
                tags = (c["tags"] or "").lower()

                if field and c_field == field.lower():
                    score += 4
                if level and c_level == level.lower():
                    score += 3

                # gaps boost
                for g in gaps[:5]:
                    if (g or "").lower() in tags:
                        score += 2

                # learning_style / motivation small tweaks (demo)
                if learning_style == "self" and ("self" in tags or "project" in tags):
                    score += 1
                if motivation == "low" and c_level == "beginner":
                    score += 1

                scored.append((score, dict(c)))

            scored.sort(key=lambda x: x[0], reverse=True)
            top = [item for (s, item) in scored[:8]]

            return jsonify({
                "direction": direction,
                "field": field,
                "level": level,
                "learning_style": learning_style,
                "motivation_state": motivation,
                "recommended": top
            })
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/courses", methods=["POST"])
def admin_add_course():
    if not is_admin_request():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    title = data.get("title")
    url = data.get("url")
    if not title or not url:
        return jsonify({"error": "Missing title or url"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO courses (title, provider, url, field, level, tags, language, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (
        title,
        data.get("provider", ""),
        url,
        data.get("field", ""),
        data.get("level", ""),
        data.get("tags", ""),
        data.get("language", "en"),
        now_iso()
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "course_added"})

@app.route("/admin/courses/<int:course_id>/toggle", methods=["POST"])
def admin_toggle_course(course_id):
    if not is_admin_request():
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT is_active FROM courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    new_val = 0 if row["is_active"] == 1 else 1
    cursor.execute("UPDATE courses SET is_active = ? WHERE id = ?", (new_val, course_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "updated", "is_active": new_val})

# ======================
# Coach apply + Admin review
# ======================
@app.route("/coach-apply", methods=["POST"])
def coach_apply():
    data = request.get_json() or {}
    firebase_uid = data.get("firebase_uid")
    email = data.get("email")

    if not firebase_uid:
        return jsonify({"error": "Missing firebase_uid"}), 400

    user_id = ensure_user(firebase_uid, email)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO coach_applications (user_id, status, cv_url, github_url, portfolio_url, note, created_at)
        VALUES (?, 'pending', ?, ?, ?, ?, ?)
    """, (
        user_id,
        data.get("cv_url", ""),
        data.get("github_url", ""),
        data.get("portfolio_url", ""),
        data.get("note", ""),
        now_iso()
    ))

    conn.commit()
    conn.close()
    return jsonify({"status": "application_submitted"})

@app.route("/admin/coach-applications", methods=["GET"])
def admin_list_coach_apps():
    if not is_admin_request():
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ca.id, ca.status, ca.cv_url, ca.github_url, ca.portfolio_url, ca.note, ca.created_at,
               u.firebase_uid, u.email
        FROM coach_applications ca
        JOIN users u ON ca.user_id = u.id
        ORDER BY ca.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return jsonify({"applications": [dict(r) for r in rows]})

@app.route("/admin/coach-applications/<int:app_id>/approve", methods=["POST"])
def admin_approve_coach(app_id):
    if not is_admin_request():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}
    coach_level = data.get("coach_level", "junior").lower()
    reviewed_by = (request.headers.get("X-Admin-Email") or "").strip()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT user_id FROM coach_applications WHERE id = ?", (app_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "Not found"}), 404

    user_id = row["user_id"]

    cursor.execute("""
        UPDATE coach_applications
        SET status = 'approved', reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
    """, (now_iso(), reviewed_by, app_id))

    cursor.execute("""
        UPDATE users
        SET role = 'coach', coach_level = ?
        WHERE id = ?
    """, (coach_level, user_id))

    conn.commit()
    conn.close()
    return jsonify({"status": "approved", "coach_level": coach_level})

@app.route("/admin/coach-applications/<int:app_id>/reject", methods=["POST"])
def admin_reject_coach(app_id):
    if not is_admin_request():
        return jsonify({"error": "Unauthorized"}), 401

    reviewed_by = (request.headers.get("X-Admin-Email") or "").strip()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE coach_applications
        SET status = 'rejected', reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
    """, (now_iso(), reviewed_by, app_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "rejected"})

# ======================
# Projects suggested from analysis (unchanged)
# ======================
@app.route("/projects/<firebase_uid>", methods=["GET"])
def projects(firebase_uid):
    try:
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# Matching (make joins safer)
# ======================
@app.route("/matching/<firebase_uid>", methods=["GET"])
def matching(firebase_uid):
    try:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
            u = cursor.fetchone()
            if not u:
                return jsonify({"error": "User not found"}), 404

            user_id = u["id"]

            cursor.execute("SELECT work_preference, clarity_level FROM personality WHERE user_id = ?", (user_id,))
            p = cursor.fetchone()

            cursor.execute("SELECT direction FROM analysis WHERE user_id = ?", (user_id,))
            a = cursor.fetchone()

            if not p or not a:
                return jsonify({"matches": []})

            matches = []
            if p["clarity_level"] == "lost":
                matches.append({"type": "Coach", "reason": "You need guidance and clarity"})
            if p["work_preference"] in ["peer", "mentor"]:
                matches.append({"type": "Peer", "reason": "Learning together boosts progress"})

            return jsonify({"matches": matches})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# AI Coach (FIX: frontend uses POST /ai-coach)
# ======================
@app.route("/ai-coach", methods=["POST"])
def ai_coach_post():
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"reply": "Tell me what you want to work on today."})

    # Simple mock reply (later connect real AI)
    reply = (
        "Got it. Let's make this actionable:\n"
        "1) Tell me your current level (beginner/intermediate/advanced)\n"
        "2) What topic are you stuck on?\n"
        "3) What is your goal for this week?\n\n"
        f"Your message: '{message}'"
    )
    return jsonify({"reply": reply})

# Keep your old endpoint (optional)
@app.route("/ai-coach/<firebase_uid>", methods=["GET"])
def ai_coach(firebase_uid):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE firebase_uid = ?", (firebase_uid,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    user_id = user["id"]
    cursor.execute("SELECT * FROM personality WHERE user_id = ?", (user_id,))
    personality = cursor.fetchone()

    cursor.execute("SELECT * FROM analysis WHERE user_id = ?", (user_id,))
    analysis = cursor.fetchone()

    conn.close()

    if not personality or not analysis:
        return jsonify({"error": "Incomplete profile"}), 400

    gaps = safe_json_loads(analysis["gaps"], [])
    direction = analysis["direction"]
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

# ======================
# Save Progress (fix firebase_uid key expected)
# ======================
@app.route("/save-progress", methods=["POST"])
def save_progress():
    try:
        data = request.get_json() or {}

        firebase_uid = data.get("firebase_uid") or data.get("firebaseUid")
        project_id = data.get("projectId")
        progress = data.get("progress", 0)
        tasks = json.dumps(data.get("tasks", []))

        # Validate inputs
        if not firebase_uid or not project_id:
            return jsonify({"error": "Missing firebase_uid or projectId"}), 400
        
        if not isinstance(progress, (int, float)) or progress < 0 or progress > 100:
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
                """, (progress, tasks, existing["id"]))
            else:
                cursor.execute("""
                    INSERT INTO project_progress (user_id, project_id, progress, tasks)
                    VALUES (?, ?, ?, ?)
                """, (user_id, project_id, progress, tasks))

            conn.commit()
            return jsonify({"status": "progress_saved"})
        finally:
            conn.close()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/project-progress/<firebase_uid>/<project_id>", methods=["GET"])
def get_project_progress(firebase_uid, project_id):
    try:
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================
# AI Code Helper / Tips / Review (same as your originals)
# ======================
@app.route("/ai-code-helper", methods=["POST"])
def ai_code_helper():
    data = request.get_json() or {}
    question = data.get("question", "")
    project = data.get("project", "")

    reply = (
        f"I see you're working on '{project}'. "
        f"For your question: '{question}', try breaking it into smaller parts, "
        "check your component structure, and use the browser dev tools to inspect state and props."
    )
    return jsonify({"reply": reply})

@app.route("/ai-project-tips", methods=["POST"])
def ai_project_tips():
    data = request.get_json() or {}
    project = data.get("project", "your project")

    tips = [
        f"Start {project} by defining a clear small MVP before adding extra features.",
        "Commit frequently with clear messages so you can safely refactor later.",
        "Keep components small and focused; if a file feels heavy, split it.",
        "Add basic error and loading states early, not at the end."
    ]
    return jsonify({"tips": tips})

@app.route("/ai-review", methods=["POST"])
def ai_review():
    data = request.get_json() or {}
    project_title = data.get("project_title", "your project")
    progress = data.get("progress", 0)
    milestones = data.get("milestones", [])

    strengths, improvements, next_steps = [], [], []

    if progress >= 80:
        strengths.append("You're very close to finishing. Great consistency so far.")
    elif progress >= 40:
        strengths.append("You have a solid start. Keep the momentum up.")
    else:
        strengths.append("Good that you started. The key now is consistency.")

    if progress < 50:
        improvements.append("Try to work on at least one small task per day.")
    else:
        improvements.append("Start refining existing parts instead of only adding new ones.")

    incomplete = [m for m in milestones if not m.get("done")]
    if incomplete:
        next_steps.append(f"Focus on finishing milestone: '{incomplete[0].get('title', 'Next Milestone')}'.")
    else:
        next_steps.append("All milestones look done. Start polishing UX, accessibility, and performance.")

    review_text = (
        f"For '{project_title}', you're currently at {progress}% progress. "
        "Focus on steady progress, one milestone at a time."
    )

    return jsonify({
        "review": review_text,
        "strengths": strengths,
        "improvements": improvements,
        "next_steps": next_steps
    })

@app.route("/ai-next-step", methods=["POST"])
def ai_next_step():
    data = request.get_json() or {}
    project_title = data.get("project_title", "your project")
    progress = data.get("progress", 0)
    milestones = data.get("milestones", [])

    incomplete = [m for m in milestones if not m.get("done")]

    if progress == 0:
        message = f"You haven't started '{project_title}' yet."
        suggestion = "Start by doing the smallest setup step: create the project structure and one simple screen."
    elif incomplete:
        target = incomplete[0].get("title", "Next Milestone")
        message = f"You're at {progress}% in '{project_title}'."
        suggestion = f"Focus today on one small task inside milestone '{target}'."
    else:
        message = f"You're close to finishing '{project_title}'."
        suggestion = "Do a final review pass: clean up code, remove unused parts, and test the main flows."

    return jsonify({"message": message, "next_step": suggestion})

# ======================
# Run
# ======================
if __name__ == "__main__":
    init_db()
    app.run(debug=True)
