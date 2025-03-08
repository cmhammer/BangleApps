(function() {
    const LOAD_ICON_24 = atob("GBiBAAAAAAAeAAGfwAGB4AAAcBgAOBgYHAAYDAAYDGAYBmAYBgAYBgAYBmDbBmB+BgA8DAAYDBgAHBgAOAAAcAGB4AGfwAAeAAAAAA==");

    const settings = require("Storage").readJSON("coin_info.settings.json", 1) || {};
    const db = require("Storage").readJSON("coin_info.cmc_key.json", 1) || {};
    const logFile = require("Storage").open("coin_info_log.txt", "a");
    const ciLib = require("coin_info");

    if (!(settings.tokenSelected instanceof Array)) settings.tokenSelected = [];

    let cache = {};
    return {
        name: "CoinInfo",
        items: settings.tokenSelected.map(token => {
            return {
                name: token,
                get: function() {
                    // Return cached data if available
                    if (cache[token]) {
                        return cache[token];
                    }

                    // Return placeholder while waiting for data
                    return {
                        text: "Load",
                        img: LOAD_ICON_24
                    };
                },
                show: function() {
                    var self = this;

                    // Function to fetch data from API
                    const fetchData = (callback) => {
                        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${token}${db.calcPair}`;

                        Bangle.http(url, { method: 'GET' })
                            .then(cmcResult => {
                                logFile.write("HTTP resp:" + JSON.stringify(cmcResult));
                                const apiData = JSON.parse(cmcResult.resp);
                                logFile.write("data:" + JSON.stringify(apiData));

                                let priceString = ciLib.formatPriceString(apiData.lastPrice);
                                // Update cache with fetched data
                                cache[token] = {
                                    text: `${token}\n${priceString}`,
                                };

                                callback();
                            })
                            .catch(err => {
                                logFile.write("API Error: " + JSON.stringify(err));
                                cache[token] = {
                                    text: "Error",
                                    img: LOAD_ICON_24
                                };
                                callback();
                            });
                    };

                    // Set timeout to align to the next hour and then continue updating every hour
                    // TODO get update time from settings
                    self.interval = setTimeout(function timerTimeout() {
                        fetchData(() => {
                            self.emit("redraw");
                        });
                        // Continue updating every hour
                        self.interval = setInterval(function intervalCallback() {
                            fetchData(() => {
                                self.emit("redraw");
                            });
                        }, 3600000);
                    }, 60000  - (Date.now() % 60000 ));
                },
                hide: function() {
                    if (this.interval) {
                        clearInterval(this.interval);
                        this.interval = null;
                    }
                }
            };
        })
    };
});