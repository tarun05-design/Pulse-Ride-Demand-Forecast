"""
Local Flask app for the weather-only ride demand model (R^2 ~= 0.79).

Unlike the lag-feature version, this model needs only weather and calendar inputs,
so it can forecast ANY date - including real future dates - with no history store.

Run:
    python app.py
    open http://127.0.0.1:5000
"""

import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, render_template

app = Flask(__name__)

model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

FEATURE_COLUMNS = [str(c) for c in model.feature_names_in_]
SCALED_COLUMNS = [str(c) for c in scaler.feature_names_in_]

TEMP_MIN, TEMP_MAX = -8, 39
ATEMP_MIN, ATEMP_MAX = -16, 50
WINDSPEED_MAX = 67


def normalize_inputs(temp_c, atemp_c, humidity_pct, windspeed_raw):
    norm_temp = (temp_c - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)
    norm_atemp = (atemp_c - ATEMP_MIN) / (ATEMP_MAX - ATEMP_MIN)
    norm_humidity = humidity_pct / 100.0
    norm_windspeed = windspeed_raw / WINDSPEED_MAX
    return norm_temp, norm_atemp, norm_humidity, norm_windspeed


def demand_tier(count):
    if count < 100:
        return "low"
    elif count < 300:
        return "moderate"
    elif count < 500:
        return "high"
    return "peak"


def build_feature_row(date_str, hour, season, weather, holiday, workingday,
                       temp_c, atemp_c, humidity_pct, windspeed_raw):
    target_dt = pd.to_datetime(date_str) + pd.Timedelta(hours=int(hour))

    month = target_dt.month
    dayofweek = target_dt.dayofweek
    # Model was trained on 2011 ('yr'=0) / 2012 ('yr'=1) data. For any date
    # beyond that, 'yr'=1 is the closer analogue.
    yr_flag = 0 if target_dt.year <= 2011 else 1

    norm_temp, norm_atemp, norm_humidity, norm_windspeed = normalize_inputs(
        temp_c, atemp_c, humidity_pct, windspeed_raw
    )

    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)
    month_sin = np.sin(2 * np.pi * month / 12)
    month_cos = np.cos(2 * np.pi * month / 12)

    row = {
        "yr": yr_flag,
        "holiday": holiday,
        "dayofweek": dayofweek,
        "workingday": workingday,
        "temp": norm_temp,
        "atemp": norm_atemp,
        "humidity": norm_humidity,
        "windspeed": norm_windspeed,
        "hour_sin": hour_sin,
        "hour_cos": hour_cos,
        "month_sin": month_sin,
        "month_cos": month_cos,
        "season_2": 1 if season == 2 else 0,
        "season_3": 1 if season == 3 else 0,
        "season_4": 1 if season == 4 else 0,
        "weather_2": 1 if weather == 2 else 0,
        "weather_3": 1 if weather == 3 else 0,
        "weather_4": 1 if weather == 4 else 0,
    }

    full_row = {col: row.get(col, 0) for col in FEATURE_COLUMNS}
    X = pd.DataFrame([full_row], columns=FEATURE_COLUMNS)
    X[SCALED_COLUMNS] = scaler.transform(X[SCALED_COLUMNS])
    return X, target_dt


@app.route("/", methods=["GET", "POST"])
def index():
    prediction = None
    error = None
    target_dt = None
    tier = None
    form_values = {}

    if request.method == "POST":
        form_values = request.form.to_dict()
        try:
            date_str = request.form["date"]
            hour = int(request.form["hour"])
            season = int(request.form["season"])
            weather = int(request.form["weather"])
            holiday = int(request.form["holiday"])
            workingday = int(request.form["workingday"])
            temp_c = float(request.form["temp"])
            atemp_c = float(request.form.get("atemp") or temp_c)
            humidity_pct = float(request.form["humidity"])
            windspeed_raw = float(request.form["windspeed"])

            X, target_dt = build_feature_row(
                date_str, hour, season, weather, holiday, workingday,
                temp_c, atemp_c, humidity_pct, windspeed_raw
            )
            pred_log = model.predict(X)[0]
            prediction = max(int(round(np.expm1(pred_log))), 0)
            tier = demand_tier(prediction)
        except Exception as e:
            error = str(e)

    return render_template(
        "index.html", prediction=prediction, error=error, target_dt=target_dt,
        tier=tier, form_values=form_values
    )


@app.route("/api/predict", methods=["POST"])
def api_predict():
    data = request.get_json(force=True)
    try:
        X, target_dt = build_feature_row(
            data["date"], int(data["hour"]), int(data["season"]), int(data["weather"]),
            int(data["holiday"]), int(data["workingday"]),
            float(data["temp"]), float(data.get("atemp", data["temp"])),
            float(data["humidity"]), float(data["windspeed"])
        )
        pred_log = model.predict(X)[0]
        prediction = max(int(round(np.expm1(pred_log))), 0)
        return {"predicted_count": prediction, "datetime": str(target_dt), "tier": demand_tier(prediction)}
    except Exception as e:
        return {"error": str(e)}, 400


if __name__ == "__main__":
    app.run(debug=True)
