# SideQuest

Upload a photo or type a place, and Gemma 4 plans four small adventures that fit your mood and free time, each with a way to meet someone new.

**Stack:** Flask (Python) backend, vanilla HTML/CSS/JS frontend, Gemma 4 via the Gemini API.

## Run it
1. `python -m venv venv` then activate it (`source venv/bin/activate` on Mac, `venv\Scripts\activate` on Windows)
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env`, add your API key, and set `GEMMA_MODEL` to the Gemma 4 id from the API docs
4. `python app.py` and open http://127.0.0.1:5000

Without a key the app runs in demo mode so you can still see the interface.

## Files
- `app.py` - backend routes and the Gemma call
- `templates/index.html` - page structure
- `static/style.css` - design
- `static/app.js` - upload, fetch and rendering of results

License: MIT
