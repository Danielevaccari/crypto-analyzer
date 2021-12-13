import React from 'react';
import PropTypes from 'prop-types';

const DownwardTrendResult = function DisplayDownwardTrendresult({ resultDownward }) {
  return (
    <div className="cryptoAnalyticResult">
      {resultDownward !== -1 ? (
        <span>
          {' '}
          Longest downward trend:
          <u style={{ fontSize: '.9rem' }}>
            {resultDownward}
          </u>
          days
        </span>
      ) : ''}
    </div>
  );
};

DownwardTrendResult.defaultProps = {
  resultDownward: -1,
};

DownwardTrendResult.propTypes = {
  resultDownward: PropTypes.number,
};

export default DownwardTrendResult;
