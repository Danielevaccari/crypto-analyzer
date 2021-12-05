import React, { useEffect, useState } from 'react';
import Feature from './analyticsSelectorsComps/Feature';
import coinMarketDataService from '../../../services/coingecko/coinMarketDataService';
import Result from './analyticsSelectorsComps/Result';
import Daterange from './analyticsSelectorsComps/Daterange';
import analyticsUtility from '../analyticsUtility';

const AnalyticsSelectors = props => {
  const [marketData, setmarketData] = useState({})
  const [dataGranularity, setdataGranularity] = useState()

  const handleCryptoAnalyzing = async () => {
    const data = await coinMarketDataService.getCoinMarketDataByDaterange(analyticsUtility.getUnixtime(props.startdate), analyticsUtility.getUnixtime(props.enddate))
    setmarketData(data)
  }

  useEffect(() => {
    setdataGranularity(analyticsUtility.determineDataGranularity(analyticsUtility.getUnixtime(props.startdate), analyticsUtility.getUnixtime(props.enddate)))
  }, [marketData, props.startdate, props.enddate])

  return (
    <>
      <div className="cryptoAnalyticsContainer">
        <div className="cryptoAnalyticsContainerTop">
          <Feature
            analyticFeature={props.analyticFeature}
            setanalyticFeature={props.setanalyticFeature}
          />
        </div>
        <div className="cryptoAnalyticsContainerMiddle">
          <Daterange
            startdate={props.startdate}
            enddate={props.enddate}
            setenddate={props.setenddate}
            setstartdate={props.setstartdate}
          />
        </div>
        <div className="cryptoAnalyticsContainerBottom">
          <Result
            startdate={props.startdate}
            enddate={props.enddate}
            analyticFeature={props.analyticFeature}
            handleCryptoAnalyzing={handleCryptoAnalyzing}
            pricesData={marketData.prices}
            volumeData={marketData.total_volumes}
            dataGranularity={dataGranularity}
          />
        </div>
      </div>
    </>
  )
}

export default AnalyticsSelectors
