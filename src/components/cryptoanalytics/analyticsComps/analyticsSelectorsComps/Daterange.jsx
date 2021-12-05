import React from 'react'

const Daterange = props => {
  return (
    <>
      <input required className="dateInputsForCryptoanalytics" onChange={(e) => props.setstartdate(e.target.value)} type="date" name="startdate"></input>
      <input required className="dateInputsForCryptoanalytics" onChange={(e) => props.setenddate(e.target.value)} type="date" name="enddate"></input>
    </>
  )
}

export default Daterange
