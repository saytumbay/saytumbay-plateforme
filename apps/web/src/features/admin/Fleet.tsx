import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Rocket, Pause, Play, XCircle, ShieldCheck } from "lucide-react";
import { fmt, type FirmwareState, type Rollout } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Callout } from "@/components/ui/feedback";
import { Meter } from "@/components/ui/data";
import { Badge, DeviceBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Confirm } from "@/components/ui/overlay";

const RSTATUS: Record<Rollout["status"], [string, "brand" | "water" | "sun" | "offline"]> = { en_cours: ["En cours", "water"], termine: ["Terminé", "brand"], en_pause: ["En pause", "sun"], annule: ["Annulé", "offline"] };

export default function Fleet() {
  const q = useQuery({ queryKey: ["admin", "firmware"], queryFn: api.admin.firmware, refetchInterval: (query) => (query.state.data?.rollouts.some((r) => r.status === "en_cours") ? 2000 : 30_000) });
  const qc = useQueryClient();
  const start = useMutation({
    mutationFn: (v: { version: string; ids: string[] }) => api.admin.startRollout(v.version, v.ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Étape canari lancée sur 10 % des capteurs.", { description: "Généralisez seulement si aucune erreur n’apparaît." });
    },
  });
  const act = useMutation({
    mutationFn: (v: { id: string; action: "pause" | "reprendre" | "annuler" | "generaliser" }) => api.admin.rolloutAction(v.id, v.action),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success({ pause: "Déploiement suspendu.", reprendre: "Déploiement repris.", annuler: "Déploiement annulé.", generaliser: "Généralisation lancée." }[v.action]);
    },
  });
  return (
    <>
      <PageHeader title="Parc et mises à jour" subtitle="Versions du micrologiciel et déploiements à distance, par étapes." />
      <QueryView q={q}>
        {(d: FirmwareState) => {
          const latest = d.releases[0]!;
          const outdated = d.devices.filter((x) => x.kind === "sol" && x.firmware !== latest.version);
          const active = d.rollouts.find((r) => r.status === "en_cours" || r.status === "en_pause");
          const canaryDone = !!active && active.stage === "canari" && active.updatedDeviceIds.length + active.failedDeviceIds.length >= active.targetDeviceIds.length;
          const total = d.devices.length;
          return (
            <div className="flex flex-col gap-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader title={`Dernière version : ${latest.version}`} subtitle={`Publiée ${fmt.ago(latest.releasedAt)}`} actions={<Badge tone="brand">Recommandée</Badge>} />
                  <CardBody className="flex flex-col gap-4">
                    <p className="text-sm text-ink-2">{latest.notes}</p>
                    <ul className="flex flex-col gap-3">
                      {d.devicesByVersion.map((v) => (
                        <li key={v.version}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-display font-semibold">{v.version}</span>
                            <span className="tabular text-ink-2">{fmt.plural(v.count, "capteur", "capteurs")}</span>
                          </div>
                          <Meter value={v.count} max={total} tone={v.version === latest.version ? "brand" : "offline"} label={`Capteurs en ${v.version}`} />
                        </li>
                      ))}
                    </ul>
                    {!active && outdated.length > 0 && (
                      <Confirm
                        tone="primary"
                        trigger={<Button icon={<Rocket className="size-4" aria-hidden />} className="self-start">Mettre à jour {fmt.plural(outdated.length, "capteur", "capteurs")}</Button>}
                        title={`Déployer ${latest.version} ?`}
                        description={`La mise à jour commence par 10 % des capteurs (étape canari). Vous déciderez ensuite de la généraliser aux ${outdated.length} capteurs. Les capteurs hors ligne la recevront à leur retour.`}
                        confirmLabel="Lancer l’étape canari"
                        onConfirm={() => start.mutateAsync({ version: latest.version, ids: outdated.map((x) => x.id) })}
                      />
                    )}
                  </CardBody>
                </Card>
                <Card className={active ? "border-water" : undefined}>
                  <CardHeader title="Déploiement en cours" subtitle={active ? `${active.version} · étape ${active.stage === "canari" ? "canari (10 %)" : "générale"}` : "Aucun"} actions={active && (canaryDone && active.status === "en_pause" ? <Badge tone="brand">Canari terminé</Badge> : <Badge tone={RSTATUS[active.status][1]}>{RSTATUS[active.status][0]}</Badge>)} />
                  <CardBody className="flex flex-col gap-4">
                    {active ? (
                      <>
                        <div>
                          <div className="mb-1.5 flex justify-between text-sm">
                            <span>{active.updatedDeviceIds.length} à jour sur {active.targetDeviceIds.length}</span>
                            <span className="font-display font-semibold tabular">{Math.round((active.updatedDeviceIds.length / Math.max(1, active.targetDeviceIds.length)) * 100)} %</span>
                          </div>
                          <Meter value={active.updatedDeviceIds.length} max={active.targetDeviceIds.length} tone="water" label="Progression du déploiement" />
                        </div>
                        {canaryDone && active.status === "en_pause" && <Callout tone="success">Étape canari terminée. Vérifiez les mesures des capteurs mis à jour, puis généralisez au reste du parc.</Callout>}
                        {active.failedDeviceIds.length > 0 && <Callout tone="warn">En attente (hors ligne) : {active.failedDeviceIds.join(", ")}. Ils recevront la mise à jour à leur prochaine connexion.</Callout>}
                        <div className="flex flex-wrap gap-2">
                          {active.status === "en_cours" ? (
                            <Button variant="secondary" icon={<Pause className="size-4" aria-hidden />} onClick={() => act.mutate({ id: active.id, action: "pause" })}>
                              Suspendre
                            </Button>
                          ) : canaryDone ? (
                            <Button icon={<ShieldCheck className="size-4" aria-hidden />} onClick={() => act.mutate({ id: active.id, action: "generaliser" })}>
                              Généraliser à tout le parc
                            </Button>
                          ) : (
                            <Button variant="secondary" icon={<Play className="size-4" aria-hidden />} onClick={() => act.mutate({ id: active.id, action: "reprendre" })}>
                              Reprendre
                            </Button>
                          )}
                          <Confirm
                            trigger={<Button variant="ghost" icon={<XCircle className="size-4" aria-hidden />}>Annuler</Button>}
                            title="Annuler ce déploiement ?"
                            description="Les capteurs déjà mis à jour gardent la nouvelle version. Les autres restent sur leur version actuelle."
                            confirmLabel="Annuler le déploiement"
                            onConfirm={() => act.mutateAsync({ id: active.id, action: "annuler" })}
                          />
                        </div>
                        <p className="text-[13px] text-ink-3">Méthode : 10 % des capteurs d’abord, puis le reste après 24 h sans erreur. Chaque capteur garde la version précédente en secours.</p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-3">{outdated.length ? "Lancez une mise à jour depuis la carte de gauche." : "Tout le parc est à jour."}</p>
                    )}
                  </CardBody>
                </Card>
              </div>
              <Card>
                <CardHeader title="Capteurs du parc" subtitle={`${total} capteurs, tous clients`} />
                <CardBody className="pt-2">
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {d.devices.map((dv) => (
                      <li key={dv.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-semibold tabular">
                            {dv.id} <span className={dv.firmware === latest.version ? "font-sans text-[12px] font-normal text-brand" : "font-sans text-[12px] font-normal text-ink-3"}>{dv.firmware}</span>
                          </p>
                          <p className="truncate text-[12.5px] text-ink-3">{dv.label}</p>
                        </div>
                        <DeviceBadge status={dv.status} size="sm" />
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}
