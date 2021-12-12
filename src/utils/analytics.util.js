import timeAndDateTransformations from './timeAndDateTransformations.util';
import dataFilter from './dataFilter.util';

const analyticsUtility = {

  /**
    *
    * @param {Array} pricesData 2D array with unix time and daily price [unixtime ms, price]
    * @returns {Integer} Number of decreasing days, “Price of day N is lower than price of day N-1”
    * complexity = Linear in length of array
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

  // DELETE THIS
  consoleLog: (data) => {
    data.forEach((item) => {
      console.log(item[1]);
    });
  },

  /**
   *
   * @param {Array} volumeData 2D array with unix time and daily volume [unixtime ms, volume]
   * @returns {Object}{ highestVolumeDay, highestVolume } highestVolumeDay = dd-mm-yyyy
   */
  getHighestvolumeAndDate: (volumeDataUnfiltered) => {
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
    highestVolume = Math.floor(highestVolume).toString();
    return { highestVolumeDay, highestVolume };
  },

  /**
   *
   * @param {Array} pricesData  2D array with unix time and price [unixtime ms, price]
   * @returns {Object} { buyDate, sellDate }
   * Returns the best day to buy and to sell to maximize profits given a certain date range
   */
  bestDayToBuyandBestDayToSell: (pricesDataUnfiltered) => {
    const pricesData = dataFilter.filterMidnightDatapointsFromData(pricesDataUnfiltered);
    let [buyDate, sellDate, maxProfitMultiplier] = [undefined, undefined, 1];

    for (let i = 0; i < pricesData.length; i += 1) {
      // eslint-disable-next-line max-len
      const [tempBuyDate, tempSellDate, tempMaxProfitMultiplier] = analyticsUtility.bestDayToSell(pricesData.slice(i));
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
   * @param {Array} pricesData 2D array with unix time and daily price [unixtime ms, price]
   * @returns {Array} [startingDate, bestSellDate, maxProfitMultiplier, holdMultiplier]
   *  when no profit to be made (highestProfitMultiplier <= 1)
   * startingDate = unixtime ms of the first element in pricesData,
   * maxProfitSellDate = unixtime ms of the highest profit sell date if you bought at startingDate,
   * maxProfitMultiplier = multiplier of money put in
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

export default analyticsUtility;
