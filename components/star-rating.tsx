import { Star } from "lucide-react"

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  color?: string
}

export function StarRating({ rating, maxRating = 5, size = 16, color = "#f4c537" }: StarRatingProps) {
  return (
    <div className="flex">
      {[...Array(maxRating)].map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < rating ? color : "none"}
          color={color}
          className={i < rating ? "text-[#f4c537]" : "text-gray-300"}
        />
      ))}
    </div>
  )
}
