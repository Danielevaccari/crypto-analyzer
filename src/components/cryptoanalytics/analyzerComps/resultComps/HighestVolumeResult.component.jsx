import React from 'react';
import PropTypes from 'prop-types';

const HighestVolumeResult = function DisplayHighestVolumeResult({ resultVolume }) {
  const [highestVolumeDay, highestVolume] = resultVolume;

  return (
    <div className="cryptoAnalyticResult">
      Highest Volume and date:
      <div style={{ fontSize: '.8rem' }}>
        {resultVolume ? (
          <span>
            {Math.floor(highestVolume)}
            e|
            {highestVolumeDay ? new Date(highestVolumeDay).toLocaleDateString().substring(0, 10) : ''}
          </span>
        )
          : ''}
      </div>
    </div>
  );
};

HighestVolumeResult.defaultProps = {
  resultVolume: { highestVolumeDay: 'dd-mm-yyyy', highestVolume: 'xxxxxxxxx' },
};

HighestVolumeResult.propTypes = {
  resultVolume: PropTypes.objectOf(PropTypes.string),
};

export default HighestVolumeResult;
