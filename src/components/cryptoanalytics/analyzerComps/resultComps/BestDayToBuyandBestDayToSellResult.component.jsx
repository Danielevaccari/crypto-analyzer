import React from 'react';
import PropTypes from 'prop-types';
import TimeAndDateTransformations from '../../../../utils/TimeAndDateTransformations';

const BestDayToBuyandBestDayToSellResult = function Result({ resultTimeMachine }) {
  return (
    <div>
      Buy:
      <u>
        {resultTimeMachine ? TimeAndDateTransformations.getDateFromUnixTime(resultTimeMachine[0]) : ''}
      </u>
      {' '}
      Sell:
      <u>
        {resultTimeMachine ? TimeAndDateTransformations.getDateFromUnixTime(resultTimeMachine[1]) : ''}
      </u>
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
