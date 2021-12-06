import React, { useEffect } from 'react';
import analyticsUtility from '../../../analyticsUtility';
const BestDayToBuyandBestDayToSellResult = props => {

  const handle = () => {
    if (props.dataGranularity === "1hourgranularity") {
      props.setresult(analyticsUtility.bestDayToBuyandBestDayToSell(analyticsUtility.trimHourlyGranularityToDailyGranularity(props.pricesData)))
    }
    else if (props.dataGranularity === "1daygranularity") {
      props.setresult(analyticsUtility.bestDayToBuyandBestDayToSell(props.pricesData))
    }
    else if (props.dataGranularity === "Not a valid date range") {
      props.setresult("Check input")
    }
  }

  useEffect(() => {
    handle()
  }, [props.pricesData])
  return (
    <>
      <div>Buy: <u>{props.result ? analyticsUtility.getDateFromUnixTime(props.result[0]) : ""}</u> Sell: <u>{props.result ? analyticsUtility.getDateFromUnixTime(props.result[1]) : ""}</u></div>
    </>
  )
}

export default BestDayToBuyandBestDayToSellResult
