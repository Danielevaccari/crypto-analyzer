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
    <div className="crypto-analytics-wrapper">
      {/* Header */}
      <h1 className="crypto-analyzer-header">Bitcoin Analyzer</h1>
      <div className="crypto-analytics-container">
        <div className="crypto-analytics-container-top">
          <FeatureSelector
            analyticFeature={analyticFeature}
            setanalyticFeature={setanalyticFeature}
          />
        </div>
        <div className="crypto-analytics-container-middle">
          <DaterangeSelector
            startdate={startdate}
            enddate={enddate}
            setenddate={setenddate}
            setstartdate={setstartdate}
          />
        </div>
        <div className="crypto-analytics-container-bottom">
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
