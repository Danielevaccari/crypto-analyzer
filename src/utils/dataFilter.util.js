const dataFilter = {

  /**
   *
   * @param {Array} data [unix Time ms, data]
   * @returns {Array} daily datapoints at 00:00 or as close as possible
   * complexity = Linear
   */
  filterMidnightDatapointsFromData: (data) => {
    if (!data) return [];
    const dailydata = [];

    let previousDayValue;

    data.forEach((item) => {
      const date = new Date(item[0]);
      const day = date.getUTCDay();
      const isMidnightDatapoint = date.getUTCHours() === 0;

      if (day !== previousDayValue && isMidnightDatapoint) {
        dailydata.push(item);
      }
      previousDayValue = day;
    });
    return dailydata;
  },
};

export default dataFilter;
