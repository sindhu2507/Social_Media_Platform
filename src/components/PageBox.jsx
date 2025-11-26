import React from 'react';
import './PageBox.css';

const PageBox = ({ children }) => {
  return (
    <div className="page-container">
      <div className="page-box">
        {children}
      </div>
    </div>
  );
};

export default PageBox;
