import React from 'react';
import PropTypes from 'prop-types';
import analytics from '../../../../utils/analytics.util';

const BestDayToBuyandBestDayToSellResult = function Result({ pricesData }) {
  const { buyDate, sellDate } = analytics.bestDayToBuyAndBestDayToSell(pricesData);

  if (pricesData.length < 1) {
    return <div className="crypto-analytics-result">Check dates</div>;
  }

  return (
    <div className="crypto-analytics-result">
      {buyDate !== 'hold' ? (
        <span>
          {' '}
          Buy:
          <u>
            {buyDate}
          </u>
          {' '}
          Sell:
          <u>
            {sellDate}
          </u>
        </span>
      )
        : 'Hold'}
    </div>
  );
};

BestDayToBuyandBestDayToSellResult.defaultProps = {
  pricesData: [],
};

BestDayToBuyandBestDayToSellResult.propTypes = {
  pricesData: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
};

export default BestDayToBuyandBestDayToSellResult;
