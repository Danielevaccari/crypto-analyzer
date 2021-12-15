import React from 'react';
import PropTypes from 'prop-types';
import analytics from '../../../../utils/analytics.util';

const DownwardTrendResult = function DisplayDownwardTrendresult({ pricesData }) {
  const resultDownward = analytics.calculateLongestDownwardTrendInDays(pricesData);

  if (pricesData.length < 1) {
    return <div className="cryptoAnalyticResult">Invalid input</div>;
  }

  return (
    <div className="cryptoAnalyticResult">
      {resultDownward !== 0 ? (
        <span>
          {' '}
          Longest downward trend:
          <u style={{ fontSize: '.9rem' }}>
            {resultDownward}
          </u>
          days
        </span>
      ) : 'No downward trend'}
    </div>
  );
};

DownwardTrendResult.defaultProps = {
  pricesData: [],
};

DownwardTrendResult.propTypes = {
  pricesData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
};

export default DownwardTrendResult;
