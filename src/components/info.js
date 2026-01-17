import React, { useState } from 'react';

const Info = () => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <span 
      className="hover-container"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <span className="question-mark">?</span>
        {/* Tooltip */}
      {isHovering && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 min-w-[200px] max-w-[300px]">
          <div className="bg-white text-black p-3 rounded shadow-lg border border-gray-200 text-sm">
            <p>1% of the transaction fee will be transferred to referrers according to tiers</p>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white"></div>
          </div>
        </div>
      )}
    </span>
  );
};
export default Info;