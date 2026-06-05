import { ReactNode } from "react"

import { Redirect } from "expo-router"
import { useAuthStore } from "../store"

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken } = useAuthStore()

  if (!isAuthenticated || !accessToken) {
    return <Redirect href="/login" />
  }

  return <>{children}</>
}