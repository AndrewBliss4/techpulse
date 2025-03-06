import { useState } from "react";
import { Star } from "lucide-react";

const Rating = ({ onRatingSelect }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const handleClick = (index) => {
    setRating(index);
    if (onRatingSelect) {
      onRatingSelect(index);
    }
  };

  const handleMouseEnter = (index) => {
    setHover(index);
  };

  const handleMouseLeave = () => {
    setHover(rating);
  };

  return (
    <div className="flex space-x-2">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={20}
          className={`cursor-pointer transition-colors duration-200 ${
            (hover || rating) >= index ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
          onClick={() => handleClick(index)}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={handleMouseLeave}
        />
      ))}
    </div>
  );
};

export default Rating;
