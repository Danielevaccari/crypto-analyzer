import React from 'react';

const DownwardTrendResult = props => {


  return (
    <>
      <div className="cryptoAnalyticResult">Longest downward trend:
        <u style={{ fontSize: ".9rem" }}>
          {props.result}
        </u>
        {props.result ? " days" : ""}
      </div>
    </>
  )
}

export default DownwardTrendResult
