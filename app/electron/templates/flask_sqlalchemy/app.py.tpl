{{imports}}

# Load .env
_env = Path(__file__).parent / ".env"
if _env.exists():
    for _l in _env.read_text().splitlines():
        if _l.strip() and not _l.startswith("#") and "=" in _l:
            _k, _v = _l.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

app = Flask(__name__)
CORS(app)
{{config}}

{{init}}

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

{{routes}}

if __name__ == "__main__":
    app.run(host=os.getenv("HOST", "{{host}}"), port=int(os.getenv("PORT", {{port}})), debug={{debug}})
