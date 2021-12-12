import axios from 'axios';
import timeAndDateTransformations from '../../utils/timeAndDateTransformations.util';

const CoinMarketData = {
  /**
   * @param {date} startDate  yyyy-mm-dd
   * @param {date} endDate  yyyy-mm-dd
   * @returns {object} returns market data for specific cryptocoin between two dates
   */
  getCoinMarketDataByDaterange: async (startDate, endDate) => {
    // Coingecko api url for coin market data | + 3600 seconds to get data for enddate
    const unixStartDate = timeAndDateTransformations.getUnixtime(startDate);
    const unixEndDate = timeAndDateTransformations.getUnixtime(endDate);

    const coinMarketDataUrl = `${process.env.REACT_APP_COINBASE_API}/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=${unixStartDate}&to=${unixEndDate + 3600}`;

    const response = await axios.get(coinMarketDataUrl);
    console.log(response.data.total_volumes);
    console.log('nyt');
    console.log(new Date(1638316800000).toLocaleDateString());
    return response.data;
  },
};

export default CoinMarketData;
