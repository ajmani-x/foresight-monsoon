"""
Rule-based crop advisory expert system.

Deliberately NOT machine-learned: this is the explainable, auditable layer that
translates model probabilities into concrete farmer actions, mirroring how real
agri-extension advisories are structured (ICAR-style condition -> action rules).
This module is fully real today -- nothing here is mocked, and it will not change
when the ML/DL models are wired in tomorrow (it just starts consuming real
probabilities instead of mock ones).
"""

from dataclasses import dataclass


@dataclass
class Advisory:
    severity: str  # "info" | "caution" | "warning" | "critical"
    title_en: str
    title_hi: str
    message_en: str
    message_hi: str
    action_en: str
    action_hi: str


CROP_STAGE_SENSITIVITY = {
    # crude sowing-window heuristic per crop for the demo's "current growth stage" guess
    "Cotton": "sowing",
    "Soybean": "sowing",
    "Bajra": "sowing",
    "Groundnut": "sowing",
    "Paddy": "transplanting",
    "Sugarcane": "vegetative",
    "Grapes": "vegetative",
    "Jowar": "sowing",
    "Tur Dal": "sowing",
    "Tea": "vegetative",
    "Coffee": "vegetative",
    "Jute": "sowing",
    "Maize": "sowing",
    "Tapioca": "sowing",
    "Wheat/Paddy": "sowing",
}


def generate_advisory(forecast: dict) -> Advisory:
    """Core rule engine: forecast snapshot + crop -> actionable advisory.

    Priority order: break-monsoon risk > heavy rain risk > onset opportunity > routine.
    """
    current = forecast["current"]
    crop = forecast["primary_crop"]
    stage = CROP_STAGE_SENSITIVITY.get(crop, "sowing")
    onset_p = current["onset_probability"]
    break_p = current["break_probability"]
    heavy_p = current["heavy_rain_probability"]

    if break_p >= 0.65 and stage in ("sowing", "transplanting"):
        return Advisory(
            severity="critical",
            title_en=f"High break-monsoon risk for {crop}",
            title_hi=f"{crop} ke liye monsoon break ka high risk",
            message_en=(
                f"{break_p*100:.0f}% probability of an extended dry spell in the next "
                f"7-10 days during your {stage} window. Sowing now risks moisture-stress crop failure."
            ),
            message_hi=(
                f"Agle 7-10 dino mein lambe sookhe daur ki {break_p*100:.0f}% sambhavna hai, "
                f"jo aapke {stage} samay ke dauran hai. Abhi buwai karne se fasal kharab ho sakti hai."
            ),
            action_en="Delay sowing by 7-10 days. If already sown, arrange supplemental irrigation immediately.",
            action_hi="Buwai ko 7-10 din ke liye taal dein. Agar bo chuke hain, turant sinchai ka intezam karein.",
        )

    if heavy_p >= 0.6:
        return Advisory(
            severity="warning",
            title_en=f"Heavy rainfall risk for {crop} fields",
            title_hi=f"{crop} kheton ke liye bhaari barish ka khatra",
            message_en=(
                f"{heavy_p*100:.0f}% probability of heavy downpour in the next 7 days. "
                "Risk of waterlogging and nutrient runoff."
            ),
            message_hi=(
                f"Agle 7 dino mein bhaari barish ki {heavy_p*100:.0f}% sambhavna hai. "
                "Jalbharav aur poshak tatvon ke bahne ka khatra hai."
            ),
            action_en="Ensure field drainage channels are clear. Delay fertilizer application until after the spell.",
            action_hi="Khet ki nikasi naliyon ko saaf rakhein. Barish ke baad tak khaad dalna taal dein.",
        )

    if onset_p >= 0.65 and stage == "sowing":
        return Advisory(
            severity="info",
            title_en=f"Favorable onset window for {crop}",
            title_hi=f"{crop} ke liye anukool bowai samay",
            message_en=(
                f"{onset_p*100:.0f}% probability of stable monsoon onset in the next 7 days "
                "with low break risk. Conditions favor sowing."
            ),
            message_hi=(
                f"Agle 7 dino mein sthir monsoon aagman ki {onset_p*100:.0f}% sambhavna hai "
                "aur break ka khatra kam hai. Bowai ke liye sthiti anukool hai."
            ),
            action_en="Proceed with sowing. Keep a light irrigation option ready as a buffer.",
            action_hi="Bowai shuru karein. Ehtiyaat ke taur par halki sinchai ka vikalp taiyar rakhein.",
        )

    return Advisory(
        severity="info",
        title_en=f"Routine outlook for {crop}",
        title_hi=f"{crop} ke liye samanya poorvanuman",
        message_en="No significant break, heavy-rain, or onset anomaly detected for your area this week.",
        message_hi="Is hafte aapke ilake mein koi bada break, bhaari barish, ya aagman badlav nahi dekha gaya.",
        action_en="Continue routine field monitoring and standard crop calendar practices.",
        action_hi="Niyamit khet nigrani aur standard fasal calendar ka palan jaari rakhein.",
    )
