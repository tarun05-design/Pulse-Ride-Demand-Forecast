# 🚲 Pulse — Ride Demand Forecast

**Forecast hourly bike ride demand from weather and calendar conditions — for any date, past or future.**

Pulse is a Flask web app wrapped around a Random Forest model trained on real bike-share data. Pick an hour on an interactive clock face, set the weather, and get an instant estimate of ride demand — no live data feed, no history required.

![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/flask-web%20app-black)
![scikit--learn](https://img.shields.io/badge/model-random%20forest-orange)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- **Real 12-hour clock face** — drag the dial or the slider to pick an hour, flip AM/PM like a real clock. A reference curve shows a typical day's demand rhythm, reshaping between AM and PM.
- **Works for any date** — since the model reads only weather and calendar signals (no ride-count history), you can forecast yesterday, today, or years from now.
- **Glassmorphic UI** — frosted glass panels, a custom color system, and a "departure board" mono-digit result display.
- **Animated feedback** — the predicted count counts up on reveal, results fade/scale in, and a peak-demand tag pulses softly.
- **JSON API** included alongside the web form, for programmatic use.

## 📸 Preview

> _Add a screenshot or GIF of the app here once deployed —_
> `![Pulse screenshot](docs/screenshot.png)`

## 🧠 How it works

The model is a `RandomForestRegressor` trained on the real [UCI/Capital Bikeshare hourly dataset](https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset) (Fanaee-T & Gama, 2013) — the same real-world data the "Ola Bike Ride Request" Kaggle dataset is derived from.

**Inputs:** season, weather condition, holiday/working-day flags, temperature, feels-like temperature, humidity, wind speed, hour of day (cyclically encoded), month (cyclically encoded), day of week, year.

**Target:** total hourly ride count, trained on `log1p(count)` to handle the right-skewed distribution and inverted back at prediction time.

**Validation:** a **time-based train/test split** (train on the earlier 80% of the timeline, test on the most recent 20%) rather than a random split — random splitting lets a model partially "recognize" near-identical adjacent hours across the split and inflates the score. The honest result on held-out data:

| Model | R² | RMSE |
|---|---|---|
| Weather + calendar only (this app) | 0.79 | ~100 |
| + lag features (previous hours' actual counts) | 0.95 | ~50 |

This app intentionally uses the **weather-only** model. A lag-feature version scores higher, but needs real recent ride counts as input — which isn't available for genuine future dates without a live data feed. This trades some accuracy for the ability to forecast *any* date honestly, using only relationships the model actually learned.

## 🛠 Tech stack

- **Backend:** Flask, scikit-learn, pandas, NumPy, joblib
- **Frontend:** Vanilla HTML/CSS/JS (no build step) — hand-rolled SVG dial, Jinja2 templates
- **Fonts:** Space Grotesk, IBM Plex Sans, IBM Plex Mono

## 📁 Project structure

```
pulse/
├── app.py                  # Flask routes, feature engineering, prediction
├── model.pkl                # Trained RandomForestRegressor
├── scaler.pkl                # Trained StandardScaler
├── requirements.txt
├── templates/
│   ├── base.html             # Shared shell (nav, fonts, footer)
│   └── index.html            # Forecast page (clock dial + form + result)
└── static/
    ├── style.css              # Design system (glassmorphism, spacing scale)
    └── dial.js                # Clock face rendering + hour/AM-PM picker
```

## 🚀 Getting started

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
pip install -r requirements.txt
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

## 🔌 API usage

```bash
curl -X POST http://127.0.0.1:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"date": "2026-12-25", "hour": 18, "season": 1, "weather": 2,
       "holiday": 1, "workingday": 0, "temp": 2, "atemp": -1,
       "humidity": 80, "windspeed": 15}'
```

```json
{"predicted_count": 84, "datetime": "2026-12-25 18:00:00", "tier": "low"}
```

## ⚠️ Limitations

- No live data feed — every forecast is generated purely from weather/calendar inputs, not real-time conditions.
- `yr` (a training feature distinguishing 2011 vs. 2012) defaults to the more recent training year for any date beyond 2012; the model has no real concept of long-term year-over-year trends.
- This is a portfolio/learning project, not a production demand-forecasting system for an actual ride-sharing business.

## 🌐 Deployment

Deployed on [Render](https://render.com)'s free tier:
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `gunicorn app:app --bind 0.0.0.0:$PORT`

> Note: Render's free tier spins down after 15 minutes of inactivity; the first request after that takes ~30–60 seconds to wake up.

## 🙏 Acknowledgments

- Dataset: Fanaee-T, H. & Gama, J. (2013). *Event labeling combining ensemble detectors and background knowledge.* Progress in Artificial Intelligence, Springer. [UCI Bike Sharing Dataset](https://archive.ics.uci.edu/dataset/275/bike+sharing+dataset)

## 📄 License

MIT — free to use, modify, and learn from.
