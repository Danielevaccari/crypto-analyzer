
const analyticsUtility = {
  /**
   * 
   * @param {Date} date A date in yyyy-mm-dd form
   * @returns 
   */
  getUnixtime: date => {
    return new Date(date).getTime() / 1000
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
   * @param {Array} volumeData 2D array with unix time and daily volume [unixtime ms, volume]
   * @returns {Array} highest Volume and date in an array [unixtime ms, highest volume]
   */
  getHighestvolumeAndDate: volumeData => {

    let highestVolumeAndDate = {
      volume: 0,
      date: undefined
    }

    if (volumeData) volumeData.forEach(item => {
      if (highestVolumeAndDate.volume < item[1]) {
        highestVolumeAndDate.volume = item[1];
        highestVolumeAndDate.date = item[0];
      };
    })
    return highestVolumeAndDate;
  },

  bestDayToBuyandBestDayToSell: pricesData => {
    let dates = "Not a good time to do anything!";

    return dates;
  }

};

export default analyticsUtility;