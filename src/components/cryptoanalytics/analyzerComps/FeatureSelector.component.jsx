import React from 'react';
import PropTypes from 'prop-types';

const Feature = function WhatToMeasure({ analyticFeature, setanalyticFeature }) {
  return (
    <div className="modeSelectorContainer">
      <div style={{ marginLeft: '5px' }}>Feature</div>
      <select value={analyticFeature} onChange={(e) => setanalyticFeature(e.target.value)} className="modeSelectorSelect">
        <option value="downward">Downward trend</option>
        <option value="volume">Highest tradind volume</option>
        <option value="timemachine">Time machine</option>
      </select>
    </div>
  );
};

Feature.defaultProps = {
  analyticFeature: 'downward',
  setanalyticFeature: () => { },
};

Feature.propTypes = {
  analyticFeature: PropTypes.oneOf(['downward', 'volume', 'timemachine']),
  setanalyticFeature: PropTypes.func,
};

export default Feature;
