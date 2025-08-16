const rateLimitMap = new Map()

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  skipSuccessfulRequests?: boolean
}

export function rateLimit(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now()
  const { maxRequests, windowMs } = config
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  const userData = rateLimitMap.get(identifier)
  
  if (now > userData.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userData.count >= maxRequests) {
    return false
  }
  
  userData.count++
  return true
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  return "unknown"
}
