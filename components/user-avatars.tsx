import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface UserAvatarsProps {
  avatars: string[]
  size?: number
  overlap?: number
}

export function UserAvatars({ avatars, size = 40, overlap = 4 }: UserAvatarsProps) {
  return (
    <div className="flex -space-x-4">
      {avatars.map((avatar, index) => (
        <Avatar key={index} className="border-2 border-white" style={{ width: size, height: size }}>
          <AvatarImage src={avatar || "/placeholder.svg"} alt={`User ${index + 1}`} />
          <AvatarFallback>{`U${index + 1}`}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}
