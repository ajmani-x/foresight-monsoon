"""
LLM-powered personalized advisory generator.

Takes a farmer's profile + their district's REAL forecast (from
mock_data.get_district_forecast, backed by the trained ensemble) + the
existing rule-based advisory as grounding, and asks an LLM to turn that
into a warm, personalized, WhatsApp-ready message in the farmer's
preferred language — tailored to their land size / irrigation access /
crops, rather than the generic rule-based template.

The LLM is used strictly for tone, personalization, and language — not to
invent risk numbers. The prompt hands it the real probabilities and rule-
based recommendation as fixed facts and instructs it not to add figures
that weren't given.

Provider is abstracted behind `_call_llm()` so switching between providers
is a one-function change. Currently tries Groq first (GROQ_API_KEY — fast,
free-tier-friendly inference for open models), then Anthropic
(ANTHROPIC_API_KEY) if Groq isn't configured. If neither is set,
`generate_personalized_advisory` falls back to the rule-based advisory
text unchanged and marks `llm_generated: False`, rather than failing the
request.
"""

import os
from dataclasses import asdict

from app.services.advisory_engine import generate_advisory
from app.services.farmer_store import FarmerProfile

SYSTEM_PROMPT = """You are an agricultural advisory assistant writing short WhatsApp \
messages for Indian farmers. You are given real model forecast probabilities and a \
verified rule-based recommendation — treat these as ground truth and do not invent, \
change, or add any numbers. Your job is only to personalize the tone and phrasing \
for this specific farmer's situation (their crop, land size, irrigation access) and \
write in the requested language (English or Hindi, using simple everyday words, \
not formal/literary language). Keep it under 80 words. Do not use markdown."""


def _call_groq(system_prompt: str, user_prompt: str) -> str | None:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    try:
        import groq

        client = groq.Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            max_tokens=1000,
            extra_body={"reasoning_effort": "low"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.choices[0].message.content
        return content.strip() if content else None
    except Exception as e:
        print(f"[llm_advisory] Groq call failed: {e}")
        return None


def _call_anthropic(system_prompt: str, user_prompt: str) -> str | None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=300,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return response.content[0].text.strip()
    except Exception as e:
        print(f"[llm_advisory] Anthropic call failed: {e}")
        return None


def _call_llm(system_prompt: str, user_prompt: str) -> str | None:
    """Returns the LLM's text response, or None if no provider is configured
    or all configured providers failed."""
    return _call_groq(system_prompt, user_prompt) or _call_anthropic(system_prompt, user_prompt)


def generate_personalized_advisory(farmer: FarmerProfile, forecast: dict) -> dict:
    rule_advisory = generate_advisory(forecast)
    rule_dict = asdict(rule_advisory)

    lang_label = "Hindi" if farmer.language == "hi" else "English"
    base_message = rule_dict["message_hi" if farmer.language == "hi" else "message_en"]
    base_action = rule_dict["action_hi" if farmer.language == "hi" else "action_en"]

    user_prompt = f"""Farmer: {farmer.name}
District: {forecast['district_name']}, {forecast['state']}
Crops grown: {', '.join(farmer.crops) if farmer.crops else forecast['primary_crop']}
Land size: {farmer.land_size_acres or 'unknown'} acres
Irrigation access: {'yes' if farmer.irrigation_access else 'no, rainfed only'}
Language: {lang_label}

Current forecast (real model output):
- Onset probability: {forecast['current']['onset_probability']*100:.0f}%
- Break probability: {forecast['current']['break_probability']*100:.0f}%
- Heavy rain probability: {forecast['current']['heavy_rain_probability']*100:.0f}%
- Risk level: {rule_dict['severity']}

Verified recommendation (do not change the substance):
{base_message} {base_action}

Write the personalized WhatsApp message now, in {lang_label}."""

    llm_text = _call_llm(SYSTEM_PROMPT, user_prompt)

    return {
        "llm_generated": llm_text is not None,
        "message": llm_text or f"{base_message} {base_action}",
        "severity": rule_dict["severity"],
        "rule_based_advisory": rule_dict,
    }
