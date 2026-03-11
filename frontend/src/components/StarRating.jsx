import React, { useState } from 'react';

function StarRating({ type, id, score, onScoreChange }) {
  const [hoverScore, setHoverScore] = useState(null);
  const displayScore = hoverScore !== null ? hoverScore : score;
  const fullStars = Math.floor(displayScore / 2);
  const hasHalfStar = displayScore % 2 === 1;

  const handleMouseEnter = (starIndex) => {
    setHoverScore(starIndex * 2);
  };

  const handleMouseLeave = () => {
    setHoverScore(null);
  };

  const handleClick = (starIndex, isHalf = false) => {
    if (isHalf) {
      onScoreChange(type, id, (starIndex - 1) * 2 + 1);
    } else {
      onScoreChange(type, id, starIndex * 2);
    }
  };

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let starClass = 'star empty';

    if (i <= fullStars) {
      starClass = 'star full';
    } else if (i === fullStars + 1 && hasHalfStar) {
      starClass = 'star half';
    }

    stars.push(
      <div key={i} className="star-container">
        <span
          className={starClass}
          onClick={() => handleClick(i)}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
        >
          ★
        </span>
        <div
          className="half-click-area"
          onClick={() => handleClick(i, true)}
          onMouseEnter={() => setHoverScore((i - 1) * 2 + 1)}
          onMouseLeave={handleMouseLeave}
        ></div>
      </div>
    );
  }

  return (
    <div className="star-rating" onMouseLeave={handleMouseLeave}>
      {stars}
    </div>
  );
}

export function StaticStarRating({ score }) {
  return (
    <div className="star-rating static">
      {Array(5)
        .fill(0)
        .map((_, i) => {
          const starValue = (i + 1) * 2;
          if (score >= starValue) {
            return (
              <span key={i} className="star full">
                ★
              </span>
            );
          } else if (score >= starValue - 1) {
            return (
              <span key={i} className="star half">
                ★
              </span>
            );
          } else {
            return (
              <span key={i} className="star empty">
                ★
              </span>
            );
          }
        })}
    </div>
  );
}

export default StarRating;
