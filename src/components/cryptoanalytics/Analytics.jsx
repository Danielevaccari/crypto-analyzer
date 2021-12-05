import React, { useState } from 'react'
import AnalyticsSelectors from './analyticsComps/AnalyticsSelectors'

const Analytics = () => {

  const [startdate, setstartdate] = useState()
  const [enddate, setenddate] = useState()
  const [analyticFeature, setanalyticFeature] = useState("downward")

  return (
    <>
      <div className="cryptoAnalyticsWrapper">
        <AnalyticsSelectors startdate={startdate} setstartdate={setstartdate} enddate={enddate} setenddate={setenddate} analyticFeature={analyticFeature} setanalyticFeature={setanalyticFeature} />
      </div>
    </>
  )
}

export default Analytics
