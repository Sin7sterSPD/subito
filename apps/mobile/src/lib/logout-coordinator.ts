import type { QueryClient } from "@tanstack/react-query"
import { queryKeys } from "./query-keys"

export function runLogoutSideEffects(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: queryKeys.user.all, exact: false })
}
