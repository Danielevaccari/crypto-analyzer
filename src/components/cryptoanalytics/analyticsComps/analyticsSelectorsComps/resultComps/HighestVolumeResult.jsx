import React, { useEffect } from 'react';
import analyticsUtility from '../../../analyticsUtility';

const HighestVolumeResult = props => {

  const handle = () => {
    if (props.dataGranularity === "1hourgranularity") {
      console.log("hourly")
      props.setresult(analyticsUtility.getHighestvolumeAndDate(analyticsUtility.getDailyAverageVolumeFromHourlyVolumeData(props.volumeData)))
    }
    else if (props.dataGranularity === "1daygranularity") {
      console.log("daily")
      props.setresult(analyticsUtility.getHighestvolumeAndDate(props.volumeData))
    }
    else if (props.dataGranularity === "Not a valid date range") {
      props.setresult("Check input")
    }
  }

  useEffect(() => {
    handle()
  }, [props.volumeData])
  return (
    <>
      <div className="cryptoAnalyticResult">Highest Volume and date: <div style={{ fontSize: ".8rem" }}>{props.result ? <span>{props.result.volume.toString().match(/.*(?=\.)/g)}e|{props.result.date ? new Date(props.result.date).toLocaleDateString().substring(0, 10) : ""}</span> : ""}</div></div>
    </>
  )
}

export default HighestVolumeResult
