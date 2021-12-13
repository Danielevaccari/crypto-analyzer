const TimeAndDateTransformations = {
  /**
 *
 * @param {Date} date A date in yyyy-mm-dd
 * @returns {Number} milliseconds
 */
  getUnixtime: (date) => new Date(date).getTime() / 1000,

  /**
  *
  * @param {Number} milliseconds
  * @returns {Date} date A date in dd-mm-yyyy
  */
  getDateFromUnixTime: (unixtime) => new Date(unixtime).toLocaleDateString(),

};

export default TimeAndDateTransformations;
