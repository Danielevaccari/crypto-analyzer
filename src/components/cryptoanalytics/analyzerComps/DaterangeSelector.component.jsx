import React from 'react';
import PropTypes from 'prop-types';

const Result = function Daterange({ setstartdate, setenddate }) {
  return (
    <>
      <input required className="dateInputsForCryptoanalytics" onChange={(e) => setstartdate(e.target.value)} type="date" name="startdate" />
      <input required className="dateInputsForCryptoanalytics" onChange={(e) => setenddate(e.target.value)} type="date" name="enddate" />
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
