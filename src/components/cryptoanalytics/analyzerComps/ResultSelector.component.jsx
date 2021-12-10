import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import DownwardTrendResult from './resultComps/DownwardTrendResult.component';
import HighestVolumeResult from './resultComps/HighestVolumeResult.component';
import BestDayToBuyandBestDayToSellResult from './resultComps/BestDayToBuyandBestDayToSellResult.component';
import AnalyticsUtility from '../../../utils/AnalyticsUtility';

const ResultSelector = function SelectWantedResulToDisplay({
  analyticFeature, dataGranularity, volumeData, pricesData, handleMarketDataFetching,
}) {
  const [resultDownward, setResultDownward] = useState({ longestStreak: '0' });
  const [resultVolume, setResultVolume] = useState({ highestVolumeDay: 'dd-mm-yyyy', highestVolume: 'xxxxxxxxx' });
  const [resultTimeMachine, setResultTimeMachine] = useState({ buyDate: 'dd-mm-yyyy', sellDate: 'dd-mm-yyyy' });

  // When the analytic feature (volume, downward streak .etc) changes results are reset
  useEffect(() => {
    setResultDownward({ longestStreak: '0' });
    setResultVolume({ highestVolumeDay: 'dd-mm-yyyy', volume: 'xxxxxxxxx' });
    setResultTimeMachine({ buyDate: 'dd-mm-yyyy', sellDate: 'dd-mm-yyyy' });
  }, [analyticFeature]);

  useEffect(() => {
    switch (dataGranularity) {
      case '1hourgranularity':
        if (analyticFeature === 'downward') setResultDownward(AnalyticsUtility.calculateLongestDownwardTrendInDays(AnalyticsUtility.trimHourlyGranularityToDailyGranularity(pricesData)));

        if (analyticFeature === 'volume') setResultVolume(AnalyticsUtility.getHighestvolumeAndDate(AnalyticsUtility.getDailyAverageVolumeFromHourlyVolumeData(volumeData)));

        if (analyticFeature === 'timemachine') setResultTimeMachine(AnalyticsUtility.bestDayToBuyandBestDayToSell(AnalyticsUtility.trimHourlyGranularityToDailyGranularity(pricesData)));
        break;
      case '1daygranularity':
        if (analyticFeature === 'downward') setResultDownward(AnalyticsUtility.calculateLongestDownwardTrendInDays(pricesData));

        if (analyticFeature === 'volume') setResultVolume(AnalyticsUtility.getHighestvolumeAndDate(volumeData));

        if (analyticFeature === 'timemachine') setResultTimeMachine(AnalyticsUtility.bestDayToBuyandBestDayToSell(pricesData));
        break;
      default:
        if (analyticFeature === 'downward') setResultDownward({ longestStreak: '0' });

        if (analyticFeature === 'volume') setResultVolume({ highestVolumeDay: 'dd-mm-yyyy', volume: 'xxxxxxxxx' });

        if (analyticFeature === 'timemachine') setResultTimeMachine({ buyDate: 'dd-mm-yyyy', sellDate: 'dd-mm-yyyy' });
        break;
    }
  }, []);

  return (
    <>
      <div className="cryptoAnalyticsResult">
        {analyticFeature === 'downward' ? (
          <DownwardTrendResult
            resultDownward={resultDownward}
            dataGranularity={dataGranularity}
            pricesData={pricesData}
          />
        ) : ''}
        {analyticFeature === 'volume' ? (
          <HighestVolumeResult
            resultVolume={resultVolume}
            dataGranularity={dataGranularity}
            volumeData={volumeData}
          />
        ) : ''}
        {analyticFeature === 'timemachine' ? (
          <BestDayToBuyandBestDayToSellResult
            resultTimeMachine={resultTimeMachine}
            dataGranularity={dataGranularity}
            pricesData={pricesData}
          />
        ) : ''}
      </div>
      <button type="button" onClick={() => handleMarketDataFetching()}>
        Analyze
      </button>
    </>
  );
};

ResultSelector.defaultProps = {
  analyticFeature: 'downward',
  dataGranularity: '1hourgranularity',
  volumeData: [],
  pricesData: [],
  handleMarketDataFetching: () => { },
};

ResultSelector.propTypes = {
  analyticFeature: PropTypes.oneOf(['downward', 'volume', 'timemachine']),
  dataGranularity: PropTypes.oneOf(['1hourgranularity', '1daygranularity', 'Invalid daterange']),
  volumeData: PropTypes.arrayOf(PropTypes.shape({
    unixTimeInMs: PropTypes.number,
    price: PropTypes.number,
  })),
  pricesData: PropTypes.arrayOf(PropTypes.shape({
    unixTimeInMs: PropTypes.number,
    price: PropTypes.number,
  })),
  handleMarketDataFetching: PropTypes.func,
};

export default ResultSelector;
