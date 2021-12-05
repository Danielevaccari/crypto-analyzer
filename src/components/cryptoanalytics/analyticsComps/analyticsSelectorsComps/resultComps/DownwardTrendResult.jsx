import React, { useEffect } from 'react';
import analyticsUtility from '../../../analyticsUtility';
const DownwardTrendResult = props => {

  const handle = () => {
    // if (props.dataGranularity === "5mingranularity") {
    //   setresult(0)
    // }
    if (props.dataGranularity === "1hourgranularity") {
      props.setresult(analyticsUtility.calculateLongestDownwardTrendInDays(analyticsUtility.trimHourlyGranularityToDailyGranularity(props.pricesData)))
    }
    else if (props.dataGranularity === "1daygranularity") {
      console.log("daily")
      props.setresult(analyticsUtility.calculateLongestDownwardTrendInDays(props.pricesData))
    }
    else if (props.dataGranularity === "Not a valid date range") {
      console.log("Not a valid date range")
      props.setresult("Check input")
    }
  }

  useEffect(() => {
    handle()
  }, [props.pricesData])

  return (
    <>
      <div className="cryptoAnalyticResult">Longest downward trend: <u style={{ fontSize: ".9rem" }}>{props.result}</u>{props.result ? " days" : ""}</div>
    </>
  )
}

export default DownwardTrendResult
