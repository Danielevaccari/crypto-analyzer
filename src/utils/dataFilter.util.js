const dataFilter = {

  /**
   *
   * @param {Array<Array<Number, *>>} data [[unix Time ms, data], ...]
   * @returns {Array<Array<Number, *>>} daily datapoints at 00:00 or as close as possible
   * complexity = Linear
   */
  filterMidnightDatapointsFromData: (data) => {
    if (!data) return [];
    const dailydata = [];

    let previousDay;

    data.forEach((item) => {
      const date = new Date(item[0]);
      const day = date.getUTCDay();
      const isMidnightDatapoint = date.getUTCHours() === 0;

      if (day !== previousDay && isMidnightDatapoint) {
        dailydata.push(item);
      }
      previousDay = day;
    });
    return dailydata;
  },
};

export default dataFilter;
