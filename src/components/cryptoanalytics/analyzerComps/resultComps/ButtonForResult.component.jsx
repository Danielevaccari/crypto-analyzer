import React from 'react';
import PropTypes from 'prop-types';

const ButtonForResult = function ClickHandlerResult({ handleMarketDataFetching }) {
  return (
    <button type="button" onClick={() => handleMarketDataFetching()} className="buttonForResult">
      Analyze
    </button>
  );
};

ButtonForResult.defaultProps = {
  handleMarketDataFetching: () => { },
};

ButtonForResult.propTypes = {
  handleMarketDataFetching: PropTypes.func,
};

export default ButtonForResult;
