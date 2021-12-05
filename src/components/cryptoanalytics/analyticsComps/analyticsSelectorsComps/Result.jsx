import React, { useEffect, useState } from 'react';
import DownwardTrendResult from './resultComps/DownwardTrendResult';
import HighestVolumeResult from './resultComps/HighestVolumeResult';
import BestDayToBuyandBestDayToSellResult from './resultComps/BestDayToBuyandBestDayToSellResult';

const AnalyticsResult = props => {
  const [result, setresult] = useState()

  //When the analytic feature (volume, downward streak .etc) changes result is reset
  useEffect(() => {
    setresult()
  }, [props.analyticFeature])

  return (
    <>
      <div className="cryptoAnalyticsResult">
        {props.analyticFeature === "downward" ? <DownwardTrendResult
          result={result}
          setresult={setresult}
          dataGranularity={props.dataGranularity}
          pricesData={props.pricesData}
        /> : ""}
        {props.analyticFeature === "volume" ? <HighestVolumeResult
          result={result}
          setresult={setresult}
          dataGranularity={props.dataGranularity}
          volumeData={props.volumeData}
        /> : ""}
        {props.analyticFeature === "timemachine" ? <BestDayToBuyandBestDayToSellResult
          result={result}
          setresult={setresult}
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
