import axios from "axios";

const coinMarketDataService = {
  /**
   * @param {unixtime} startdateUnixtime seconds
   * @param {unixtime}  enddateUnixtime second
   * @returns {object} returns market data for specific cryptocoin between two dates
   */
  getCoinMarketDataByDaterange: async (startdateUnixtime, enddateUnixtime) => {
    //Coingecko api url for coin market data | + 3600 seconds to get data for enddate

    const coinMarketDataUrl = `${process.env.REACT_APP_COINBASE_API}/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=${startdateUnixtime}&to=${enddateUnixtime + 3600}`;

    const response = await axios.get(coinMarketDataUrl);
    return response.data;
  }
};

export default coinMarketDataService;