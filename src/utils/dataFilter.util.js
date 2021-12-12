const dataFilter = {
  filterMidnightDatapointsFromData: (data) => {
    if (!data) return [];
    const dailydata = [];

    let previousDayValue;

    data.forEach((item) => {
      const date = new Date(item[0]);
      const day = date.getUTCDay();
      const midnightBool = date.getUTCHours() === 0;
      const minuteBool = date.getMinutes() <= 15;

      if (day !== previousDayValue && midnightBool && minuteBool) {
        dailydata.push(item);
      }
      previousDayValue = day;
    });
    console.log(dailydata);
    return dailydata;
  },
};

export default dataFilter;
