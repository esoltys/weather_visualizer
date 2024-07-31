require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Search",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Popup"
], function(Map, MapView, Search, Graphic, GraphicsLayer, Popup) {
    const map = new Map({
        basemap: "topo-vector"
    });

    const view = new MapView({
        container: "mapView",
        map: map,
        zoom: 3,
        center: [-98, 39] // Centered on the United States
    });

    const search = new Search({
        view: view
    });

    view.ui.add(search, "top-right");

    const stationsLayer = new GraphicsLayer();
    map.add(stationsLayer);

    let selectedStation = null;
    let selectedGraphic = null;

    function addStationsToMap(stations) {
        stations.forEach(station => {
            const point = {
                type: "point",
                longitude: station.longitude,
                latitude: station.latitude
            };

            const markerSymbol = {
                type: "simple-marker",
                color: [226, 119, 40],
                outline: {
                    color: [255, 255, 255],
                    width: 1
                }
            };

            const pointGraphic = new Graphic({
                geometry: point,
                symbol: markerSymbol,
                attributes: station,
                popupTemplate: {
                    title: station.name,
                    content: `ID: ${station.id}<br>Elevation: ${station.elevation} m`
                }
            });

            stationsLayer.add(pointGraphic);
        });
    }

    fetch('/api/stations')
        .then(response => response.json())
        .then(data => {
            addStationsToMap(data.results);
        })
        .catch(error => console.error('Error:', error));

    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results[0];
            if (result && result.graphic) {
                // Reset previously selected graphic
                if (selectedGraphic) {
                    selectedGraphic.symbol = {
                        type: "simple-marker",
                        color: [226, 119, 40],
                        outline: {
                            color: [255, 255, 255],
                            width: 1
                        }
                    };
                }

                selectedStation = result.graphic.attributes.id;
                selectedGraphic = result.graphic;

                // Highlight the selected station
                selectedGraphic.symbol = {
                    type: "simple-marker",
                    color: [0, 255, 0],
                    outline: {
                        color: [255, 255, 255],
                        width: 2
                    },
                    size: 12
                };

                const stationName = result.graphic.attributes.name;
                document.getElementById("stationInfo").innerHTML = `Selected station: ${stationName}`;
                console.log("Selected station:", selectedStation);

                // Show popup for the selected station
                view.popup.open({
                    features: [result.graphic],
                    location: result.mapPoint
                });
            }
        });
    });

    let chart = null;

    document.getElementById("fetchData").addEventListener("click", function() {
        if (!selectedStation) {
            alert("Please select a weather station on the map first.");
            return;
        }

        const startDate = document.getElementById("startDate").value;
        const endDate = document.getElementById("endDate").value;

        // Clear previous chart and show loading message
        if (chart) {
            chart.destroy();
            chart = null;
        }
        document.getElementById("weatherChart").innerHTML = "Loading data...";

        fetch(`/api/weather/${selectedStation}?start_date=${startDate}&end_date=${endDate}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.detail || `HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("Received data:", data);  // Log the received data
                if (!Array.isArray(data.results) || data.results.length === 0) {
                    throw new Error('No data available for the selected station and date range');
                }
                
                // Check if the date range was adjusted
                if (data.adjusted_range) {
                    const { start, end, original_start, original_end } = data.adjusted_range;
                    if (start !== original_start || end !== original_end) {
                        alert(`Date range adjusted due to data availability:\nOriginal range: ${original_start} to ${original_end}\nAdjusted range: ${start} to ${end}`);
                    }
                }

                // Process and visualize the data using Chart.js
                const dates = data.results.map(d => d.date.split('T')[0]);  // Extract date part
                const temps = data.results.map(d => d.value);

                const ctx = document.getElementById("weatherChart").getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Temperature',
                            data: temps,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: false,
                                title: {
                                    display: true,
                                    text: 'Temperature (°C)'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Date'
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById("weatherChart").innerHTML = `Error: ${error.message}`;
                alert(`Error: ${error.message}`);
            });
    });
});