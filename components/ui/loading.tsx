interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  return (
    <div className={`border-4 border-primary border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export function FullPageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen finance-gradient flex items-center justify-center p-4">
      <LoadingState message={message} />
    </div>
  )
}
