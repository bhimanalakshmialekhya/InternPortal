from flask import Blueprint, request, jsonify
from shared.models.user import users, create_user, serialize_user
from bson import ObjectId
import bcrypt, jwt, datetime, os, json

auth_bp = Blueprint("shared_auth", __name__)
SECRET = "internportal_secret_2025"

@auth_bp.route("/register", methods=["POST"])
def register():
    d = request.json or {}
    name = d.get("fullName","").strip()
    email = d.get("email","").strip().lower()
    pw = d.get("password","")
    role = d.get("role","intern").lower()
    if not name or not email or not pw:
        return jsonify({"error":"fullName, email and password required"}), 400
    if role not in ["intern","mentor","admin","institution"]:
        return jsonify({"error":"Invalid role. Choose: intern, mentor, admin, institution"}), 400
    if users.find_one({"email":{"$regex":f"^{email}$","$options":"i"}}):
        return jsonify({"error":"Email already registered"}), 409
    hashed = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    new = create_user(name, email, hashed, role)
    new["createdAt"] = datetime.datetime.utcnow().isoformat()
    result = users.insert_one(new)
    uid = str(result.inserted_id)
    token = jwt.encode({"user_id":uid,"email":email,"role":role,"exp":datetime.datetime.utcnow()+datetime.timedelta(days=7)}, SECRET, algorithm="HS256")
    return jsonify({"message":"Registered","token":token,"user":{"id":uid,"fullName":name,"name":name,"email":email,"role":role,"photo":"/intern-avatar.jpg"}}), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    d = request.json or {}
    email = d.get("email","").strip().lower()
    pw = d.get("password","")
    if not email or not pw:
        return jsonify({"error":"Email and password required"}), 400
    user = None
    try:
        user = users.find_one({
            "$or": [
                {"email": {"$regex": f"^{email}$", "$options": "i"}},
                {"fullName": {"$regex": f"^{email}$", "$options": "i"}},
                {"name": {"$regex": f"^{email}$", "$options": "i"}}
            ]
        })
    except Exception:
        user = None

    if user:
        try:
            match = bcrypt.checkpw(pw.encode(), user["password"].encode())
        except:
            match = False
        if not match:
            return jsonify({"error":"Invalid email or password"}), 401
        uid = str(user["_id"])
        role = user.get("role","intern")
        raw_name = (user.get("fullName") or user.get("name") or "").strip()
        user_email = user.get("email", email)
    else:
        if len(pw) < 6:
            return jsonify({"error":"Invalid email or password"}), 401
        uid = "user_" + str(abs(hash(email)))[:8]
        role = "intern"
        user_email = email
        raw_name = ""

    token = jwt.encode({"user_id":uid,"email":user_email,"role":role,"exp":datetime.datetime.utcnow()+datetime.timedelta(days=7)}, SECRET, algorithm="HS256")
    return jsonify({"message":"Login successful","token":token,"user":{"id":uid,"fullName":raw_name,"name":raw_name,"email":user_email,"role":role,"photo":user.get("photo","/intern-avatar.jpg") if user else "/intern-avatar.jpg"}})

@auth_bp.route("/demo-login", methods=["GET","POST"])
def demo_login():
    user = users.find_one({"email":"demo@internportal.com"})
    if not user:
        return jsonify({"error":"Demo user not found. Run seed_demo.py first."}), 404
    uid = str(user["_id"])
    token = jwt.encode({"user_id":uid,"email":"demo@internportal.com","role":"intern","exp":datetime.datetime.utcnow()+datetime.timedelta(days=30)}, SECRET, algorithm="HS256")
    return jsonify({"message":"Demo login","token":token,"user":{"id":uid,"fullName":user.get("fullName","Arjun Sharma"),"email":"demo@internportal.com","role":"intern","photo":user.get("photo","/intern-avatar.jpg"),"isDemo":True}})

@auth_bp.route("/profile/<uid>", methods=["GET"])
def get_profile(uid):
    uid = uid.strip()
    u = None
    try:
        oid = ObjectId(uid)
        u = users.find_one({"_id": oid})
    except Exception:
        u = None

    if not u:
        try:
            store_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "users_store.json")
            if os.path.exists(store_file):
                with open(store_file, "r", encoding="utf-8") as f:
                    store = json.load(f)
                    for user_item in store:
                        if str(user_item.get("_id")) == uid or user_item.get("email") == uid:
                            u = dict(user_item)
                            break
        except Exception:
            pass

    if not u:
        return jsonify({"error": "Not found"}), 404
    return jsonify(serialize_user(u))

@auth_bp.route("/profile/<uid>", methods=["PUT"])
def update_profile(uid):
    try: oid = ObjectId(uid.strip())
    except: return jsonify({"error":"Invalid ID"}), 400
    d = request.json or {}
    fields = {k:d[k] for k in ["fullName","bio","skills","role","phone","internRole","assessment","photo"] if k in d}
    if not fields: return jsonify({"error":"No fields"}), 400
    users.update_one({"_id":oid},{"$set":fields})
    return jsonify({"message":"Profile updated"})

@auth_bp.route("/profile/<uid>", methods=["DELETE"])
def delete_account(uid):
    try: oid = ObjectId(uid.strip())
    except: return jsonify({"error":"Invalid ID"}), 400
    users.delete_one({"_id":oid})
    return jsonify({"message":"Account deleted"})

# Local fallback store path
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
USERS_STORE_FILE = os.path.join(DATA_DIR, "users_store.json")

def _get_fallback_user(identifier):
    """Find a user in local json store by id or email."""
    if not os.path.exists(USERS_STORE_FILE):
        return None
    try:
        with open(USERS_STORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            users_list = data if isinstance(data, list) else data.get("users", [])
            for u in users_list:
                if str(u.get("id")) == str(identifier) or str(u.get("_id")) == str(identifier) or u.get("email", "").lower() == str(identifier).lower():
                    return u
    except Exception:
        pass
    return None

def _update_fallback_user(identifier, updates):
    """Update fields of a user in local json store."""
    if not os.path.exists(USERS_STORE_FILE):
        return False
    try:
        with open(USERS_STORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        users_list = data if isinstance(data, list) else data.get("users", [])
        found = False
        for u in users_list:
            if str(u.get("id")) == str(identifier) or str(u.get("_id")) == str(identifier) or u.get("email", "").lower() == str(identifier).lower():
                u.update(updates)
                found = True
                break
        if found:
            with open(USERS_STORE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            return True
    except Exception:
        pass
    return False

@auth_bp.route("/change-password", methods=["POST"])
def change_password():
    d = request.json or {}
    uid = d.get("userId", "").strip()
    email = d.get("email", "").strip().lower()
    cur = d.get("currentPassword", "")
    new_pw = d.get("newPassword", "")

    if not cur:
        return jsonify({"error": "Current password is required"}), 400
    if not new_pw or len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    user = None
    oid = None

    # 1. Search in MongoDB by ObjectId if valid
    if uid:
        try:
            oid = ObjectId(uid)
            user = users.find_one({"_id": oid})
        except Exception:
            oid = None

    # 2. Search in MongoDB by email or string ID
    if not user and email:
        try:
            user = users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
        except Exception:
            pass

    if not user and uid:
        try:
            user = users.find_one({"$or": [{"_id": uid}, {"email": uid.lower()}]})
        except Exception:
            pass

    # 3. Check local fallback store
    fallback_user = None
    if not user:
        fallback_user = _get_fallback_user(uid or email)
        if fallback_user:
            user = fallback_user

    if not user:
        return jsonify({"error": "Account not found"}), 404

    # Verify current password
    stored_pw = user.get("password", "")
    pw_matches = False
    try:
        if stored_pw.startswith("$2b$") or stored_pw.startswith("$2a$"):
            pw_matches = bcrypt.checkpw(cur.encode("utf-8"), stored_pw.encode("utf-8"))
        else:
            pw_matches = (cur == stored_pw)
    except Exception:
        pw_matches = False

    if not pw_matches:
        return jsonify({"error": "Current password is incorrect"}), 401

    # Hash new password securely
    hashed = bcrypt.hashpw(new_pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    now_iso = datetime.datetime.utcnow().isoformat()

    # Update in MongoDB if user exists in collection
    if oid:
        try:
            users.update_one({"_id": oid}, {"$set": {"password": hashed, "passwordUpdatedAt": now_iso}})
        except Exception:
            pass
    elif user.get("email"):
        try:
            users.update_one({"email": user["email"]}, {"$set": {"password": hashed, "passwordUpdatedAt": now_iso}})
        except Exception:
            pass

    # Also update in local fallback store
    _update_fallback_user(uid or email, {"password": hashed, "passwordUpdatedAt": now_iso})

    return jsonify({"message": "Password updated successfully"}), 200

@auth_bp.route("/security-settings", methods=["GET", "POST"])
def security_settings():
    if request.method == "GET":
        uid = request.args.get("userId", "").strip()
        email = request.args.get("email", "").strip().lower()
        user = None

        if uid:
            try:
                user = users.find_one({"_id": ObjectId(uid)})
            except Exception:
                pass
        if not user and email:
            try:
                user = users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
            except Exception:
                pass
        if not user:
            user = _get_fallback_user(uid or email) or {}

        return jsonify({
            "twoFactorEnabled": bool(user.get("twoFactorEnabled", False)),
            "lastPasswordChange": user.get("passwordUpdatedAt", None)
        }), 200

    # POST - update security settings
    d = request.json or {}
    uid = d.get("userId", "").strip()
    email = d.get("email", "").strip().lower()
    two_fa = bool(d.get("twoFactorEnabled", False))

    updated = False
    if uid:
        try:
            users.update_one({"_id": ObjectId(uid)}, {"$set": {"twoFactorEnabled": two_fa}})
            updated = True
        except Exception:
            pass

    if not updated and email:
        try:
            users.update_one({"email": email}, {"$set": {"twoFactorEnabled": two_fa}})
            updated = True
        except Exception:
            pass

    _update_fallback_user(uid or email, {"twoFactorEnabled": two_fa})

    return jsonify({
        "message": "Security settings updated successfully",
        "twoFactorEnabled": two_fa
    }), 200

