import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

const Rating = ({ onRatingSelect }) => {
  const [rating, setRating] = useState(0);  // Track the selected rating
  const [hoverUp, setHoverUp] = useState(false);  // Hover state for thumbs-up
  const [hoverDown, setHoverDown] = useState(false);  // Hover state for thumbs-down

  const handleClick = (num) => {
    // If the user clicks on the already selected icon, reset the rating to 0
    if (rating === num) {
      setRating(0);  // Deselect (reset to 0)
      if (onRatingSelect) {
        onRatingSelect(0);  // Call the callback with 0 to indicate deselection
      }
    } else {
      setRating(num);  // Set the rating to thumbs-up (1) or thumbs-down (-1)
      if (onRatingSelect) {
        onRatingSelect(num);  // Call the callback with the selected rating
      }
    }
  };

  const handleMouseEnterUp = () => {
    setHoverUp(true);  // Set hover state for thumbs-up
  };

  const handleMouseLeaveUp = () => {
    setHoverUp(false);  // Reset hover state for thumbs-up
  };

  const handleMouseEnterDown = () => {
    setHoverDown(true);  // Set hover state for thumbs-down
  };

  const handleMouseLeaveDown = () => {
    setHoverDown(false);  // Reset hover state for thumbs-down
  };

  return (
    <div className="flex space-x-2">
      <ThumbsUp
        size={20}
        className={`cursor-pointer transition-colors duration-200 ${rating === 1 || hoverUp ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        onClick={() => handleClick(1)}
        onMouseEnter={handleMouseEnterUp}
        onMouseLeave={handleMouseLeaveUp}
      />
      <ThumbsDown
        size={20}
        className={`cursor-pointer transition-colors duration-200 ${rating === -1 || hoverDown ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        onClick={() => handleClick(-1)}
        onMouseEnter={handleMouseEnterDown}
        onMouseLeave={handleMouseLeaveDown}
      />
    </div>
  );
};

export default Rating;
