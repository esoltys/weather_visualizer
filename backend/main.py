from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from data_fetcher import get_weather_data, fetch_weather_stations
import os

app = FastAPI()

# Mount the static files directory
app.mount("/static", StaticFiles(directory="../static"), name="static")

@app.get("/")
async def root():
    return FileResponse("../static/index.html")

@app.get("/api/stations")
async def get_stations():
    try:
        stations = fetch_weather_stations()
        return stations
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weather/{station_id}")
async def get_weather(station_id: str, start_date: str, end_date: str):
    try:
        data = get_weather_data(station_id, start_date, end_date)
        return {"results": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)