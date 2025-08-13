"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const { user, login, register } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  const handleLogin = async (username: string, password: string) => {
    const success = await login(username, password)
    if (success) {
      router.push("/")
    }
    return success
  }

  const handleRegister = async (username: string, password: string) => {
    const success = await register(username, password)
    if (success) {
      router.push("/")
    }
    return success
  }

  return <LoginForm onLogin={handleLogin} onRegister={handleRegister} />
}
