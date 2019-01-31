(function () {
  'use strict';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById('butRefresh').addEventListener('click', function () {
    // Refresh all of the forecasts
    app.updateForecasts();
  });

  document.getElementById('butAdd').addEventListener('click', function () {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  document.getElementById('butAddCity').addEventListener('click', function () {
    // Add the newly selected city
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedCities) {
      app.selectedCities = [];
    }
    app.getForecast(key, label);
    app.selectedCities.push({ key: key, label: label });
    app.saveSelectedCities();
    app.toggleAddDialog(false);
  });

  document.getElementById('butAddCancel').addEventListener('click', function () {
    // Close the add new city dialog
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function (visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function (data) {
    var dataLastUpdated = new Date(data.created);
    var sunrise = data.channel.astronomy.sunrise;
    var sunset = data.channel.astronomy.sunset;
    var current = data.channel.item.condition;
    var umidade = data.channel.atmosphere.umidade;
    var vento = data.channel.vento;

    var card = app.visibleCards[data.key];
    if (!card) {
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;
      card.removeAttribute('hidden');
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // Verifies the data provide is newer than what's already visible
    // on the card, if it's not bail, if it is, continue and update the
    // time saved in the card
    var cardLastUpdatedElem = card.querySelector('.card-last-updated');
    var cardLastUpdated = cardLastUpdatedElem.textContent;
    if (cardLastUpdated) {
      cardLastUpdated = new Date(cardLastUpdated);
      // Bail if the card has more recent data then the data
      if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
        return;
      }
    }
    cardLastUpdatedElem.textContent = data.created;

    card.querySelector('.description').textContent = current.text;
    card.querySelector('.date').textContent = current.date;
    card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
    card.querySelector('.current .temperature .value').textContent =
      Math.round(current.temp);
    card.querySelector('.current .sunrise').textContent = sunrise;
    card.querySelector('.current .sunset').textContent = sunset;
    card.querySelector('.current .humidity').textContent =
      Math.round(umidade) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(vento.speed);
    card.querySelector('.current .wind .direction').textContent = vento.direcao;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.channel.item.forecast[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.high);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.low);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  /*
   * Gets a forecast for a specific city and updates the card with the data.
   * getForecast() first checks if the weather data is in the cache. If so,
   * then it gets that data and populates the card with the cached data.
   * Then, getForecast() goes to the network for fresh data. If the network
   * request goes through, then the card gets updated a second time with the
   * freshest data.
   */
  app.getForecast = function (key, label) {
    var chacheName = 'weatherPWA';

    // TODO add cache logic here
    if ('caches' in window) {
      /*
       * Check if the service worker has already cached this city's weather
       * data. If the service worker has the data, then display the cached
       * data while the app fetches the latest data.
       */
      caches.match(chacheName).then(function (response) {
        if (response) {
          response.json().then(function updateFromCache(json) {
            var results = json.query.results;
            results.key = key;
            results.label = label;
            results.created = json.query.created;
            app.updateForecastCard(results);
          });
        }
      });
    }

    // Fetch the latest data.
    var city = '';
    for (var i = 0; i < cities.length; i++) {
      if (cities[i].key == key) {
        city = cities[i]
      }
    }

    if (city != null) {
      app.updateForecastCard(city);
    } else {
      // Return the initial weather forecast since no data is available.
      app.updateForecastCard(initialWeatherForecast);
    }
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function () {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function (key) {
      app.getForecast(key);
    });
  };

  // TODO add saveSelectedCities function here
  // Save list of cities to localStorage.
  app.saveSelectedCities = function () {
    var selectedCities = JSON.stringify(app.selectedCities);
    localStorage.selectedCities = selectedCities;
  };

  app.getIconClass = function (weatherCode) {
    // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
    weatherCode = parseInt(weatherCode);
    switch (weatherCode) {
      case 25: // cold
      case 32: // sunny
      case 33: // fair (night)
      case 34: // fair (day)
      case 36: // hot
      case 3200: // not available
        return 'clear-day';
      case 0: // tornado
      case 1: // tropical storm
      case 2: // hurricane
      case 6: // mixed rain and sleet
      case 8: // freezing drizzle
      case 9: // drizzle
      case 10: // freezing rain
      case 11: // showers
      case 12: // showers
      case 17: // hail
      case 35: // mixed rain and hail
      case 40: // scattered showers
        return 'rain';
      case 3: // severe thunderstorms
      case 4: // thunderstorms
      case 37: // isolated thunderstorms
      case 38: // scattered thunderstorms
      case 39: // scattered thunderstorms (not a typo)
      case 45: // thundershowers
      case 47: // isolated thundershowers
        return 'thunderstorms';
      case 5: // mixed rain and snow
      case 7: // mixed snow and sleet
      case 13: // snow flurries
      case 14: // light snow showers
      case 16: // snow
      case 18: // sleet
      case 41: // heavy snow
      case 42: // scattered snow showers
      case 43: // heavy snow
      case 46: // snow showers
        return 'snow';
      case 15: // blowing snow
      case 19: // dust
      case 20: // foggy
      case 21: // haze
      case 22: // smoky
        return 'fog';
      case 24: // windy
      case 23: // blustery
        return 'windy';
      case 26: // cloudy
      case 27: // mostly cloudy (night)
      case 28: // mostly cloudy (day)
      case 31: // clear (night)
        return 'cloudy';
      case 29: // partly cloudy (night)
      case 30: // partly cloudy (day)
      case 44: // partly cloudy
        return 'partly-cloudy-day';
    }
  };

  /*
   * Fake weather data that is presented when the user first uses the app,
   * or when the user has not saved any cities. See startup code for more
   * discussion.
   */
  var initialWeatherForecast = {
    key: '2459115',
    label: 'Monte Mor, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Ventando",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 29,
          code: 24
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  };

  //Mock



  const cities = [{
    key: '2357536',
    label: 'Americana, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Ensolarado",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 28,
          code: 32
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  {
    key: '2367105',
    label: 'Bauru, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Chuvoso",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 27,
          code: 11
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 80
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  {
    key: '2379574',
    label: 'Campinas, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Ensolarado",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 30,
          code: 32
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  {
    key: '2490383',
    label: 'Itu, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Nublado",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 28,
          code: 26
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  {
    key: '2475687',
    label: 'Paulínia, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Ventando",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 27,
          code: 24
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  {
    key: '2487956',
    label: 'São Paulo, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Ensolarado",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 31,
          code: 32
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  {
    key: '2459115',
    label: 'Monte Mor, SP',
    created: '2018-01-31T15:05:00Z',
    channel: {
      astronomy: {
        sunrise: "5:43 am",
        sunset: "8:21 pm"
      },
      item: {
        condition: {
          text: "Ventando",
          date: "Qui, 31 Jan 2019 15:05 PM BRT",
          temp: 27,
          code: 44
        },
        forecast: [
          { code: 44, high: 29, low: 20 },
          { code: 44, high: 30, low: 22 },
          { code: 4, high: 28, low: 19 },
          { code: 24, high: 27, low: 18 },
          { code: 24, high: 32, low: 21 },
          { code: 44, high: 30, low: 22 },
          { code: 44, high: 27, low: 22 }
        ]
      },
      atmosphere: {
        umidade: 56
      },
      vento: {
        speed: 25,
        direcao: 195
      }
    }
  },
  ];
  // TODO uncomment line below to test app with fake data
  app.updateForecastCard(initialWeatherForecast);

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  // TODO add startup code here
  app.selectedCities = localStorage.selectedCities;
  if (app.selectedCities) {
    app.selectedCities = JSON.parse(app.selectedCities);
    app.selectedCities.forEach(function (city) {
      app.getForecast(city.key, city.label);
    });
  } else {
    /* The user is using the app for the first time, or the user has not
     * saved any cities, so show the user some fake data. A real app in this
     * scenario could guess the user's location via IP lookup and then inject
     * that data into the page.
     */
    app.updateForecastCard(initialWeatherForecast);
    app.selectedCities = [
      { key: initialWeatherForecast.key, label: initialWeatherForecast.label }
    ];
    app.saveSelectedCities();
  }

  // TODO add service worker code here
  console.log("service");
  if ('serviceWorker' in navigator) {
    console.log("service worker");
    navigator.serviceWorker.register('service-worker.js', { scope: '/' }).then(function () { console.log('Service Worker Registered'); });
  }
})();