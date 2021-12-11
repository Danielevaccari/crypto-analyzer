import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DownwardTrendResult from './resultComps/DownwardTrendResult.component';
import HighestVolumeResult from './resultComps/HighestVolumeResult.component';
import BestDayToBuyandBestDayToSellResult from './resultComps/BestDayToBuyandBestDayToSellResult.component';
import AnalyticsUtility from '../../../utils/AnalyticsUtility';
import ButtonForResult from './resultComps/ButtonForResult.component';

const ResultSelector = function SelectWantedResulToDisplay({
  analyticFeature, volumeData, pricesData, handleMarketDataFetching, marketData,
}) {
  const [resultDownward, setResultDownward] = useState(0);
  const [resultVolume, setResultVolume] = useState({ highestVolumeDay: 'dd-mm-yyyy', highestVolume: 'xxxxxxxxx' });
  const [resultTimeMachine, setResultTimeMachine] = useState({ buyDate: 'dd-mm-yyyy', sellDate: 'dd-mm-yyyy' });

  // When the analytic feature (volume, downward streak .etc) changes results are reset
  useEffect(() => {
    setResultDownward(0);
    setResultVolume({ highestVolumeDay: 'dd-mm-yyyy', highestVolume: 'xxxxxxxxx' });
    setResultTimeMachine({ buyDate: 'dd-mm-yyyy', sellDate: 'dd-mm-yyyy' });
  }, [analyticFeature]);

  useEffect(() => {
    if (analyticFeature === 'downward') setResultDownward(AnalyticsUtility.calculateLongestDownwardTrendInDays(AnalyticsUtility.filterMidnightDatapointsBetter(pricesData)));

    if (analyticFeature === 'volume') setResultVolume(AnalyticsUtility.getHighestvolumeAndDate(AnalyticsUtility.getDailyAverageVolumeFromHourlyVolumeData(volumeData)));

    if (analyticFeature === 'timemachine') setResultTimeMachine(AnalyticsUtility.bestDayToBuyandBestDayToSell(AnalyticsUtility.filterMidnightDatapointsBetter(pricesData)));
  }, [marketData]);

  return (
    <>
      <div className="cryptoAnalyticsResult">
        {analyticFeature === 'downward' ? (
          <DownwardTrendResult
            resultDownward={resultDownward}
          />
        ) : ''}
        {analyticFeature === 'volume' ? (
          <HighestVolumeResult
            resultVolume={resultVolume}
            volumeData={volumeData}
          />
        ) : ''}
        {analyticFeature === 'timemachine' ? (
          <BestDayToBuyandBestDayToSellResult
            resultTimeMachine={resultTimeMachine}
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
  marketData: {},
};

ResultSelector.propTypes = {
  analyticFeature: PropTypes.oneOf(['downward', 'volume', 'timemachine']),
  volumeData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  pricesData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  handleMarketDataFetching: PropTypes.func,
  marketData: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number))),
};

export default ResultSelector;
