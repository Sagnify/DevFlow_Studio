from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import os
from pathlib import Path
from models import db, Tasks
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

@app.route("/tasks", methods=["GET"])
def listtasks():
    status = request.args.get("status")
    priority = request.args.get("priority")

    # fetchtasks: fetch from Tasks
    query = Tasks.query
    if status is not None:
        query = query.filter(Tasks.status == status)
    if priority is not None:
        query = query.filter(Tasks.priority == priority)
    fetchtasks_result = [r.to_dict() for r in query.all()]

    # sorttasks: sort by due_date
    sorttasks_items = fetchtasks_result if isinstance(fetchtasks_result, list) else [fetchtasks_result] if fetchtasks_result else []
    sorttasks_result = {"sorted": sorted(sorttasks_items, key=lambda x: x.get("due_date") if isinstance(x, dict) else getattr(x, "due_date", None), reverse=False)}

    return success_response({"sorted": sorttasks_result.get("sorted")}, "OK", 200)

@app.route("/tasks/<id>", methods=["GET"])
def gettask(id):
    # fetchtaskbyid: fetch from Tasks
    query = Tasks.query
    if id is not None:
        query = query.filter(Tasks.id == id)
    fetchtaskbyid_result = query.first_or_404().to_dict()

    return success_response({"id": fetchtaskbyid_result.get("id"), "title": fetchtaskbyid_result.get("title"), "description": fetchtaskbyid_result.get("description"), "status": fetchtaskbyid_result.get("status"), "priority": fetchtaskbyid_result.get("priority"), "due_date": fetchtaskbyid_result.get("due_date")}, "OK", 200)

@app.route("/tasks", methods=["POST"])
def createtask():
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    due_date = data.get("due_date")

    # validatetitle: validate title
    if not title:
        return error_response("Title is required", "VALIDATION_ERROR", 400)
    validatetitle_result = {"title": title, "title_valid": True}

    # validateduedate: validate due_date
    try:
        due_date = parse_datetime_field(due_date, "due_date", required=False, no_past=True)
    except ValueError as exc:
        return error_response(str(exc), "VALIDATION_ERROR", 400)
    validateduedate_result = {"due_date": due_date, "due_date_valid": True}

    # savetaskcreate: save to Tasks
    savetaskcreate_record = Tasks()
    savetaskcreate_record.title = title
    savetaskcreate_record.description = description
    savetaskcreate_record.due_date = parse_datetime_field(due_date, "due_date", required=False, no_past=True)
    db.session.add(savetaskcreate_record)
    db.session.commit()
    savetaskcreate_result = savetaskcreate_record.to_dict()

    return success_response({"id": savetaskcreate_result.get("id"), "title": savetaskcreate_result.get("title"), "description": savetaskcreate_result.get("description"), "due_date": savetaskcreate_result.get("due_date")}, "Created", 201)

@app.route("/tasks/<id>", methods=["PUT"])
def updatetask(id):
    data = request.get_json() or {}
    title = data.get("title")
    due_date = data.get("due_date")

    # validatedateupdate: validate due_date
    try:
        due_date = parse_datetime_field(due_date, "due_date", required=False, no_past=True)
    except ValueError as exc:
        return error_response(str(exc), "VALIDATION_ERROR", 400)
    validatedateupdate_result = {"due_date": due_date, "due_date_valid": True}

    # savetaskupdate: save to Tasks
    savetaskupdate_record = Tasks.query.get_or_404(id)
    savetaskupdate_record.title = title
    savetaskupdate_record.due_date = parse_datetime_field(due_date, "due_date", required=False, no_past=True)
    db.session.add(savetaskupdate_record)
    db.session.commit()
    savetaskupdate_result = savetaskupdate_record.to_dict()

    return success_response({"id": savetaskupdate_result.get("id"), "title": savetaskupdate_result.get("title"), "due_date": savetaskupdate_result.get("due_date")}, "OK", 200)

@app.route("/tasks/<id>", methods=["DELETE"])
def deletetask(id):
    # deletetaskop: delete from Tasks
    query = Tasks.query
    query = query.filter(Tasks.id == id)
    deletetaskop_record = query.first_or_404()
    db.session.delete(deletetaskop_record)
    db.session.commit()
    deletetaskop_result = {"deleted": True}

    return success_response({"deleted": deletetaskop_result.get("deleted")}, "OK", 200)

@app.route("/tasks/<id>/status", methods=["PATCH"])
def updatestatus(id):
    data = request.get_json() or {}
    status = data.get("status")

    # handlecompletedat: transform
    completed_at = datetime.utcnow() if status == "completed" else None
    handlecompletedat_result = {"completed_at": completed_at}

    # savestatusupdate: save to Tasks
    savestatusupdate_record = Tasks.query.get_or_404(id)
    savestatusupdate_record.status = status
    savestatusupdate_record.completed_at = parse_datetime_field(completed_at, "completed_at", required=False, no_past=False)
    if savestatusupdate_record.status == "completed" and not savestatusupdate_record.completed_at:
        savestatusupdate_record.completed_at = datetime.utcnow()
    if savestatusupdate_record.status != "completed":
        savestatusupdate_record.completed_at = None
    db.session.add(savestatusupdate_record)
    db.session.commit()
    savestatusupdate_result = savestatusupdate_record.to_dict()

    return success_response({"id": savestatusupdate_result.get("id"), "status": savestatusupdate_result.get("status"), "completed_at": savestatusupdate_result.get("completed_at")}, "OK", 200)

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", 5000)), debug=True)
