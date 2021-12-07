import React from 'react';

const HighestVolumeResult = props => {

  return (
    <>
      <div className="cryptoAnalyticResult">Highest Volume and date:
        <div style={{ fontSize: ".8rem" }}>{props.result ?
          <span>
            {Math.floor(props.result[1])}e|{props.result[0] ? new Date(props.result[0]).toLocaleDateString().substring(0, 10) : ""}
          </span> : ""}
        </div>
      </div>
    </>
  )
}

export default HighestVolumeResult
