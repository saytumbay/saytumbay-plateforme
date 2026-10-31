import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { fmt, taskSchema, type ModuleKey, type Task, type TaskInput } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan, useSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, EmptyState } from "@/components/ui/feedback";
import { FilterChips } from "@/components/ui/data";
import { Button } from "@/components/ui/button";
import { Sheet, Confirm } from "@/components/ui/overlay";
import { Field, Input, Select, FormError } from "@/components/ui/form";
import { Badge, TaskStatusBadge } from "@/components/ui/badge";

const today = () => new Date().toISOString().slice(0, 10);

export function NewTaskSheet({ open, onOpenChange, module, link }: { open: boolean; onOpenChange: (v: boolean) => void; module: ModuleKey; link?: TaskInput["link"] }) {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: api.members.list, enabled: open });
  const form = useForm<TaskInput>({ resolver: zodResolver(taskSchema), defaultValues: { title: "", assigneeId: null, due: today(), module, link: link ?? null } });
  const create = useMutation({
    mutationFn: api.tasks.create,
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Tâche ajoutée.", { description: t.assigneeId ? "La personne est prévenue par SMS." : undefined });
      form.reset({ title: "", assigneeId: null, due: today(), module, link: link ?? null });
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details && typeof e.details === "object" && "fields" in e.details)
        for (const [k, v] of Object.entries((e.details as { fields: Record<string, string> }).fields)) form.setError(k as keyof TaskInput, { message: v });
    },
  });
  const err = form.formState.errors;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle tâche"
      description="La personne désignée reçoit un SMS avec la tâche et la date."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-tache" loading={create.isPending}>
            Ajouter la tâche
          </Button>
        </>
      }
    >
      <form id="form-tache" className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => create.mutate({ ...v, assigneeId: v.assigneeId || null }))} noValidate>
        <FormError>{create.isError && !(create.error instanceof ApiError && create.error.status === 422) ? create.error.message : null}</FormError>
        <Field label="Tâche" error={err.title?.message} required>
          <Input placeholder="Ex. Contrôler 20 sacs de la rangée 3" autoFocus {...form.register("title")} />
        </Field>
        <Field label="Confiée à" optional>
          <Select {...form.register("assigneeId")}>
            <option value="">Personne pour l’instant</option>
            {members.data?.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.firstName} {m.user.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="À faire pour le" error={err.due?.message} required>
          <Input type="date" min={today()} {...form.register("due")} />
        </Field>
      </form>
    </Sheet>
  );
}

type Filter = "ouvertes" | "miennes" | "terminees" | "toutes";

export default function TasksPage() {
  const q = useQuery({ queryKey: ["tasks"], queryFn: api.tasks.list });
  const members = useQuery({ queryKey: ["members"], queryFn: api.members.list, staleTime: 5 * 60_000 });
  const { data: session } = useSession();
  const canManage = useCan("taches:gerer");
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ouvertes");
  const [open, setOpen] = useState(false);
  const status = useMutation({
    mutationFn: (v: { id: string; status: Task["status"] }) => api.tasks.status(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
  const remove = useMutation({
    mutationFn: api.tasks.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tâche supprimée.");
    },
  });
  const name = (id: string | null) => {
    const m = members.data?.find((x) => x.user.id === id);
    return m ? `${m.user.firstName} ${m.user.lastName}` : "Non attribuée";
  };
  const groups = useMemo(() => {
    const t = q.data ?? [];
    const f = t.filter((x) => (filter === "toutes" ? true : filter === "terminees" ? x.status === "terminee" : filter === "miennes" ? x.assigneeId === session?.user.id && x.status !== "terminee" : x.status !== "terminee"));
    const d = today();
    const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const out: Array<[string, Task[]]> = [
      ["En retard", f.filter((x) => x.status !== "terminee" && x.due < d)],
      ["Aujourd’hui", f.filter((x) => x.due === d && x.status !== "terminee")],
      ["Cette semaine", f.filter((x) => x.due > d && x.due <= week && x.status !== "terminee")],
      ["Plus tard", f.filter((x) => x.due > week && x.status !== "terminee")],
      ["Terminées", f.filter((x) => x.status === "terminee")],
    ];
    return out.filter(([, l]) => l.length);
  }, [q.data, filter, session?.user.id]);
  const all = q.data ?? [];
  const linkTo = (t: Task) => (t.link ? (t.link.type === "parcelle" ? `/app/parcelles/${t.link.id}` : t.link.type === "capteur" ? `/app/capteurs/${t.link.id}` : t.link.type === "entrepot" ? `/app/onion/entrepots/${t.link.id}` : "/app/onion/lots") : null);
  return (
    <>
      <PageHeader
        title="Tâches"
        subtitle="Ce que l’équipe doit faire sur le terrain, avec qui et pour quand."
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
              Ajouter une tâche
            </Button>
          )
        }
      />
      <div className="mb-5">
        <FilterChips
          label="Filtrer les tâches"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ouvertes", label: "À faire", count: all.filter((x) => x.status !== "terminee").length },
            { value: "miennes", label: "Les miennes", count: all.filter((x) => x.assigneeId === session?.user.id && x.status !== "terminee").length },
            { value: "terminees", label: "Terminées", count: all.filter((x) => x.status === "terminee").length },
            { value: "toutes", label: "Toutes", count: all.length },
          ]}
        />
      </div>
      <QueryView q={q}>
        {() =>
          groups.length === 0 ? (
            <EmptyState icon={<ListChecks className="size-6" aria-hidden />} title={filter === "miennes" ? "Aucune tâche pour vous" : "Aucune tâche ici"} action={canManage ? <Button onClick={() => setOpen(true)}>Ajouter une tâche</Button> : undefined}>
              Les tâches créées depuis une alerte, une parcelle ou un entrepôt apparaissent aussi ici.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-6">
              {groups.map(([label, list]) => (
                <section key={label} aria-label={label}>
                  <h2 className={cn("mb-2 text-sm font-semibold", label === "En retard" ? "text-danger-ink" : "text-ink-2")}>
                    {label} <span className="font-normal text-ink-3">({list.length})</span>
                  </h2>
                  <Card as="div">
                    <ul className="divide-y divide-line">
                      {list.map((t) => {
                        const done = t.status === "terminee";
                        const to = linkTo(t);
                        return (
                          <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap">
                            <button
                              type="button"
                              disabled={!canManage}
                              onClick={() => status.mutate({ id: t.id, status: done ? "a_faire" : "terminee" })}
                              className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border-2", done ? "border-brand bg-brand text-brand-ink" : "border-line-strong hover:border-brand")}
                              aria-label={done ? `Rouvrir « ${t.title} »` : `Terminer « ${t.title} »`}
                              aria-pressed={done}
                            >
                              {done && <Check className="size-4" strokeWidth={3} aria-hidden />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={cn("font-medium", done && "text-ink-3 line-through")}>{t.title}</p>
                              <p className="text-[13px] text-ink-3">
                                {name(t.assigneeId)} · {fmt.date(t.due)}
                                {to && (
                                  <>
                                    {" · "}
                                    <Link to={to} className="text-brand hover:underline">
                                      voir l’élément
                                    </Link>
                                  </>
                                )}
                              </p>
                            </div>
                            <Badge tone={t.module === "onion" ? "onion" : "brand"} size="sm">
                              {t.module === "onion" ? "Onion" : "AgriTech"}
                            </Badge>
                            {canManage && !done ? (
                              <select
                                aria-label={`Statut de « ${t.title} »`}
                                value={t.status}
                                onChange={(e) => status.mutate({ id: t.id, status: e.target.value as Task["status"] })}
                                className="h-9 rounded-md border border-line-strong bg-surface px-2 text-[13px]"
                              >
                                <option value="a_faire">À faire</option>
                                <option value="en_cours">En cours</option>
                                <option value="terminee">Terminée</option>
                              </select>
                            ) : (
                              <TaskStatusBadge status={t.status} />
                            )}
                            {canManage && (
                              <Confirm
                                trigger={
                                  <button className="rounded-md p-2 text-ink-3 hover:bg-danger-soft hover:text-danger-ink" aria-label={`Supprimer « ${t.title} »`}>
                                    <Trash2 className="size-4" aria-hidden />
                                  </button>
                                }
                                title="Supprimer cette tâche ?"
                                description={`« ${t.title} » sera retirée de la liste de l’équipe.`}
                                confirmLabel="Supprimer la tâche"
                                onConfirm={() => remove.mutateAsync(t.id)}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </section>
              ))}
            </div>
          )
        }
      </QueryView>
      <NewTaskSheet open={open} onOpenChange={setOpen} module="agritech" />
    </>
  );
}
