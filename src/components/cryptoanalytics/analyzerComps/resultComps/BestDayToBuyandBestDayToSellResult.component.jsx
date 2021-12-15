import React from 'react';
import PropTypes from 'prop-types';
import analyticsUtility from '../../../../utils/analytics.util';

const BestDayToBuyandBestDayToSellResult = function Result({ pricesData }) {
  const { buyDate, sellDate } = analyticsUtility.bestDayToBuyAndBestDayToSell(pricesData);

  if (pricesData.length < 1) {
    return <div className="cryptoAnalyticResult">Invalid input</div>;
  }

  return (
    <div className="cryptoAnalyticResult">
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
