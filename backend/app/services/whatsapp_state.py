"""
Pending-registration state for the WhatsApp intake conversation.

A farmer isn't created in farmer_store in one shot — WhatsApp messages
arrive one at a time, so registration is a short back-and-forth (name ->
district -> crop -> land size -> irrigation -> language). This tracks
where an unregistered phone number currently is in that flow.

Same simple JSON-file pattern as farmer_store.py, gitignored, keyed by
phone number. Cleared once registration finishes and upsert_farmer() is
called.
"""

import json
import threading
from pathlib import Path
from typing import Optional

STORE_PATH = Path(__file__).resolve().parent.parent / "data" / "whatsapp_state.json"
_lock = threading.Lock()

STEPS = ["name", "district", "crop", "land", "irrigation", "language"]


def _read_all() -> dict:
    if not STORE_PATH.exists():
        return {}
    with open(STORE_PATH) as f:
        return json.load(f)


def _write_all(data: dict) -> None:
    STORE_PATH.parent.mkdir(exist_ok=True)
    with open(STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)


def get_pending(phone: str) -> Optional[dict]:
    return _read_all().get(phone)


def start_registration(phone: str) -> dict:
    state = {"step": "name", "answers": {}}
    with _lock:
        data = _read_all()
        data[phone] = state
        _write_all(data)
    return state


def advance(phone: str, field: str, value) -> dict:
    with _lock:
        data = _read_all()
        state = data.get(phone, {"step": "name", "answers": {}})
        state["answers"][field] = value
        current_idx = STEPS.index(state["step"])
        state["step"] = STEPS[current_idx + 1] if current_idx + 1 < len(STEPS) else "done"
        data[phone] = state
        _write_all(data)
    return state


def clear(phone: str) -> None:
    with _lock:
        data = _read_all()
        data.pop(phone, None)
        _write_all(data)
