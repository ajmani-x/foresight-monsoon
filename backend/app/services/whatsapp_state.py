"""
Pending-registration state for the WhatsApp intake conversation.

A farmer isn't created in farmer_store in one shot — WhatsApp messages
arrive one at a time, so registration is a short back-and-forth (name ->
district -> crop -> land size -> irrigation -> language). This tracks
where an unregistered phone number currently is in that flow.

Backed by Postgres (see db.py), same as farmer_store.py — a local JSON
file would lose all in-progress registrations on every Render redeploy.
Cleared once registration finishes and upsert_farmer() is called.
"""

from typing import Optional

from app.services import db

NAMESPACE = "whatsapp_state"

STEPS = ["name", "district", "crop", "land", "irrigation", "language"]


def get_pending(phone: str) -> Optional[dict]:
    return db.get(NAMESPACE, phone)


def start_registration(phone: str) -> dict:
    state = {"step": "name", "answers": {}}
    db.set(NAMESPACE, phone, state)
    return state


def advance(phone: str, field: str, value) -> dict:
    state = db.get(NAMESPACE, phone) or {"step": "name", "answers": {}}
    state["answers"][field] = value
    current_idx = STEPS.index(state["step"])
    state["step"] = STEPS[current_idx + 1] if current_idx + 1 < len(STEPS) else "done"
    db.set(NAMESPACE, phone, state)
    return state


def clear(phone: str) -> None:
    db.delete(NAMESPACE, phone)
