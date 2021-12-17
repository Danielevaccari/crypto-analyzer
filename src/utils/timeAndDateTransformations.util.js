const timeAndDateTransformations = {
  /**
 *
 * @param {String} date yyyy-mm-dd
 * @returns {Number} ms
 */
  getUnixtime: (date) => new Date(date).getTime() / 1000,

  /**
  *
  * @param {Number} milliseconds
  * @returns {String} dd-mm-yyyy
  */
  getDateFromUnixTime: (unixtime) => new Date(unixtime).toLocaleDateString(),

};

export default timeAndDateTransformations;
