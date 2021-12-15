import React from 'react';
import PropTypes from 'prop-types';
import analyticsUtility from '../../../../utils/analytics.util';

const HighestVolumeResult = function DisplayHighestVolumeResult({ volumeData }) {
  const { highestVolumeDay, highestVolume } = analyticsUtility.getHighestVolumeAndDate(volumeData);

  return (
    <div className="cryptoAnalyticResult">
      {highestVolumeDay !== 'Invalid Date' ? (
        <span>
          Highest Volume and date:
          <div style={{ fontSize: '.8rem' }}>
            <span>
              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(highestVolume)}
              <span>  </span>
              {highestVolumeDay}
            </span>
          </div>
        </span>
      )
        : 'Invalid input'}
    </div>
  );
};

HighestVolumeResult.defaultProps = {
  volumeData: [],
};

HighestVolumeResult.propTypes = {
  volumeData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
};

export default HighestVolumeResult;
