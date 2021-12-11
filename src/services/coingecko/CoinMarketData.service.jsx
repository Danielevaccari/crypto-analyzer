import axios from 'axios';
import TimeAndDateTransformations from '../../utils/TimeAndDateTransformations';
import AnalyticsUtility from '../../utils/AnalyticsUtility';

const CoinMarketData = {
  /**
   * @param {date} startDate  yyyy-mm-dd
   * @param {date} endDate  yyyy-mm-dd
   * @returns {object} returns market data for specific cryptocoin between two dates
   */
  getCoinMarketDataByDaterange: async (startDate, endDate) => {
    // Coingecko api url for coin market data | + 3600 seconds to get data for enddate
    const unixStartDate = TimeAndDateTransformations.getUnixtime(startDate);
    const unixEndDate = TimeAndDateTransformations.getUnixtime(endDate);

    const coinMarketDataUrl = `${process.env.REACT_APP_COINBASE_API}/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=${unixStartDate}&to=${unixEndDate + 3600}`;

    const response = await axios.get(coinMarketDataUrl);
    AnalyticsUtility.consoleLog(response.data.prices);
    console.log('nyt');
    return response.data;
  },
};

export default CoinMarketData;
