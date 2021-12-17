import timeAndDateTransformations from './timeAndDateTransformations.util';
import dataFilter from './dataFilter.util';

const analytics = {
  /**
    *
    * @param {Array<Array<Number, Number>>} pricesData  [[unixtime ms, price], ...]
    * @returns {Number} Number of consecutive decreasing days in price
    * complexity = Linear
    */
  calculateLongestDownwardTrendInDays: (pricesDataUnfiltered) => {
    // Longest downward trend day streak
    let longestDownwardTrendDayStreak = 0;
    // Temporary downward trend day streak
    let temporaryLongestDownwardTrendDayStreak = 0;
    // Price of the previous day
    let previousDayPrice = 0;

    const pricesData = dataFilter.filterMidnightDatapointsFromData(pricesDataUnfiltered);

    // Longest downward trend in days algorithm
    if (pricesData) {
      pricesData.forEach((item) => {
        if (item[1] < previousDayPrice) {
          temporaryLongestDownwardTrendDayStreak += 1;
        } else {
          temporaryLongestDownwardTrendDayStreak = 0;
        }
        if (temporaryLongestDownwardTrendDayStreak > longestDownwardTrendDayStreak) {
          longestDownwardTrendDayStreak = temporaryLongestDownwardTrendDayStreak;
        }
        // eslint-disable-next-line no-unused-vars
        const [unixTime, prevPrice] = item;
        previousDayPrice = prevPrice;
      });
    }
    return longestDownwardTrendDayStreak;
  },

  /**
   *
   * @param {Array<Array<Number, Number>>} volumeData [[unixtime ms, volume], ...]
   * @returns {Object<String, String>}{ highestVolumeDay, highestVolume } dd-mm-yyyy
   * complexity = Linear
   */
  getHighestVolumeAndDate: (volumeDataUnfiltered) => {
    const volumeData = dataFilter.filterMidnightDatapointsFromData(volumeDataUnfiltered);
    // eslint-disable-next-line no-unused-vars
    let [highestVolumeDay, highestVolume] = [undefined, 0];

    if (volumeData) {
      volumeData.forEach((item) => {
        const [time, volume] = item;
        if (highestVolume < volume) {
          highestVolume = volume;
          highestVolumeDay = time;
        }
      });
    }
    // Transform unixDate to dd-mm-yyyy and floor and stringify volume
    highestVolumeDay = timeAndDateTransformations.getDateFromUnixTime(highestVolumeDay);
    // Less than 1 euro not relevant so floor result
    highestVolume = Math.floor(highestVolume).toString();
    return { highestVolumeDay, highestVolume };
  },

  /**
   *
   * @param {Array<Array<Number, Number>>} pricesData  [[unixtime ms, price], ...]
   * @returns {Object<String, String>}
   * Returns the best day to buy and to sell to maximize profits given a certain date range
   * complexity = N^2
   */
  bestDayToBuyAndBestDayToSell: (pricesDataUnfiltered) => {
    const pricesData = dataFilter.filterMidnightDatapointsFromData(pricesDataUnfiltered);
    let [buyDate, sellDate, maxProfitMultiplier] = [undefined, undefined, 1];

    for (let i = 0; i < pricesData.length; i += 1) {
      // eslint-disable-next-line max-len
      const [tempBuyDate, tempSellDate, tempMaxProfitMultiplier] = analytics.bestDayToSell(pricesData.slice(i));
      if (tempMaxProfitMultiplier > maxProfitMultiplier) {
        buyDate = tempBuyDate;
        sellDate = tempSellDate;
        maxProfitMultiplier = tempMaxProfitMultiplier;
      }
    }
    // If no profit date found return hold message
    if (buyDate === undefined) {
      buyDate = 'hold';
      sellDate = 'hold';
    } else {
      buyDate = timeAndDateTransformations.getDateFromUnixTime(buyDate);
      sellDate = timeAndDateTransformations.getDateFromUnixTime(sellDate);
    }
    return { buyDate, sellDate };
  },

  /**
   *
   * @param {Array<Array<Number, Number>>} pricesData  [[unixtime ms, price], ...]
   * @returns {Array<Number, {Number | String}, Number>}
   *  when no profit to be made (highestProfitMultiplier <= 1)
   * startingDate = First day in the param array,
   * maxProfitSellDate = max profit sell date,
   * maxProfitMultiplier = max profit multiplier
   * complexity = Linear
   */
  bestDayToSell: (pricesData) => {
    // Set the algorithm beginning day
    const startingDate = pricesData[0][0];

    let bestSellDate = 'Not a good time to sell!';
    let highestProfitMultiplier = 1;
    let tempMultiplier = 1;

    for (let i = 1; i < pricesData.length; i += 1) {
      const [date, price] = pricesData[i];
      // Compares previous day price to current | Example of algorithm 1*0.9*0.79*1.23*1.34
      tempMultiplier *= (price / pricesData[i - 1][1]);
      // Set maxProfitMultiplier to tempMultiplier if tempMultiplier is bigger + save date
      if (tempMultiplier > highestProfitMultiplier) {
        highestProfitMultiplier = tempMultiplier;
        bestSellDate = date;
      }
    }
    return [startingDate, bestSellDate, highestProfitMultiplier];
  },

};

export default analytics;
