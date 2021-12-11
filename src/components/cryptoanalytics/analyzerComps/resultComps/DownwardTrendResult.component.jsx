import React from 'react';
import PropTypes from 'prop-types';

const DownwardTrendResult = function DisplayDownwardTrendresult({ resultDownward }) {
  return (
    <div className="cryptoAnalyticResult">
      Longest downward trend:
      <u style={{ fontSize: '.9rem' }}>
        {resultDownward}
      </u>
      {resultDownward ? ' days' : ''}
    </div>
  );
};

DownwardTrendResult.defaultProps = {
  resultDownward: 0,
};

DownwardTrendResult.propTypes = {
  resultDownward: PropTypes.number,
};

export default DownwardTrendResult;
