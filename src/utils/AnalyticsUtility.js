import TimeAndDateTransformations from './TimeAndDateTransformations';

const AnalyticsUtility = {

  /**
    *
    * @param {Array} pricesData 2D array with unix time and daily price [unixtime ms, price]
    * @returns {Integer} Number of decreasing days, “Price of day N is lower than price of day N-1”
    * complexity = Linear in length of array
    */
  calculateLongestDownwardTrendInDays: (pricesData) => {
    // Longest downward trend day streak
    let longestDownwardTrendDayStreak = 0;
    // Temporary downward trend day streak
    let temporaryLongestDownwardTrendDayStreak = 0;
    // Price of the previous day
    let previousDayPrice = 0;

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
   * @param {date} startdate yyyy-mm-dd
   * @param {date} enddate yyyy-mm-dd
   * @returns {String} "1hourgranularity", "1daygranularity", "Invalid daterange"
   * Determines the data granularity of data from coingecko
   */
  determineDataGranularity: (startdate, enddate) => {
    // Number of days between start - and enddate
    // 86400 seconds in a day
    const startDateUnix = TimeAndDateTransformations.getUnixtime(startdate);
    const endDateUnix = TimeAndDateTransformations.getUnixtime(enddate);
    const numberOfDaysBetweenDateRange = (endDateUnix + 3600 - startDateUnix) / 86400;

    // With date inputs numberOfDaysBetweenDateRange can not be less than 1
    // if (numberOfDaysBetweenDateRange <= 1 && numberOfDaysBetweenDateRange > 0) {
    //   return "5mingranularity"
    // }
    if (numberOfDaysBetweenDateRange <= 90 && numberOfDaysBetweenDateRange > 2) {
      return '1hourgranularity';
    }
    if (numberOfDaysBetweenDateRange > 90) {
      return '1daygranularity';
    }

    return 'Invalid daterange';
  },

  /**
   *
   * @param {Array} data  2D array with unix time and hourly data [unixtime ms, data]
   * @returns {Array}  2D array with unix time and daily (00.00) data [unixtime ms, data]
   */
  filterMidnightDatapoints: (data) => {
    if (!data) return [];
    const dailydata = [];

    // 24 datapoints in a day
    data.forEach((item) => {
      const date = new Date(item[0]);
      const midnightBool = date.getUTCHours() === 0;
      const minuteBool = date.getMinutes() <= 15;

      if (midnightBool && minuteBool) {
        dailydata.push(item);
      }
    });
    return dailydata;
  },
  filterMidnightDatapointsBetter: (data) => {
    if (!data) return [];
    const dailydata = [];

    let previousDayValue;

    // 24 datapoints in a day
    data.forEach((item) => {
      const date = new Date(item[0]);
      const day = date.getUTCDay();

      if (day !== previousDayValue) {
        dailydata.push(item);
      }
      previousDayValue = day;
    });
    console.log(dailydata);
    return dailydata;
  },

  /**
   *
   * @param {Array} data 2D array with unix time and 5min data [unixtime ms, data]
   * @returns {Array}  2D array with unix time and daily (00.00) data [unixtime ms, data]
   */
  trim5minGranularityToDailyGranularity: (data) => {
    if (!data) return [];
    const array = [];

    // 24*12 (12*5min=hour) = 288 datapoints in a day
    for (let i = 0; i < data.length; i += 288) {
      array.push(data[i]);
    }
    return array;
  },

  /**
   *
   * @param {Array} hourlyVolumeData 2D [[unixtime ms, volume data], ...]
   * @returns {Array} Array that contains time and daily volume average
   * complexity = Linear in length of array
   */
  getDailyAverageVolumeFromHourlyVolumeData: (hourlyVolumeData) => {
    const dailyVolumeAveragesWithTimes = [];
    let temporaryAverageVolume = 0;
    let count = 0;

    hourlyVolumeData.forEach((item) => {
      // item[1] is the volume
      temporaryAverageVolume += item[1];
      count += 1;
      if (count % 24 === 0) {
        // item[0] is the time (unix ms)
        dailyVolumeAveragesWithTimes.push([item[0], temporaryAverageVolume / 24]);
        temporaryAverageVolume = 0;
      }
    });
    return dailyVolumeAveragesWithTimes;
  },

  /**
   *
   * @param {Array} volumeData 2D array with unix time and daily volume [unixtime ms, volume]
   * @returns {Object}{ highestVolumeDay, highestVolume } highestVolumeDay = dd-mm-yyyy
   */
  getHighestvolumeAndDate: (volumeData) => {
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
    highestVolumeDay = TimeAndDateTransformations.getDateFromUnixTime(highestVolumeDay);
    highestVolume = Math.floor(highestVolume).toString();
    return { highestVolumeDay, highestVolume };
  },

  /**
   *
   * @param {Array} pricesData  2D array with unix time and daily price [unixtime ms, price]
   * @returns {Object} { buyDate, sellDate }
   * Returns the best day to buy and to sell to maximize profits given a certain date range
   */
  bestDayToBuyandBestDayToSell: (pricesData) => {
    let [buyDate, sellDate, maxProfitMultiplier] = [undefined, undefined, 1];

    for (let i = 0; i < pricesData.length; i += 1) {
      // eslint-disable-next-line max-len
      const [tempBuyDate, tempSellDate, tempMaxProfitMultiplier] = AnalyticsUtility.bestDayToSell(pricesData.slice(i));
      if (tempMaxProfitMultiplier > maxProfitMultiplier) {
        buyDate = tempBuyDate;
        sellDate = tempSellDate;
        maxProfitMultiplier = tempMaxProfitMultiplier;
      }
    }
    buyDate = TimeAndDateTransformations.getDateFromUnixTime(buyDate);
    sellDate = TimeAndDateTransformations.getDateFromUnixTime(sellDate);
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

export default AnalyticsUtility;
