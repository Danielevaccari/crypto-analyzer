import React from 'react';
import analyticsUtility from '../../../analyticsUtility';

const BestDayToBuyandBestDayToSellResult = props => {


  return (
    <>
      <div>Buy:
        <u>{props.result ? analyticsUtility.getDateFromUnixTime(props.result[0]) : ""}
        </u> Sell:
        <u>{props.result ? analyticsUtility.getDateFromUnixTime(props.result[1]) : ""}
        </u>
      </div>
    </>
  )
}

export default BestDayToBuyandBestDayToSellResult
