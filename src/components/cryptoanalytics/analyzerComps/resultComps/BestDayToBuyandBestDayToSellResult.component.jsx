import React from 'react';
import PropTypes from 'prop-types';

const BestDayToBuyandBestDayToSellResult = function Result({ resultTimeMachine }) {
  const { buyDate, sellDate } = resultTimeMachine;

  return (
    <div className="cryptoAnalyticResult">
      {buyDate !== 'dd-mm-yyyy' ? (
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
        : ''}
    </div>
  );
};

BestDayToBuyandBestDayToSellResult.defaultProps = {
  resultTimeMachine: { buyDate: 'dd-mm-yyyy', sellDate: 'dd-mm-yyyy' },
};

BestDayToBuyandBestDayToSellResult.propTypes = {
  resultTimeMachine: PropTypes.shape({
    buyDate: PropTypes.string,
    sellDate: PropTypes.string,
  }),
};

export default BestDayToBuyandBestDayToSellResult;
