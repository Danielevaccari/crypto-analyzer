import analyticsUtility from '../analytics.util';
import mockupData from '../../testData/testDataCoinGeckoMarket';

describe('test analytics.util.js', () => {
  test('downward trend 2020-01-19 / 2020-01-21', async () => {
    expect(analyticsUtility.calculateLongestDownwardTrendInDays(
      mockupData.from190120to210120.prices,
    )).toBe(2);
  });

  test('downward trend 2020-03-01 / 2021-08-01', () => {
    expect(analyticsUtility.calculateLongestDownwardTrendInDays(
      mockupData.from010320to010821.prices,
    )).toBe(8);
  });

  test('best day to buy and sell 2020-01-01 / 2020-12-31', () => {
    expect(analyticsUtility.bestDayToBuyandBestDayToSell(
      mockupData.year2020.prices,
    )).toStrictEqual({ buyDate: '17.3.2020', sellDate: '31.12.2020' });
  });

  test('best day to buy and sell 2020-03-01 / 2021-08-01', () => {
    expect(analyticsUtility.bestDayToBuyandBestDayToSell(
      mockupData.from010320to010821.prices,
    )).toStrictEqual({ buyDate: '17.3.2020', sellDate: '14.4.2021' });
  });

  test('highest volume and date 2020-01-01 / 2020-12-31', async () => {
    expect(analyticsUtility.getHighestvolumeAndDate(
      mockupData.year2020.total_volumes,
    )).toStrictEqual({ highestVolumeDay: '11.2.2020', highestVolume: '74607356578' });
  });

  test('highest volume and date 2020-03-01 / 2021-08-01', async () => {
    expect(analyticsUtility.getHighestvolumeAndDate(
      mockupData.from010320to010821.total_volumes,
    )).toStrictEqual({ highestVolumeDay: '4.1.2021', highestVolume: '146032480261' });
  });
});
