import React from 'react';
import PropTypes from 'prop-types';
import analytics from '../../../../utils/analytics.util';

const HighestVolumeResult = function DisplayHighestVolumeResult({ volumeData }) {
  const { highestVolumeDay, highestVolume } = analytics.getHighestVolumeAndDate(volumeData);

  return (
    <div className="crypto-analytics-result">
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
