
const searchForm = document.querySelector('form');
const locationInput = document.querySelector('#location-search');

// Hourly forecast dropdown elements
const dayButton = document.querySelector('.hourly-day-button');
const dayDropdown = document.querySelector('.day-dropdown');
const dayLabel = dayButton.querySelector('span');
const hourlyCards = document.querySelectorAll('.hourly-card');

// Open and close the dropdown
dayButton.addEventListener('click', () => {
    dayDropdown.classList.toggle('show');
});

function getWeatherIcon(weatherCode) {
    if (weatherCode === 0) {
        return 'assets/images/icon-sunny.webp';
    } else if (weatherCode === 1 || weatherCode === 2) {
        return 'assets/images/icon-partly-cloudy.webp';
    } else if (weatherCode === 3) {
        return 'assets/images/icon-overcast.webp';
    } else if (weatherCode >= 51 && weatherCode <= 82) {
        return 'assets/images/icon-rain.webp';
    } else {
        return 'assets/images/icon-overcast.webp';
    }
}

// Update the hourly cards for the selected date
function updateHourlyForecast(weatherData, selectedDate) {
    let cardIndex = 0;

    // Hide all cards before filling them with the selected day's data
    hourlyCards.forEach((card) => {
        card.hidden = true;
    });

    for (let index = 0; index < weatherData.hourly.time.length; index++) {
        const timestamp = weatherData.hourly.time[index];
        const hourlyDate = timestamp.slice(0, 10);

        if (hourlyDate === selectedDate) {
            // Stop when there are no more cards to fill
            if (cardIndex >= hourlyCards.length) {
                break;
            }

            const card = hourlyCards[cardIndex];

            const iconElement = card.querySelector('img');
            const timeElement = card.querySelector('span');
            const temperatureElement = card.querySelector('p');

            // Update the weather icon
            const weatherCode = weatherData.hourly.weather_code[index];
            iconElement.src = getWeatherIcon(weatherCode);

            // Extract the hour from the API's local timestamp
            const hour = Number(timestamp.slice(11, 13));
            const displayHour = hour % 12 || 12;
            const period = hour < 12 ? 'AM' : 'PM';

            timeElement.textContent = `${displayHour} ${period}`;

            // Update the temperature
            const temperature = weatherData.hourly.temperature_2m[index];

            temperatureElement.textContent =
                `${Math.round(temperature)}°`;

            card.hidden = false;
            cardIndex++;
        }
    }
}

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const city = locationInput.value.trim();

    if (city === '') {
        alert('Please enter a city name.');
        return;
    }

    const geoUrl =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    fetch(geoUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Could not find location data.');
            }

            return response.json();
        })
        .then((data) => {
            if (!data.results || data.results.length === 0) {
                alert('City not found.');
                return;
            }

            const location = data.results[0];

            const latitude = location.latitude;
            const longitude = location.longitude;

            const weatherUrl =
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

            return fetch(weatherUrl)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Could not retrieve weather data.');
                    }

                    return response.json();
                })
                .then((weatherData) => {
                    // Current weather
                    document.querySelector('.js-city').textContent =
                        `${location.name}, ${location.country}`;

                    document.querySelector('.js-temperature').textContent =
                        `${Math.round(weatherData.current.temperature_2m)}°`;

                    document.querySelector('.js-feels-like').textContent =
                        `${Math.round(weatherData.current.apparent_temperature)}°`;

                    document.querySelector('.js-humidity').textContent =
                        `${weatherData.current.relative_humidity_2m}%`;

                    document.querySelector('.js-wind').textContent =
                        `${Math.round(weatherData.current.wind_speed_10m)} km/h`;

                    document.querySelector('.js-precipitation').textContent =
                        `${weatherData.current.precipitation} mm`;

                    document.querySelector('.js-weather-icon').src =
                        getWeatherIcon(weatherData.current.weather_code);

                    const currentDate = new Date();

                    document.querySelector('.js-date').textContent =
                        currentDate.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        });

                    // Seven-day forecast
                    const forecastCards =
                        document.querySelectorAll('.forecast-card');

                    forecastCards.forEach((card, index) => {
                        const dayElement = card.querySelector('h3');
                        const iconElement = card.querySelector('img');
                        const temperatures =
                            card.querySelectorAll('p span');

                        const date = new Date(
                            weatherData.daily.time[index] + 'T12:00:00'
                        );

                        dayElement.textContent =
                            date.toLocaleDateString('en-US', {
                                weekday: 'short'
                            });

                        iconElement.src = getWeatherIcon(
                            weatherData.daily.weather_code[index]
                        );

                        temperatures[0].textContent =
                            `${Math.round(weatherData.daily.temperature_2m_max[index])}°`;

                        temperatures[1].textContent =
                            `${Math.round(weatherData.daily.temperature_2m_min[index])}°`;
                    });

                    // Build the dropdown using dates returned by the API
                    dayDropdown.innerHTML = '';

                    weatherData.daily.time.forEach((dateString) => {
                        const date = new Date(dateString + 'T12:00:00');

                        const dayName = date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                        });

                        const button = document.createElement('button');
                        button.type = 'button';
                        button.textContent = dayName;

                        button.addEventListener('click', () => {
                            dayLabel.textContent = dayName;

                            updateHourlyForecast(
                                weatherData,
                                dateString
                            );

                            dayDropdown.classList.remove('show');
                        });

                        dayDropdown.appendChild(button);
                    });

                    // Display the first forecast day's hourly data initially
                    const firstDate = weatherData.daily.time[0];
                    const firstDateObject =
                        new Date(firstDate + 'T12:00:00');

                    dayLabel.textContent =
                        firstDateObject.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric'
                        });

                    updateHourlyForecast(weatherData, firstDate);

                    console.log(weatherData);
                });
        })
        .catch((error) => {
            console.error('Error:', error);
            alert('Something went wrong while fetching the weather. Please try again.');
        });
});

