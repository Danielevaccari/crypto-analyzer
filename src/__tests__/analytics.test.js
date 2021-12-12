import analyticsUtility from '../utils/analytics.util';
import CoinMarketData from '../services/coingecko/CoinMarketData.service';

describe('test AnalyticsUtility.js', () => {
  test('calculate downward trend 2020-01-19 / 2020-01-21', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2020-01-19', '2020-01-21');
    expect(analyticsUtility.calculateLongestDownwardTrendInDays(data.prices)).toBe(2);
  });

  test('calculate downward trend 2020-03-01 / 2021-08-01', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2020-03-01', '2021-08-01');
    expect(analyticsUtility.calculateLongestDownwardTrendInDays(data.prices)).toBe(8);
  });

  test('calculate best day to buy and sell 2021-01-01 / 09-11-2021', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2021-01-01', '2021-12-01');
    expect(analyticsUtility.bestDayToBuyandBestDayToSell(data.prices)).toStrictEqual({ buyDate: '1.1.2021', sellDate: '9.11.2021' });
  });

  test('calculate best day to buy and sell 01-08-2021 / 01-09-2021', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2021-08-01', '2021-09-01');
    expect(analyticsUtility.bestDayToBuyandBestDayToSell(data.prices)).toStrictEqual({ buyDate: '4.8.2021', sellDate: '24.8.2021' });
  });
});
