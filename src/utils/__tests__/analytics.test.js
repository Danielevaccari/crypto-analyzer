import analyticsUtility from '../analytics.util';
import CoinMarketData from '../../services/coingecko/CoinMarketData.service';

describe('test analytics.util.js', () => {
  test('downward trend 2020-01-19 / 2020-01-21', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2020-01-19', '2020-01-21');
    expect(analyticsUtility.calculateLongestDownwardTrendInDays(
      data.prices,
    )).toBe(2);
  });

  test('downward trend 2020-03-01 / 2021-08-01', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2020-03-01', '2021-08-01');
    expect(analyticsUtility.calculateLongestDownwardTrendInDays(
      data.prices,
    )).toBe(8);
  });

  test('best day to buy and sell 2021-01-01 / 09-11-2021', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2021-01-01', '2021-12-01');
    expect(analyticsUtility.bestDayToBuyandBestDayToSell(
      data.prices,
    )).toStrictEqual({ buyDate: '1.1.2021', sellDate: '9.11.2021' });
  });

  test('best day to buy and sell 2021-08-01 / 2021-09-01', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2021-08-01', '2021-09-01');
    expect(analyticsUtility.bestDayToBuyandBestDayToSell(
      data.prices,
    )).toStrictEqual({ buyDate: '4.8.2021', sellDate: '24.8.2021' });
  });

  test('highest volume and date 2021-01-01 / 2021-12-01', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2021-01-01', '2021-12-01');
    expect(analyticsUtility.getHighestvolumeAndDate(
      data.total_volumes,
    )).toStrictEqual({ highestVolumeDay: '4.1.2021', highestVolume: '146032480261' });
  });

  test('highest volume and date 2018-01-01 / 2018-12-01', async () => {
    const data = await CoinMarketData.getCoinMarketDataByDaterange('2018-01-01', '2018-12-01');
    expect(analyticsUtility.getHighestvolumeAndDate(
      data.total_volumes,
    )).toStrictEqual({ highestVolumeDay: '2.8.2018', highestVolume: '9937953011' });
  });
});
