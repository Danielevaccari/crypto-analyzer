import React from 'react';
import PropTypes from 'prop-types';

const Result = function Daterange({ setstartdate, setenddate }) {
  return (

    <>
      <div className="date-selector-container">
        <div style={{ marginLeft: '5px' }}>From</div>
        <input id="startDate" required className="date-inputs-for-cryptoanalytics" onChange={(e) => setstartdate(e.target.value)} type="date" name="startdate" />
      </div>
      <div className="date-selector-container">
        <div style={{ marginLeft: '5px' }}>To</div>
        <input id="endDate" required className="date-inputs-for-cryptoanalytics" onChange={(e) => setenddate(e.target.value)} type="date" name="enddate" />
      </div>
    </>
  );
};

Result.defaultProps = {
  setstartdate: () => { },
  setenddate: () => { },
};

Result.propTypes = {
  setstartdate: PropTypes.func,
  setenddate: PropTypes.func,
};

export default Result;
