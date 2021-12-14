import React, { useState } from 'react';
import FeatureSelector from './analyzerComps/FeatureSelector.component';
import CoinMarketDataService from '../../services/coingecko/CoinMarketData.service';
import ResultSelector from './analyzerComps/ResultSelector.component';
import DaterangeSelector from './analyzerComps/DaterangeSelector.component';

const Analyzer = function CryptoAnalyzer() {
  // Application state
  const [marketData, setmarketData] = useState({ prices: [], total_volumes: [] });
  const [startdate, setstartdate] = useState();
  const [enddate, setenddate] = useState();
  const [analyticFeature, setanalyticFeature] = useState('downward');

  const handleMarketDataFetching = async () => {
    setmarketData(await CoinMarketDataService.getCoinMarketDataByDaterange(startdate, enddate));
  };

  return (
    <div className="cryptoAnalyticsWrapper">
      {/* Header */}
      <h1 className="cryptoAnalyzerHeader">Crypto Analyzer</h1>
      <div className="cryptoAnalyticsContainer">
        <div className="cryptoAnalyticsContainerTop">
          <FeatureSelector
            analyticFeature={analyticFeature}
            setanalyticFeature={setanalyticFeature}
          />
        </div>
        <div className="cryptoAnalyticsContainerMiddle">
          <DaterangeSelector
            startdate={startdate}
            enddate={enddate}
            setenddate={setenddate}
            setstartdate={setstartdate}
          />
        </div>
        <div className="cryptoAnalyticsContainerBottom">
          <ResultSelector
            analyticFeature={analyticFeature}
            handleMarketDataFetching={handleMarketDataFetching}
            pricesData={marketData.prices}
            volumeData={marketData.total_volumes}
          />
        </div>
      </div>
    </div>
  );
};

export default Analyzer;
