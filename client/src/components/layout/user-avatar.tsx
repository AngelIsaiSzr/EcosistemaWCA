import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { resolveMediaUrl } from "@shared/media-url";

interface UserAvatarProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export function UserAvatar({ className = "", size = "md" }: UserAvatarProps) {
  const { user } = useAuth();

  // Determinar el tamaño del avatar basado en el prop
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const sizeClass = sizeClasses[size];
  
  if (!user) {
    return (
      <Avatar className={`${sizeClass} ${className}`}>
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <Avatar className={`${sizeClass} ${className}`}>
      <AvatarImage src={resolveMediaUrl(user.profileImage) || undefined} alt={user.name || "Usuario"} />
      <AvatarFallback>
        {user.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}