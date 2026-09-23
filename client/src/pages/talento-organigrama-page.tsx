import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Plus, Trash2, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/layout/navbar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ORG_DIRECTION_LABELS,
  orgColor,
  type OrgDirectionKey,
  type OrgPerson,
  type OrgSocialLink,
} from "@shared/org-chart";
import { cn } from "@/lib/utils";

type TalentoOrgPayload = {
  sedeId: string;
  people: OrgPerson[];
};

type Draft = {
  name: string;
  roleTitle: string;
  email: string;
  phone: string;
  photoUrl: string;
  socialLinks: OrgSocialLink[];
};

function toDraft(p: OrgPerson): Draft {
  return {
    name: p.name,
    roleTitle: p.roleTitle,
    email: p.email ?? "",
    phone: p.phone ?? "",
    photoUrl: p.photoUrl ?? "",
    socialLinks: p.socialLinks ?? [],
  };
}

export default function TalentoOrganigramaPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [addingUnder, setAddingUnder] = useState<OrgPerson | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    roleTitle: "",
    email: "",
    phone: "",
    photoUrl: "",
  });

  const query = useQuery<TalentoOrgPayload>({
    queryKey: ["/api/talento/organigrama"],
    enabled: user?.role === "talento",
    queryFn: async () => {
      const res = await fetch("/api/talento/organigrama", { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar");
      return res.json();
    },
  });

  const people = query.data?.people ?? [];
  const selected = people.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setDraft(toDraft(selected));
    else setDraft(null);
  }, [selectedId, people]);

  const directors = useMemo(
    () =>
      people
        .filter((p) => p.roleKind === "director" || p.roleKind === "subdirector")
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [people],
  );

  const membersOf = (parentId: number) =>
    people
      .filter((p) => p.parentId === parentId && p.roleKind === "member")
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !draft) throw new Error("Sin selección");
      const res = await apiRequest("PATCH", `/api/talento/organigrama/${selected.id}`, {
        name: draft.name,
        roleTitle: draft.roleTitle,
        email: draft.email,
        phone: draft.phone,
        photoUrl: draft.photoUrl,
        socialLinks: draft.socialLinks,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/organigrama"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organigrama"] });
      toast({ title: "Guardado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!addingUnder) throw new Error("Sin dirección");
      const res = await apiRequest("POST", "/api/talento/organigrama", {
        parentId: addingUnder.id,
        directionKey: addingUnder.directionKey,
        roleKind: "member",
        name: newMember.name,
        roleTitle: newMember.roleTitle || "Integrante",
        email: newMember.email,
        phone: newMember.phone,
        photoUrl: newMember.photoUrl,
        socialLinks: [],
      });
      return res.json() as Promise<OrgPerson>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/organigrama"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organigrama"] });
      setAddingUnder(null);
      setNewMember({ name: "", roleTitle: "", email: "", phone: "", photoUrl: "" });
      setSelectedId(created.id);
      toast({ title: "Miembro agregado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/talento/organigrama/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/organigrama"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organigrama"] });
      setSelectedId(null);
      toast({ title: "Miembro eliminado" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading || !user || user.role !== "talento" || query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Organigrama | Talento y Bienestar</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/talento" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                Organigrama
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">Organigrama Oficial</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Sede Monterrey. Las direcciones son fijas: puedes editar directores y gestionar
                miembros (rol, foto, contacto).
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href="/organigrama" target="_blank" rel="noopener noreferrer">
                Ver público
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="space-y-4">
              {directors.map((dir) => {
                const color = orgColor(dir.directionKey as OrgDirectionKey);
                const members = membersOf(dir.id);
                return (
                  <div key={dir.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(dir.id)}
                        className={cn(
                          "min-w-0 flex-1 rounded-xl border px-3 py-3 text-left transition",
                          selectedId === dir.id
                            ? "border-transparent ring-2"
                            : "hover:border-muted-foreground/30",
                        )}
                        style={
                          selectedId === dir.id
                            ? ({ ["--tw-ring-color" as string]: color } as CSSProperties)
                            : undefined
                        }
                      >
                        <p
                          className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color }}
                        >
                          {ORG_DIRECTION_LABELS[dir.directionKey as OrgDirectionKey]}
                        </p>
                        <p className="mt-1 font-heading font-semibold">{dir.name}</p>
                        <p className="text-sm text-muted-foreground">{dir.roleTitle}</p>
                      </button>
                      {dir.roleKind === "director" && !dir.directionKey.startsWith("sede") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddingUnder(dir);
                            setSelectedId(null);
                          }}
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Miembro
                        </Button>
                      )}
                    </div>

                    {members.length > 0 && (
                      <ul className="mt-3 space-y-1.5 border-t pt-3">
                        {members.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(m.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted/60",
                                selectedId === m.id && "bg-muted",
                              )}
                            >
                              <span>
                                <span className="font-medium">{m.name}</span>
                                <span className="text-muted-foreground"> · {m.roleTitle}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>

            <section className="rounded-2xl border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
              {addingUnder ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ArrowLeft
                      className="h-4 w-4 cursor-pointer text-muted-foreground"
                      onClick={() => setAddingUnder(null)}
                    />
                    <h2 className="font-heading text-lg font-semibold">
                      Nuevo miembro ·{" "}
                      {ORG_DIRECTION_LABELS[addingUnder.directionKey as OrgDirectionKey]}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        className="mt-1"
                        value={newMember.name}
                        onChange={(e) => setNewMember((s) => ({ ...s, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Rol</Label>
                      <Input
                        className="mt-1"
                        value={newMember.roleTitle}
                        onChange={(e) => setNewMember((s) => ({ ...s, roleTitle: e.target.value }))}
                        placeholder="Ej. Coordinación de eventos"
                      />
                    </div>
                    <div>
                      <Label>Correo</Label>
                      <Input
                        className="mt-1"
                        value={newMember.email}
                        onChange={(e) => setNewMember((s) => ({ ...s, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        className="mt-1"
                        value={newMember.phone}
                        onChange={(e) => setNewMember((s) => ({ ...s, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>URL de foto</Label>
                      <Input
                        className="mt-1"
                        value={newMember.photoUrl}
                        onChange={(e) => setNewMember((s) => ({ ...s, photoUrl: e.target.value }))}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#5EC986] hover:bg-[#4db876]"
                    disabled={!newMember.name.trim() || addMutation.isPending}
                    onClick={() => addMutation.mutate()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar miembro
                  </Button>
                </div>
              ) : selected && draft ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: orgColor(selected.directionKey as OrgDirectionKey) }}
                      >
                        {ORG_DIRECTION_LABELS[selected.directionKey as OrgDirectionKey]}
                      </p>
                      <h2 className="font-heading text-lg font-semibold">Editar ficha</h2>
                      <p className="text-xs text-muted-foreground">
                        {selected.roleKind === "member"
                          ? "Miembro del equipo"
                          : "Cargo institucional (dirección fija)"}
                      </p>
                    </div>
                    {selected.roleKind === "member" && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${selected.name}?`)) {
                            deleteMutation.mutate(selected.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        className="mt-1"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Rol</Label>
                      <Input
                        className="mt-1"
                        value={draft.roleTitle}
                        onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Correo</Label>
                      <Input
                        className="mt-1"
                        value={draft.email}
                        onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        className="mt-1"
                        value={draft.phone}
                        onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>URL de foto</Label>
                      <Input
                        className="mt-1"
                        value={draft.photoUrl}
                        onChange={(e) => setDraft({ ...draft, photoUrl: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label>Redes / enlaces</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              socialLinks: [
                                ...draft.socialLinks,
                                {
                                  id: `s-${Date.now()}`,
                                  label: "LinkedIn",
                                  url: "https://",
                                },
                              ],
                            })
                          }
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Añadir
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {draft.socialLinks.map((s, idx) => (
                          <div key={s.id} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                            <Input
                              value={s.label}
                              onChange={(e) => {
                                const next = [...draft.socialLinks];
                                next[idx] = { ...s, label: e.target.value };
                                setDraft({ ...draft, socialLinks: next });
                              }}
                              placeholder="Etiqueta"
                            />
                            <Input
                              value={s.url}
                              onChange={(e) => {
                                const next = [...draft.socialLinks];
                                next[idx] = { ...s, url: e.target.value };
                                setDraft({ ...draft, socialLinks: next });
                              }}
                              placeholder="URL"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  socialLinks: draft.socialLinks.filter((_, i) => i !== idx),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                    disabled={saveMutation.isPending || !draft.name.trim()}
                    onClick={() => saveMutation.mutate()}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </Button>
                </div>
              ) : (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  Selecciona una persona para editarla, o agrega un miembro en una dirección.
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
