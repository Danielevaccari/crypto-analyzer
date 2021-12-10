const TimeAndDateTransformations = {
  /**
 *
 * @param {Date} date A date in yyyy-mm-dd
 * @returns {Number} milliseconds
 */
  getUnixtime: (date) => new Date(date).getTime() / 1000,

  getDateFromUnixTime: (unixtime) => new Date(unixtime).toLocaleDateString(),

};

export default TimeAndDateTransformations;
