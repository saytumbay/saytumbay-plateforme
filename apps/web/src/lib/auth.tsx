import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router";
import type { ReactNode } from "react";
import { can, type OrgRole, type Permission, type SessionUser } from "@saytumbay/shared";
import { api, ApiError } from "./api";
import { Splash } from "@/components/brand/Splash";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      try {
        return await api.auth.session();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2,
  });
}

export function useSetSession() {
  const qc = useQueryClient();
  return (s: SessionUser | null) => {
    if (s === null) qc.clear();
    qc.setQueryData(SESSION_KEY, s);
  };
}

export function useActiveMembership() {
  const { data } = useSession();
  return data?.memberships.find((m) => m.orgId === data.activeOrgId) ?? null;
}

export function useRole(): OrgRole | null {
  return useActiveMembership()?.role ?? null;
}

export function useCan(perm: Permission): boolean {
  const { data } = useSession();
  const role = useRole();
  return can(perm, { orgRole: role, platformRole: data?.user.platformRole ?? "aucun" });
}

/** Page réservée aux personnes connectées ; mémorise la destination pour y revenir après connexion. */
export function RequireAuth({ children, platform }: { children: ReactNode; platform?: boolean }) {
  const { data, isPending, isError, error, refetch } = useSession();
  const loc = useLocation();
  if (isPending) return <Splash />;
  if (isError) return <Splash error={error} onRetry={() => refetch()} />;
  if (!data) return <Navigate to={`/connexion?suite=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (platform && data.user.platformRole === "aucun") return <Navigate to="/app" replace />;
  if (!platform && !data.activeOrgId) return <Navigate to={data.user.platformRole !== "aucun" ? "/admin" : "/connexion"} replace />;
  return <>{children}</>;
}

export function homeFor(s: SessionUser): string {
  if (!s.activeOrgId && s.user.platformRole !== "aucun") return "/admin";
  const m = s.memberships.find((x) => x.orgId === s.activeOrgId);
  if (m && !m.org.modules.includes("agritech") && m.org.modules.includes("onion")) return "/app/onion";
  return "/app";
}

/** Valide une destination de retour : chemin interne uniquement (pas de redirection ouverte). */
export function safeNext(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
