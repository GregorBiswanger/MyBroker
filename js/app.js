(function () {
    'use strict';
    var stocks = [];
    var stockData = [];
    var db = new PouchDB('my_database');

    document.querySelector('.nav-wrapper.container').addEventListener('click', function (eventArgs) {
        if (navigator.onLine) {
            if (eventArgs.srcElement.innerHTML === 'loop' ||
                eventArgs.srcElement.innerText === 'loopAktualisieren') {
                loadStockData();
            } else if (eventArgs.srcElement.innerHTML === 'add' ||
                eventArgs.srcElement.innerText === 'addHinzufügen') {
                document.getElementById('newStock').classList.remove('hide');
                document.getElementById('stocks').classList.add('hide');
            }
        } else {
            Materialize.toast('Sorry! Sie sind Offline!', 4000, 'red');
        }
    });

    document.getElementById('addStock').addEventListener('click', function () {
        var stockName = document.getElementById('name').value;
        if (stockName) {
            stocks.push(stockName);

            db.get('stocks').catch(function (error) {
                if (error.name === 'not_found') {
                    return {
                        _id: 'stocks'
                    };
                }
            }).then(function (data) {
                data.stocks = stocks;
                db.put(data);
            });

            loadStockData();
        }
        document.getElementById('name').value = '';
        document.getElementById('newStock').classList.add('hide');
        document.getElementById('stocks').classList.remove('hide');
    });

    function loadStockData() {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState === XMLHttpRequest.DONE) {
                if (httpRequest.status === 200) {
                    var response = httpRequest.response.replace('//', '');
                    stockData = JSON.parse(response);
                    renderStockUI();
                }
            }
        };

        httpRequest.open('GET', getServiceUrl());
        httpRequest.send();
    }

    function getServiceUrl() {
        var url = 'https://stockplaceholder.herokuapp.com/api/stocks/' + stocks.join('/');

        return encodeURI(url);
    }

    function renderStockUI() {
        var cardTemplate = document.getElementById('cardTemplate');
        var fragment = document.createDocumentFragment();

        stockData.forEach(function (stock) {
            var card = cardTemplate.cloneNode(true);
            card.querySelector('.card-title').textContent = stock.name + ' (' + stock.symbol + ')';
            card.querySelector('#DateTime').textContent = stock.lastTradeDate + ' - ' + stock.lastTradeTime;
            card.querySelector('#LastTradePrice').textContent = stock.lastTradePriceOnly + ' ' + stock.currency;
            card.querySelector('#Change').textContent = stock.change;
            card.querySelector('#Change').className += stock.change.indexOf('+') > -1 ? ' green' : ' red';
            card.querySelector('#ChangeinPercent').textContent = stock.changeinPercent;
            card.removeAttribute('hidden');
            fragment.appendChild(card);
        });

        document.getElementById('stocks').innerHTML = '';
        document.getElementById('stocks').appendChild(fragment);
    }

    db.get('stocks').catch(function (error) {
        if (error.name === 'not_found') {
            return {
                _id: 'stocks',
                stocks: ['MSFT', 'AAPL']
            };
        }
    }).then(function (data) {
        stocks = data.stocks;
        loadStockData();
    }).catch(function () {
        loadStockData();
    });

    if (navigator.serviceWorker) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(function (swPushNotification) {
                console.log('Service Worker Registered');

                if (window.PushManager) {
                    swPushNotification.pushManager.subscribe({
                        userVisibleOnly: true
                    }).then(function (subscription) {
                        console.log('User is subscribed:', subscription);
                    }).catch(function (error) {
                        if (Notification.permission === 'denied') {
                            console.warn('Permission for notifications was denied');
                        } else {
                            console.error('Failed to subscribe the user: ', error);
                        }
                    });
                }
            });
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    function updateOnlineStatus() {
        if (navigator.onLine) {
            Materialize.toast('Sie sind wieder Online', 4000, 'green');
            loadStockData();
        } else {
            Materialize.toast('Sie sind jetzt Offline', 4000, 'red');
        }

        var elements = document.querySelectorAll('.nav-wrapper.container li a');
        elements.forEach(function (element) {
            element.classList.remove('white-text');
            element.classList.remove('blue-text');
            element.classList.add(navigator.onLine ? 'white-text' : 'blue-text');
        });
    }

    if (window.Notification) {
        Notification.requestPermission(function (status) {
            console.log('Notification permission status:', status);
        });
    } else {
        console.log('This browser does not support notifications!');
    }

    function displayNotification() {
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.getRegistration().then(function (registration) {

                var options = {
                    body: 'First notification!',
                    icon: 'images/notification-flat.png',
                    vibrate: [100, 50, 100],
                    data: {
                        dateOfArrival: Date.now(),
                        primaryKey: 1
                    },
                    actions: [
                        {
                            action: 'payShare', title: 'Aktie kaufen?',
                            icon: 'images/checkmark.png'
                        },
                        {
                            action: 'close', title: 'Schließen',
                            icon: 'images/xmark.png'
                        },
                    ]
                };

                registration.showNotification('Hello world!', options);
            });
        }
    }

    displayNotification();
}());
