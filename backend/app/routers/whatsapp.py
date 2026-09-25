"""
Twilio WhatsApp Sandbox webhook.

Twilio POSTs here (form-encoded: From, Body, ...) whenever a message
arrives from a linked WhatsApp number. Unregistered numbers go through a
short step-by-step registration (name -> district -> crop -> land size ->
irrigation -> language), driven by whatsapp_state.py since WhatsApp
messages arrive one at a time rather than as one form submission.
Registered numbers get a fresh personalized advisory on every message.

Responds with TwiML (plain XML), which Twilio sends back to the farmer
as a WhatsApp reply.
"""

from xml.sax.saxutils import escape

from fastapi import APIRouter, Form
from fastapi.responses import Response

from app.services.farmer_store import FarmerProfile, get_farmer, upsert_farmer
from app.services.geocoding import geocode_place
from app.services.llm_advisory import generate_personalized_advisory
from app.services.mock_data import get_forecast_for_coordinates
from app.services.whatsapp_state import advance, clear, get_pending, start_registration

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

PROMPTS = {
    "name": "Welcome to Foresight, your monsoon advisory assistant! What's your name?",
    "district": "Which village, town, or district are you in?",
    "crop": "What crop(s) are you growing? (comma-separated, e.g. Sugarcane, Cotton)",
    "land": "How many acres of land do you farm? (reply a number, or 'skip')",
    "irrigation": "Do you have irrigation access? (yes/no)",
    "language": "Reply in English or Hindi for future messages? (en/hi)",
}

RESTART_COMMANDS = {"update", "register", "restart"}


def _twiml(message: str) -> Response:
    xml = f"<?xml version='1.0' encoding='UTF-8'?><Response><Message>{escape(message)}</Message></Response>"
    return Response(content=xml, media_type="application/xml")


def _advisory_text(farmer: FarmerProfile) -> str:
    primary_crop = farmer.crops[0] if farmer.crops else "Mixed crops"
    forecast = get_forecast_for_coordinates(
        farmer.district_name, farmer.state, farmer.lat, farmer.lon, primary_crop, horizon_days=1
    )
    result = generate_personalized_advisory(farmer, forecast)
    return result["message"]


@router.post("/webhook")
def whatsapp_webhook(From: str = Form(...), Body: str = Form(...)):
    phone = From.replace("whatsapp:", "").strip()
    text = Body.strip()

    farmer = get_farmer(phone)
    if farmer:
        if text.lower() in RESTART_COMMANDS:
            clear(phone)
            start_registration(phone)
            return _twiml(PROMPTS["name"])
        try:
            return _twiml(_advisory_text(farmer))
        except Exception as e:
            print(f"[whatsapp] advisory generation failed: {e}")
            return _twiml("Sorry, something went wrong generating your advisory. Please try again shortly.")

    pending = get_pending(phone)
    if pending is None:
        start_registration(phone)
        return _twiml(PROMPTS["name"])

    step = pending["step"]

    if step == "name":
        advance(phone, "name", text)
        return _twiml(PROMPTS["district"])

    if step == "district":
        geo = geocode_place(text)
        if geo is None:
            return _twiml(f"Couldn't find '{text}' — try a nearby larger town or city name.")
        advance(phone, "district", {"name": text, **geo})
        return _twiml(PROMPTS["crop"])

    if step == "crop":
        crops = [c.strip() for c in text.split(",") if c.strip()]
        advance(phone, "crop", crops)
        return _twiml(PROMPTS["land"])

    if step == "land":
        land = None
        if text.lower() != "skip":
            try:
                land = float(text)
            except ValueError:
                return _twiml("Please reply with a number (e.g. 2.5) or 'skip'.")
        advance(phone, "land", land)
        return _twiml(PROMPTS["irrigation"])

    if step == "irrigation":
        lower = text.lower()
        if lower not in {"yes", "no"}:
            return _twiml("Please reply 'yes' or 'no'.")
        advance(phone, "irrigation", lower == "yes")
        return _twiml(PROMPTS["language"])

    if step == "language":
        lower = text.lower()
        if lower not in {"en", "hi"}:
            return _twiml("Please reply 'en' or 'hi'.")
        state = advance(phone, "language", lower)
        answers = state["answers"]
        district = answers["district"]
        profile = FarmerProfile(
            phone=phone,
            name=answers["name"],
            district_name=district["name"],
            lat=district["lat"],
            lon=district["lon"],
            state=district["state"],
            crops=answers["crop"],
            land_size_acres=answers["land"],
            irrigation_access=answers["irrigation"],
            language=lower,
        )
        upsert_farmer(profile)
        clear(phone)
        try:
            advisory_text = _advisory_text(profile)
        except Exception as e:
            print(f"[whatsapp] advisory generation failed: {e}")
            advisory_text = "Message us anytime for your monsoon advisory."
        return _twiml(f"You're registered, {profile.name}! Here's your first advisory:\n\n{advisory_text}")

    # State got corrupted somehow — restart cleanly rather than getting stuck.
    clear(phone)
    start_registration(phone)
    return _twiml(PROMPTS["name"])
