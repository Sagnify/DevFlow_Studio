from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import os
from pathlib import Path
import bcrypt
import jwt
import os
from models import db, Users, Tasks
from flask_migrate import Migrate

# Load .env
_env = Path(__file__).parent / ".env"
if _env.exists():
    for _l in _env.read_text().splitlines():
        if _l.strip() and not _l.startswith("#") and "=" in _l:
            _k, _v = _l.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///" + str(Path(__file__).parent / "app.db"))
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate = Migrate(app, db)

def success_response(data=None, message="OK", status=200):
    return jsonify({"success": True, "data": data, "message": message}), status

def error_response(message, code="ERROR", status=400):
    return jsonify({"success": False, "error": message, "code": code}), status

def parse_datetime_field(value, field_name, required=False, no_past=False):
    if value in (None, ""):
        if required:
            raise ValueError(f"{field_name} is required")
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = str(value).strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError as exc:
            raise ValueError(f"{field_name} must be a valid ISO datetime") from exc
    compare_value = parsed
    now = datetime.now(compare_value.tzinfo) if compare_value.tzinfo else datetime.utcnow()
    if no_past and compare_value < now:
        raise ValueError(f"{field_name} cannot be in the past")
    return parsed

@app.errorhandler(404)
def handle_not_found(_err):
    return error_response("Resource not found", "NOT_FOUND", 404)

@app.errorhandler(500)
def handle_server_error(_err):
    return error_response("Internal server error", "INTERNAL_ERROR", 500)

@app.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    # createuser: save to Users
    createuser_record = Users()
    createuser_record.username = username
    createuser_record.email = email
    createuser_record.password = password
    db.session.add(createuser_record)
    db.session.commit()
    createuser_result = createuser_record.to_dict()

    return success_response({"id": createuser_result.get("id"), "username": createuser_result.get("username"), "email": createuser_result.get("email"), "password": createuser_result.get("password")}, "Created", 201)

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    # verifycredentials: basic auth
    verifycredentials_user = Users.query.filter_by(username=username).first()
    if not verifycredentials_user or verifycredentials_user.password != password:
        return error_response("Invalid credentials", "INVALID_CREDENTIALS", 401)
    verifycredentials_result = {"token": str(verifycredentials_user.id), "user": verifycredentials_user.to_dict()}

    # generatetoken: advanced auth
    hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    jwt_token = jwt.encode({"userId": userid, "exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=86400)}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")
    generatetoken_result = {"hashedPassword": hashed_password, "jwt": jwt_token}

    return success_response({"hashedPassword": generatetoken_result.get("hashedPassword"), "jwt": generatetoken_result.get("jwt")}, "Created", 201)

@app.route("/tasks", methods=["GET"])
def listtasks():
    status = request.args.get("status")
    token = request.headers.get("token")

    # authuserlist: advanced auth
    hashed_password = bcrypt.hashpw(token.encode(), bcrypt.gensalt()).decode()
    jwt_token = jwt.encode({"userId": userid, "exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=86400)}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")
    authuserlist_result = {"hashedPassword": hashed_password, "jwt": jwt_token}

    # fetchusertasks: fetch from Tasks
    query = Tasks.query
    if userid is not None:
        query = query.filter(Tasks.user_id == userid)
    if status is not None:
        query = query.filter(Tasks.status == status)
    fetchusertasks_result = [r.to_dict() for r in query.all()]

    # sorttasks: sort by due_date
    sorttasks_items = fetchusertasks_result if isinstance(fetchusertasks_result, list) else [fetchusertasks_result] if fetchusertasks_result else []
    sorttasks_result = {"sorted": sorted(sorttasks_items, key=lambda x: x.get("due_date") if isinstance(x, dict) else getattr(x, "due_date", None), reverse=False)}

    return success_response({"sorted": sorttasks_result.get("sorted")}, "OK", 200)

@app.route("/tasks", methods=["POST"])
def createtask():
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    token = request.headers.get("token")

    # authusercreate: advanced auth
    hashed_password = bcrypt.hashpw(token.encode(), bcrypt.gensalt()).decode()
    jwt_token = jwt.encode({"userId": userid, "exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=86400)}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")
    authusercreate_result = {"hashedPassword": hashed_password, "jwt": jwt_token}

    # saveusertask: save to Tasks
    saveusertask_record = Tasks()
    saveusertask_record.user_id = userid
    saveusertask_record.title = title
    saveusertask_record.description = description
    db.session.add(saveusertask_record)
    db.session.commit()
    saveusertask_result = saveusertask_record.to_dict()

    return success_response({"id": saveusertask_result.get("id"), "user_id": saveusertask_result.get("user_id"), "title": saveusertask_result.get("title"), "description": saveusertask_result.get("description")}, "Created", 201)

@app.route("/tasks/<id>", methods=["DELETE"])
def deletetask(id):
    token = request.headers.get("token")

    # authuserdelete: advanced auth
    hashed_password = bcrypt.hashpw(token.encode(), bcrypt.gensalt()).decode()
    jwt_token = jwt.encode({"userId": userid, "exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=86400)}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")
    authuserdelete_result = {"hashedPassword": hashed_password, "jwt": jwt_token}

    # deleteownedtask: delete from Tasks
    query = Tasks.query
    query = query.filter(Tasks.id == id)
    query = query.filter(Tasks.user_id == userid)
    deleteownedtask_record = query.first_or_404()
    db.session.delete(deleteownedtask_record)
    db.session.commit()
    deleteownedtask_result = {"deleted": True}

    return success_response({"deleted": deleteownedtask_result.get("deleted")}, "OK", 200)

@app.route("/", methods=["GET"])
def homeapi():
    return success_response({"message": "This is the api for the to-do list"}, "OK", 200)

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", 5000)), debug=True)
