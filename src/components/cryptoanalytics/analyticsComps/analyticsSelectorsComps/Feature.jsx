import React from 'react'

const Feature = props => {


  return (
    <>
      <select value={props.analyticFeature} onChange={e => props.setanalyticFeature(e.target.value)} className="modeSelectorSelect">
        <option value="downward">Downward trend</option>
        <option value="volume">Highest tradind volume</option>
        <option value="timemachine">Time machine</option>
      </select>
    </>
  )
}

export default Feature
