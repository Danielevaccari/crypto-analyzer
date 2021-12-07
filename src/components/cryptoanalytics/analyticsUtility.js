
const analyticsUtility = {
  /**
   * 
   * @param {Date} date A date in yyyy-mm-dd form
   * @returns 
   */
  getUnixtime: date => {
    return new Date(date).getTime() / 1000
  },

  getDateFromUnixTime: unixtime => {
    return new Date(unixtime).toLocaleDateString()
  },

  /**
    * 
    * @param {Array} pricesData 2D array with unix time and daily price [unixtime ms, price]
    * @returns {Integer} Longest downward trend withing given data, “Price of day N is lower than price of day N-1”
    * complexity = Linear in length of array
    */
  calculateLongestDownwardTrendInDays: pricesData => {
    //Longest downward trend day streak
    let longestDownwardTrendDayStreak = 0;
    //Temporary downward trend day streak
    let temporaryLongestDownwardTrendDayStreak = 0;
    //Price of the previous day
    let previousDayPrice = 0;

    //Longest downward trend in days algorithm
    if (pricesData) pricesData.forEach((item) => {
      if (item[1] < previousDayPrice) {
        temporaryLongestDownwardTrendDayStreak += 1;
      }
      else {
        temporaryLongestDownwardTrendDayStreak = 0;
      }
      if (temporaryLongestDownwardTrendDayStreak > longestDownwardTrendDayStreak) longestDownwardTrendDayStreak = temporaryLongestDownwardTrendDayStreak;

      previousDayPrice = item[1];
    })
    return longestDownwardTrendDayStreak;
  },

  /**
   * 
   * @param {unixtime} startdate 
   * @param {unixtime} enddate 
   * @returns {String} "5mingranularity" || "1hourgranularity" || "1daygranularity" || "Not a valid date range"
   * Determines the data granularity of coingecko /coins/{id}/market_chart/range endpoint which is based on date range
   */
  determineDataGranularity: (startdate, enddate) => {
    //Number of days between start - and enddate 
    const numberOfDaysBetweenDateRange = (enddate + 3600 - startdate) / 86400 //86400 seconds in a day

    //With date inputs numberOfDaysBetweenDateRange can not be less than 1
    // if (numberOfDaysBetweenDateRange <= 1 && numberOfDaysBetweenDateRange > 0) {
    //   return "5mingranularity"
    // }
    if (numberOfDaysBetweenDateRange <= 90 && numberOfDaysBetweenDateRange > 2) {
      return "1hourgranularity"
    }
    else if (numberOfDaysBetweenDateRange > 90) {
      return "1daygranularity"
    }
    else {
      return "Not a valid date range"
    }
  },

  /**
   * 
   * @param {Array} data  2D array with unix time and hourly data [unixtime ms, data]
   * @returns {Array}  2D array with unix time and daily (00.00) data [unixtime ms, data]
   */
  trimHourlyGranularityToDailyGranularity: data => {
    if (!data) return
    let array = []

    //24 datapoints in a day
    for (let i = 0; i < data.length; i += 24) {
      array.push(data[i])
    }
    return array;
  },

  /**
   * 
   * @param {Array} data 2D array with unix time and 5min data [unixtime ms, data]
   * @returns {Array}  2D array with unix time and daily (00.00) data [unixtime ms, data]
   */
  trim5minGranularityToDailyGranularity: data => {
    if (!data) return
    let array = []

    //24*12 (12*5min=hour) = 288 datapoints in a day
    for (let i = 0; i < data.length; i += 288) {
      array.push(data[i])
    }
    return array;
  },

  /**
   * 
   * @param {Array} hourlyVolumeData 2D array with unix time and hourly volume data [unixtime ms, volume data]
   * @returns {Array} Array that contains time and daily volume average
   * complexity = Linear in length of array
   */
  getDailyAverageVolumeFromHourlyVolumeData: hourlyVolumeData => {
    let dailyVolumeAveragesWithTimes = [];
    let temporaryAverageVolume = 0;
    let count = 0;

    hourlyVolumeData.forEach((item) => {
      //item[1] is the volume
      temporaryAverageVolume += item[1];
      count += 1;
      if (count % 24 === 0) {
        //item[0] is the time (unix ms)
        dailyVolumeAveragesWithTimes.push([item[0], temporaryAverageVolume / 24]);
        temporaryAverageVolume = 0;
      }
    });
    return dailyVolumeAveragesWithTimes;
  },

  /**
   * 
   * @param {Array} volumeData 2D array with unix time and daily volume [unixtime ms, volume]
   * @returns {Array} highest Volume and date in an array [unixtime ms, highest volume]
   */
  getHighestvolumeAndDate: volumeData => {

    let highestVolumeAndDate = [undefined, 0]

    if (volumeData) volumeData.forEach(item => {
      if (highestVolumeAndDate[1] < item[1]) {
        highestVolumeAndDate[1] = item[1];
        highestVolumeAndDate[0] = item[0];
      };
    })
    return highestVolumeAndDate;
  },

  /**
   * 
   * @param {Array} pricesData  2D array with unix time and daily price [unixtime ms, price]
   * @returns {Array}  [startingDate, highestProfitSellDate, highestProfitMultiplier, holdMultiplier] 
   * Returns the best day to buy and to sell to maximize profits given a certain date range of daily price data
   */
  bestDayToBuyandBestDayToSell: (pricesData) => {
    let bestDayToBuyandSell = [undefined, undefined, 1, 1];

    for (let i = 0; i < pricesData.length; i++) {
      if (analyticsUtility.bestDayToSell(pricesData.slice(i))[2] > bestDayToBuyandSell[2]) bestDayToBuyandSell = analyticsUtility.bestDayToSell(pricesData.slice(i))
    }
    return bestDayToBuyandSell;
  },

  /**
   * 
   * @param {Array} pricesData 2D array with unix time and daily price [unixtime ms, price]
   * @returns {Array} [startingDate, highestProfitSellDate, highestProfitMultiplier, holdMultiplier] || when no profit to be made (highestProfitMultiplier <= 1) [startingDate, 'Not a good time to sell!', 1, holdMultiplier]
   * startingDate = unixtime ms of the first element in pricesData, 
   * highestProfitSellDate = unixtime ms of the highest profit sell date if you bought at startingDate, 
   * highestProfitMultiplier = If you put x money in startingDate and sell in highestProfitSellDate you get x*highestProfitMultiplier money.
   * holdMultiplier =  If you put x money in startingDate and hold it until the last day in pricesData you get x*holdMultiplier money.
   */
  bestDayToSell: (pricesData) => {
    let startingDate = undefined;
    let highestProfitSellDate = "Not a good time to sell!";
    let highestProfitMultiplier = 1;
    let holdMultiplier = 1;
    //Set the algorithm beginning day 
    startingDate = pricesData[0][0]

    for (let i = 1; i < pricesData.length; i++) {
      //Compares previous day price to current and multiplies the multiplier by it | Example of algorithm 1*0.9*0.79*1.23*1.34 
      holdMultiplier = holdMultiplier * (pricesData[i][1] / pricesData[i - 1][1])
      //Set highestProfitMultiplier to holdMultiplier if holdMultiplier is bigger in that day && save date of the day
      if (holdMultiplier > highestProfitMultiplier) {
        highestProfitMultiplier = holdMultiplier
        highestProfitSellDate = pricesData[i][0]
      }
    }
    return [startingDate, highestProfitSellDate, highestProfitMultiplier, holdMultiplier];
  }

};

export default analyticsUtility;