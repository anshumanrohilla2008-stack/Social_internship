from __future__ import annotations

import json
import os
import sys
import tempfile
import uuid
from datetime import datetime
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
SHOP_FILE = DATA_DIR / "shop.json"
COMPANIES_FILE = DATA_DIR / "companies.json"
INQUIRIES_FILE = DATA_DIR / "inquiries.json"


def read_json(path: Path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json_atomic(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, dir=path.parent) as temp_file:
        json.dump(payload, temp_file, indent=2)
        temp_file.write("\n")
        temp_name = temp_file.name
    os.replace(temp_name, path)


def current_status(shop: dict) -> dict:
    now = datetime.now()
    weekday = now.strftime("%A")
    hours = shop["hours"]
    closed_days = set(hours.get("closedDays", []))

    if weekday in closed_days:
        return {
            "isOpenNow": False,
            "label": f"Closed today ({weekday})",
        }

    current_minutes = now.hour * 60 + now.minute
    open_hour, open_minute = map(int, hours["open"].split(":"))
    close_hour, close_minute = map(int, hours["close"].split(":"))
    open_minutes = open_hour * 60 + open_minute
    close_minutes = close_hour * 60 + close_minute
    is_open = open_minutes <= current_minutes < close_minutes
    suffix = f"today until {hours['close']}" if is_open else f"today from {hours['open']}"
    label = f"{'Open now' if is_open else 'Closed now'} | {suffix}"
    return {"isOpenNow": is_open, "label": label}


def stats_payload(shop: dict, companies: list[dict]) -> dict:
    categories = {category for company in companies for category in company.get("categories", [])}
    featured = [company for company in companies if company.get("featured")]
    return {
      "brandCount": len(companies),
      "categoryCount": len(categories),
      "featuredCount": len(featured),
      "serviceCount": len(shop.get("serviceNotes", [])),
    }


def validate_shop(payload: dict) -> list[str]:
    errors = []
    required_fields = ["name", "tagline", "phone", "address", "hours"]
    for field in required_fields:
        if field not in payload or not payload[field]:
            errors.append(f"Missing required field: {field}")

    hours = payload.get("hours", {})
    for field in ["open", "close", "days"]:
        if not hours.get(field):
            errors.append(f"Missing required hours field: {field}")

    if not isinstance(payload.get("highlights", []), list):
        errors.append("Highlights must be a list.")
    if not isinstance(payload.get("serviceNotes", []), list):
        errors.append("Service notes must be a list.")
    return errors


def validate_companies(payload) -> list[str]:
    errors = []
    if not isinstance(payload, list):
        return ["Companies data must be a list."]

    for index, company in enumerate(payload):
        if not isinstance(company, dict):
            errors.append(f"Company at index {index} must be an object.")
            continue
        for field in ["id", "name", "description", "categories"]:
            if field not in company:
                errors.append(f"Company at index {index} is missing {field}.")
        if not isinstance(company.get("categories", []), list) or not company.get("categories"):
            errors.append(f"Company at index {index} must have at least one category.")
    return errors


def validate_inquiry(payload: dict) -> list[str]:
    errors = []
    if not payload.get("name"):
        errors.append("Name is required.")
    if not payload.get("phone"):
        errors.append("Phone is required.")
    return errors


class ShopHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, payload, status=HTTPStatus.OK):
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def _bootstrap_payload(self):
        shop = read_json(SHOP_FILE)
        companies = read_json(COMPANIES_FILE)
        return {
            "shop": shop,
            "companies": companies,
            "stats": stats_payload(shop, companies),
            "status": current_status(shop),
        }

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/bootstrap":
            self._send_json(self._bootstrap_payload())
            return

        if parsed.path == "/api/inquiries":
            inquiries = read_json(INQUIRIES_FILE)
            sorted_inquiries = sorted(
                inquiries,
                key=lambda item: item.get("submittedAt", ""),
                reverse=True,
            )
            self._send_json(sorted_inquiries)
            return

        if parsed.path == "/":
            self.path = "/index.html"

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/inquiries":
            self._send_json({"error": "Not found."}, status=HTTPStatus.NOT_FOUND)
            return

        payload = self._read_body()
        if payload is None:
            self._send_json({"error": "Invalid JSON body."}, status=HTTPStatus.BAD_REQUEST)
            return

        errors = validate_inquiry(payload)
        if errors:
          self._send_json({"error": " ".join(errors)}, status=HTTPStatus.BAD_REQUEST)
          return

        inquiries = read_json(INQUIRIES_FILE)
        inquiry = {
            "id": uuid.uuid4().hex,
            "name": payload["name"].strip(),
            "phone": payload["phone"].strip(),
            "brandInterest": payload.get("brandInterest", "").strip(),
            "message": payload.get("message", "").strip(),
            "submittedAt": datetime.now().isoformat(timespec="seconds"),
        }
        inquiries.append(inquiry)
        write_json_atomic(INQUIRIES_FILE, inquiries)
        self._send_json(
            {
                "success": True,
                "id": inquiry["id"],
                "message": "Callback request saved successfully.",
            },
            status=HTTPStatus.CREATED,
        )

    def do_PUT(self):
        parsed = urlparse(self.path)
        payload = self._read_body()
        if payload is None:
            self._send_json({"error": "Invalid JSON body."}, status=HTTPStatus.BAD_REQUEST)
            return

        if parsed.path == "/api/shop":
            errors = validate_shop(payload)
            if errors:
                self._send_json({"error": " ".join(errors)}, status=HTTPStatus.BAD_REQUEST)
                return
            write_json_atomic(SHOP_FILE, payload)
            self._send_json({"success": True, "message": "Shop details updated."})
            return

        if parsed.path == "/api/companies":
            errors = validate_companies(payload)
            if errors:
                self._send_json({"error": " ".join(errors)}, status=HTTPStatus.BAD_REQUEST)
                return
            write_json_atomic(COMPANIES_FILE, payload)
            self._send_json({"success": True, "message": "Company data updated."})
            return

        self._send_json({"error": "Not found."}, status=HTTPStatus.NOT_FOUND)

    def log_message(self, format, *args):
        return


def main():
    port = 8010
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port. Use an integer port number.")
            raise SystemExit(1)

    server = ThreadingHTTPServer(("127.0.0.1", port), ShopHandler)
    print(f"Serving electronics shop app at http://127.0.0.1:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
