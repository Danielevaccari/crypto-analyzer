import React from 'react';
import PropTypes from 'prop-types';
import DownwardTrendResult from './resultComps/DownwardTrendResult.component';
import HighestVolumeResult from './resultComps/HighestVolumeResult.component';
import BestDayToBuyandBestDayToSellResult from './resultComps/BestDayToBuyandBestDayToSellResult.component';
import ButtonForResult from './resultComps/ButtonForResult.component';

const ResultSelector = function SelectWantedResulToDisplay({
  analyticFeature, volumeData, pricesData, handleMarketDataFetching,
}) {
  return (
    <>
      <div className="crypto-analytics-result">
        {analyticFeature === 'downward' ? (
          <DownwardTrendResult
            pricesData={pricesData}
          />
        ) : ''}
        {analyticFeature === 'volume' ? (
          <HighestVolumeResult
            volumeData={volumeData}
          />
        ) : ''}
        {analyticFeature === 'timemachine' ? (
          <BestDayToBuyandBestDayToSellResult
            pricesData={pricesData}
          />
        ) : ''}
      </div>
      <ButtonForResult handleMarketDataFetching={handleMarketDataFetching} />
    </>
  );
};

ResultSelector.defaultProps = {
  analyticFeature: 'downward',
  volumeData: [],
  pricesData: [],
  handleMarketDataFetching: () => { },
};

ResultSelector.propTypes = {
  analyticFeature: PropTypes.oneOf(['downward', 'volume', 'timemachine']),
  volumeData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  pricesData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  handleMarketDataFetching: PropTypes.func,
};

export default ResultSelector;
