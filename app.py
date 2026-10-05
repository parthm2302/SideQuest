"""SideQuest - backend. Flask receives requests, asks Gemma 4 (via the Gemini API), returns JSON."""
import json, os, re
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8 MB uploads
MODEL = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")

SHAPE = """Reply with ONLY valid JSON, no markdown, in this shape:
{"place": "short place name", "summary": "one sentence on the vibe",
 "quests": [{"title": "...", "why": "one or two sentences", "time": "e.g. 45 min",
 "cost": "Free | Low | Medium", "meet": "one idea for meeting locals or fellow travellers"}],
 "tip": "one practical local tip"}
Give exactly 4 quests, ordered by how well they fit the time available."""

PROMPT = """You are SideQuest, a travel guide who finds small, memorable detours.
Place: {place}. Mood: {vibe}. Time available: {hours} hours.
If a photo is attached, use it to identify the setting and its atmosphere.
"""

FOLLOWUP = """You are SideQuest, a travel guide. Place: {place}. Mood: {vibe}. Time available: {hours} hours.
Here are the current quests as JSON: {quests}
The traveller now asks: "{ask}"
Rewrite the plan to follow that request, keeping what still fits.
"""

DEMO = {"place": "Demo mode", "summary": "Add GEMINI_API_KEY to .env to get real quests from Gemma 4.",
        "quests": [{"title": "Follow the smell of breakfast", "why": "Walk until you find the busiest morning stall and order what the person ahead of you orders.",
                    "time": "45 min", "cost": "Low", "meet": "Ask the vendor what they eat themselves."}] * 4,
        "tip": "Carry small change."}

def ask_gemma(parts):
    """Send parts (text and optional image) to Gemma and return the parsed JSON reply."""
    from google import genai
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    text = client.models.generate_content(model=MODEL, contents=parts).text
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    return json.loads(text)

@app.get("/")
def index():
    return render_template("index.html")

@app.post("/api/quest")
def quest():
    place = request.form.get("place", "").strip()
    image = request.files.get("photo")
    if not place and not image:
        return jsonify(error="Add a place or upload a photo."), 400
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify(DEMO)
    try:
        from google.genai import types
        parts = [PROMPT.format(place=place or "see photo", vibe=request.form.get("vibe", "curious"),
                               hours=request.form.get("hours", "3")) + SHAPE]
        if image:
            parts.insert(0, types.Part.from_bytes(data=image.read(), mime_type=image.mimetype or "image/jpeg"))
        return jsonify(ask_gemma(parts))
    except Exception as e:
        app.logger.exception(e)
        return jsonify(error="Gemma could not plan this one. Check your API key and model name, then try again."), 502

@app.post("/api/followup")
def followup():
    data = request.get_json(silent=True) or {}
    ask = (data.get("ask") or "").strip()
    if not ask or not data.get("quests"):
        return jsonify(error="Type what you'd like to change first."), 400
    if not os.getenv("GEMINI_API_KEY"):
        return jsonify(DEMO)
    try:
        prompt = FOLLOWUP.format(place=data.get("place", ""), vibe=data.get("vibe", "curious"),
                                 hours=data.get("hours", "3"), quests=json.dumps(data["quests"]), ask=ask) + SHAPE
        return jsonify(ask_gemma([prompt]))
    except Exception as e:
        app.logger.exception(e)
        return jsonify(error="Gemma could not update the plan. Try rewording your request."), 502

if __name__ == "__main__":
    app.run(debug=True)
