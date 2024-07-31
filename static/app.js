require([
    "esri/Map",
    "esri/views/MapView",
    "esri/widgets/Search"
], function(Map, MapView, Search) {
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

    let selectedStation = null;

    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results[0];
            if (result && result.graphic) {
                selectedStation = result.graphic.attributes.stationid;
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

        fetch(`/api/weather/${selectedStation}?start_date=${startDate}&end_date=${endDate}`)
            .then(response => response.json())
            .then(data => {
                // Process and visualize the data using Chart.js
                const dates = data.map(d => d.date);
                const temps = data.map(d => d.TAVG);

                if (chart) {
                    chart.destroy();
                }

                const ctx = document.getElementById("weatherChart").getContext('2d');
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Average Temperature',
                            data: temps,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: false
                            }
                        }
                    }
                });
            })
            .catch(error => console.error('Error:', error));
    });
});