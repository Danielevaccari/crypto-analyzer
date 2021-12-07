import React, { useEffect, useState } from 'react';
import DownwardTrendResult from './resultComps/DownwardTrendResult';
import HighestVolumeResult from './resultComps/HighestVolumeResult';
import BestDayToBuyandBestDayToSellResult from './resultComps/BestDayToBuyandBestDayToSellResult';
import analyticsUtility from '../../analyticsUtility';

const AnalyticsResult = props => {
  const [result, setresult] = useState()

  //When the analytic feature (volume, downward streak .etc) changes result is reset
  useEffect(() => {
    setresult()
  }, [props.analyticFeature])

  useEffect(() => {

    switch (props.dataGranularity) {
      case "1hourgranularity":
        console.log("dd")
        if (props.analyticFeature === "downward") setresult(analyticsUtility.calculateLongestDownwardTrendInDays(analyticsUtility.trimHourlyGranularityToDailyGranularity(props.pricesData)))

        if (props.analyticFeature === "volume") setresult(analyticsUtility.getHighestvolumeAndDate(analyticsUtility.getDailyAverageVolumeFromHourlyVolumeData(props.volumeData)))

        if (props.analyticFeature === "timemachine") setresult(analyticsUtility.bestDayToBuyandBestDayToSell(analyticsUtility.trimHourlyGranularityToDailyGranularity(props.pricesData)))
        break;
      case "1daygranularity":
        if (props.analyticFeature === "downward") setresult(analyticsUtility.calculateLongestDownwardTrendInDays(props.pricesData))

        if (props.analyticFeature === "volume") setresult(analyticsUtility.getHighestvolumeAndDate(props.volumeData))

        if (props.analyticFeature === "timemachine") setresult(analyticsUtility.bestDayToBuyandBestDayToSell(props.pricesData))
        break;
      default:
        if (props.analyticFeature === "downward") setresult("Check input")

        if (props.analyticFeature === "volume") setresult({ volume: 0, date: "Check" })

        if (props.analyticFeature === "timemachine") setresult(["Check dates", "Check dates", 1, 1])
        break;
    }

  }, [props.marketData])

  return (
    <>
      <div className="cryptoAnalyticsResult">
        {props.analyticFeature === "downward" ? <DownwardTrendResult
          result={result}
          dataGranularity={props.dataGranularity}
          pricesData={props.pricesData}
        /> : ""}
        {props.analyticFeature === "volume" ? <HighestVolumeResult
          result={result}
          dataGranularity={props.dataGranularity}
          volumeData={props.volumeData}
        /> : ""}
        {props.analyticFeature === "timemachine" ? <BestDayToBuyandBestDayToSellResult
          result={result}
          dataGranularity={props.dataGranularity}
          pricesData={props.pricesData}
        /> : ""}
      </div>
      <button onClick={() => props.handleCryptoAnalyzing()}>
        Analyze
      </button>
    </>
  )
}

export default AnalyticsResult
