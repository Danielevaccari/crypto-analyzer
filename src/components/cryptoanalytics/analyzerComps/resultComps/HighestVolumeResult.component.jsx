import React from 'react';
import PropTypes from 'prop-types';

const HighestVolumeResult = function DisplayHighestVolumeResult({ resultVolume }) {
  const { highestVolumeDay, highestVolume } = resultVolume;

  return (
    <div className="cryptoAnalyticResult">
      {highestVolumeDay !== 'dd-mm-yyyy' ? (
        <span>
          Highest Volume and date:
          <div style={{ fontSize: '.8rem' }}>
            <span>
              {highestVolume > 0 ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(highestVolume) : ''}
              <span>  </span>
              {highestVolumeDay !== 'dd-mm-yyyy' ? highestVolumeDay : ''}
            </span>
          </div>
        </span>
      )
        : ''}
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
