import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Download,
  Eye,
  Pencil,
  RefreshCw,
  Search,
  Share2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Navbar from "@/components/layout/navbar";
import { IntegrationFormFlow } from "@/components/integration/integration-form-flow";
import { FormAtmosphere } from "@/components/integration/form-atmosphere";
import {
  DEFAULT_INTEGRATION_FORM,
  IntegrationField,
  IntegrationFormDefinition,
  formatAnswerForSheet,
  getAllFields,
  sheetTabFilename,
} from "@shared/integration-form";
import { IntegrationForm, IntegrationResponse } from "@shared/schema";

function asDefinition(schema: unknown): IntegrationFormDefinition {
  return (schema as IntegrationFormDefinition) ?? DEFAULT_INTEGRATION_FORM;
}

const COL_WIDTHS_KEY_PREFIX = "talento-responses-col-widths";
const DEFAULT_COL_WIDTH = 180;

function loadColWidths(formSlug: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${COL_WIDTHS_KEY_PREFIX}:${formSlug}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function AnswerBadges({
  field,
  raw,
  formatted,
}: {
  field: IntegrationField;
  raw: unknown;
  formatted: string;
}) {
  if (Array.isArray(raw)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(raw as string[]).map((tag) => (
          <Badge
            key={tag}
            className="border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-xs leading-snug text-emerald-700 dark:text-emerald-300"
          >
            {formatAnswerForSheet(field, [tag])}
          </Badge>
        ))}
      </div>
    );
  }
  if (formatted) {
    return (
      <Badge className="border border-sky-500/25 bg-sky-500/15 px-2.5 py-1 text-xs leading-snug text-sky-700 dark:text-sky-300">
        {formatted}
      </Badge>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function EditableAnswerCell({
  responseId,
  field,
  raw,
  expanded,
  onToggleExpand,
  onSaved,
}: {
  responseId: number;
  field: IntegrationField;
  raw: unknown;
  expanded: boolean;
  onToggleExpand: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const formatted = formatAnswerForSheet(field, raw);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatted);
  const [saving, setSaving] = useState(false);
  const isChoice = field.type === "single_choice" || field.type === "multiple_choice";
  const isLong = formatted.length > 90;
  const multilineField = field.type === "long_text" || field.type === "multiple_choice";
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(formatted);
      requestAnimationFrame(() => {
        (multilineField ? textRef.current : inputRef.current)?.focus();
      });
    }
  }, [editing, formatted, multilineField]);

  const save = async () => {
    if (draft === formatted) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await apiRequest("PATCH", `/api/talento/responses/${responseId}`, {
        fieldId: field.id,
        value: draft,
      });
      const data = await res.json();
      setEditing(false);
      onSaved();
      toast({
        title: "Respuesta actualizada",
        description: data.sheetUpdated
          ? "También se actualizó esa celda en Google Sheets."
          : "Guardado en la plataforma.",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo guardar",
        description: error?.message || "Intenta de nuevo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <TableCell className="align-middle py-3">
        <div className="flex flex-col gap-2">
          {multilineField ? (
            <textarea
              ref={textRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save();
              }}
              rows={3}
              disabled={saving}
              className="w-full min-w-[140px] rounded-md border bg-background px-2 py-1.5 text-sm"
              placeholder={
                field.type === "multiple_choice"
                  ? "Opciones separadas por |"
                  : undefined
              }
            />
          ) : (
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
                if (e.key === "Enter") void save();
              }}
              disabled={saving}
              className="h-8 min-w-[140px] text-sm"
            />
          )}
          <div className="flex gap-1">
            <Button size="sm" className="h-7 px-2 text-xs" disabled={saving} onClick={() => void save()}>
              {saving ? "…" : "Guardar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </TableCell>
    );
  }

  return (
    <TableCell
      className="group align-middle py-3 cursor-pointer"
      onDoubleClick={() => setEditing(true)}
      title="Doble clic para editar"
    >
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          {field.type === "email" && formatted ? (
            <a className="text-[#5b8fd4] hover:underline" href={`mailto:${formatted}`} onClick={(e) => e.stopPropagation()}>
              {formatted}
            </a>
          ) : field.type === "phone" && formatted ? (
            <a className="text-[#5b8fd4] hover:underline" href={`tel:${formatted.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()}>
              {formatted}
            </a>
          ) : field.type === "url" && formatted ? (
            <a className="text-[#5b8fd4] hover:underline" href={formatted} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
              Ver enlace
            </a>
          ) : isChoice ? (
            <AnswerBadges field={field} raw={raw} formatted={formatted} />
          ) : isLong ? (
            <div>
              <p className="leading-snug">{expanded ? formatted : `${formatted.slice(0, 90)}…`}</p>
              <button
                type="button"
                className="mt-1 text-xs text-[#5b8fd4]"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                {expanded ? "Ver menos" : "Ver más"}
              </button>
            </div>
          ) : (
            <span className="leading-snug">{formatted || "—"}</span>
          )}
        </div>
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          aria-label="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    </TableCell>
  );
}

function ResizableHead({
  id,
  label,
  width,
  onResize,
}: {
  id: string;
  label: string;
  width: number;
  onResize: (id: string, width: number) => void;
}) {
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startW.current = width;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(100, startW.current + (ev.clientX - startX.current));
      onResize(id, next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <TableHead style={{ width, minWidth: width, maxWidth: width }} className="relative select-none">
      <span className="pr-2 line-clamp-2">{label}</span>
      <span
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize hover:bg-[#5b8fd4]/40"
      />
    </TableHead>
  );
}

export default function TalentoPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const formSlug = params?.slug || "integracion";
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("responses");
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadColWidths(formSlug));

  useEffect(() => {
    setColWidths(loadColWidths(formSlug));
  }, [formSlug]);

  const setColWidth = useCallback(
    (id: string, width: number) => {
      setColWidths((prev) => {
        const next = { ...prev, [id]: width };
        try {
          localStorage.setItem(`${COL_WIDTHS_KEY_PREFIX}:${formSlug}`, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [formSlug],
  );

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "talento")) {
      navigate("/auth");
      toast({
        title: "Acceso denegado",
        description: "Esta área es exclusiva de Talento y Bienestar.",
        variant: "destructive",
      });
    }
  }, [user, isLoading, navigate, toast]);

  const { data: form, isLoading: formLoading } = useQuery<IntegrationForm & { googleServiceEmail?: string | null }>({
    queryKey: ["/api/talento/forms", formSlug],
    queryFn: async () => {
      const res = await fetch(`/api/talento/forms/${encodeURIComponent(formSlug)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("No se pudo cargar el formulario");
      return res.json();
    },
    enabled: user?.role === "talento" && !!formSlug,
  });

  const { data: responses = [], refetch, isFetching } = useQuery<IntegrationResponse[]>({
    queryKey: ["/api/talento/forms", formSlug, "responses", search],
    queryFn: async () => {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(
        `/api/talento/forms/${encodeURIComponent(formSlug)}/responses${qs}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("No se pudieron cargar las respuestas");
      return res.json();
    },
    enabled: user?.role === "talento" && !!formSlug,
  });

  const definition = asDefinition(form?.schema);
  const fields = useMemo(() => getAllFields(definition), [definition]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(true);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [spreadsheetTab, setSpreadsheetTab] = useState("Respuestas");

  useEffect(() => {
    if (!form) return;
    setTitle(form.title);
    setSlug(form.slug);
    setPublished(form.isPublished);
    setSpreadsheetId(form.spreadsheetId ?? "");
    setSpreadsheetTab(form.spreadsheetTab ?? "Respuestas");
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiRequest(
        "PATCH",
        `/api/talento/forms/${encodeURIComponent(formSlug)}`,
        payload,
      );
      return res.json();
    },
    onSuccess: (updated: IntegrationForm) => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/forms"] });
      toast({ title: "Cambios guardados" });
      if (updated?.slug && updated.slug !== formSlug) {
        navigate(`/talento/${updated.slug}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading || !user || user.role !== "talento") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (!formLoading && !form) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Formulario no encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/talento")}>
          Volver a formularios
        </Button>
      </div>
    );
  }

  const publicPath = !slug || slug === "integracion" ? "/integracion" : `/f/${slug}`;
  const publicUrl = `${window.location.origin}${publicPath}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast({ title: "Enlace copiado", description: publicUrl });
  };

  const saveSettings = () => {
    saveMutation.mutate({
      title,
      slug,
      isPublished: published,
      spreadsheetId: spreadsheetId.trim() || null,
      spreadsheetTab,
    });
  };

  return (
    <>
      <Helmet>
        <title>Talento y Bienestar | Ecosistema WCA</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/talento" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                {form?.title || "Formulario"}
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">{form?.title || "Formulario"}</h1>
              <p className="mt-2 text-muted-foreground">
                Respuestas, vista previa y conexión con Google Sheets de este formulario.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                onClick={() => navigate(`/talento/${formSlug}/editar`)}
              >
                <Pencil className="h-4 w-4" />
                Editar formulario
              </Button>
              <Button variant="outline" asChild>
                <a href={publicPath} target="_blank" rel="noreferrer">
                  <Eye className="h-4 w-4" />
                  Ver formulario
                </a>
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="responses">Respuestas</TabsTrigger>
              <TabsTrigger value="preview">Vista previa</TabsTrigger>
              <TabsTrigger value="sheet">Google Sheets</TabsTrigger>
            </TabsList>

            <TabsContent value="responses">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Respuestas</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-56 pl-9"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/talento/forms/${encodeURIComponent(formSlug)}/export.csv`}>
                      <Download className="h-4 w-4" />
                      Exportar
                    </a>
                  </Button>
                  <Button variant="outline" onClick={copyLink}>
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border bg-card">
                <Table className="min-w-max table-fixed">
                  <TableHeader>
                    <TableRow>
                      <ResizableHead
                        id="_index"
                        label="#"
                        width={colWidths._index ?? 56}
                        onResize={setColWidth}
                      />
                      <ResizableHead
                        id="_fecha"
                        label="Fecha"
                        width={colWidths._fecha ?? 160}
                        onResize={setColWidth}
                      />
                      {fields.map((field) => (
                        <ResizableHead
                          key={field.id}
                          id={field.id}
                          label={field.label}
                          width={colWidths[field.id] ?? DEFAULT_COL_WIDTH}
                          onResize={setColWidth}
                        />
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formLoading && (
                      <TableRow>
                        <TableCell colSpan={Math.max(fields.length + 2, 3)}>Cargando...</TableCell>
                      </TableRow>
                    )}
                    {!formLoading && responses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={Math.max(fields.length + 2, 3)} className="py-10 text-center text-muted-foreground">
                          Aún no hay respuestas.
                        </TableCell>
                      </TableRow>
                    )}
                    {responses.map((item, index) => {
                      const answers = (item.answers ?? {}) as Record<string, unknown>;
                      return (
                        <TableRow key={item.id}>
                          <TableCell
                            className="align-middle py-3"
                            style={{ width: colWidths._index ?? 56 }}
                          >
                            {index + 1}
                          </TableCell>
                          <TableCell
                            className="align-middle whitespace-nowrap py-3 text-muted-foreground"
                            style={{ width: colWidths._fecha ?? 160 }}
                          >
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleString("es-MX")
                              : "—"}
                          </TableCell>
                          {fields.map((field) => {
                            const key = `${item.id}-${field.id}`;
                            return (
                              <EditableAnswerCell
                                key={field.id}
                                responseId={item.id}
                                field={field}
                                raw={answers[field.id]}
                                expanded={!!expanded[key]}
                                onToggleExpand={() =>
                                  setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                                }
                                onSaved={() => {
                                  void queryClient.invalidateQueries({
                                    queryKey: ["/api/talento/forms", formSlug, "responses"],
                                  });
                                }}
                              />
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Doble clic en una celda (o el ícono de lápiz) para editar. Arrastra el borde derecho de
                cada encabezado para ajustar el ancho.
              </p>
            </TabsContent>

            <TabsContent value="preview">
              <div className="integration-form-shell relative min-h-[720px] overflow-x-hidden overflow-y-auto rounded-2xl border bg-[#0b1220]">
                <FormAtmosphere definition={definition} contained />
                <IntegrationFormFlow definition={definition} slug={form?.slug ?? "integracion"} preview />
              </div>
            </TabsContent>

            <TabsContent value="sheet">
              <div className="grid items-start gap-6 rounded-xl border bg-card p-6 lg:grid-cols-2">
                <div className="space-y-4">
                <h2 className="font-heading text-xl font-semibold">Hoja de cálculo</h2>
                <p className="text-sm text-muted-foreground">
                  Crea una Google Sheet, comparte el archivo con la cuenta de servicio (editor) y pega aquí el ID o la URL.
                  La primera fila se llena sola con los encabezados si está vacía. Si mueves o editas preguntas, vuelve a
                  descargar la plantilla: las columnas siguen el orden actual del formulario.
                </p>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <p className="font-medium">Estado</p>
                  <p className="mt-1 text-muted-foreground">
                    {spreadsheetId.trim()
                      ? `Hoja vinculada. Pestaña: ${spreadsheetTab || "Respuestas"}. ${fields.length + 2} columnas.`
                      : "Aún no hay una hoja vinculada. Descarga la plantilla y conéctala."}
                  </p>
                  {form?.googleServiceEmail && (
                    <p className="mt-2 break-all text-xs text-muted-foreground">
                      Comparte la Sheet con: <span className="font-medium text-foreground">{form.googleServiceEmail}</span>
                    </p>
                  )}
                </div>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Descarga la plantilla CSV (el archivo se llama igual que la pestaña).</li>
                  <li>Ábrela en Google Sheets o impórtala a una hoja nueva.</li>
                  <li>Comparte el documento con la cuenta de servicio, con permiso de editor.</li>
                  <li>Pega la URL, revisa el nombre de la pestaña y pulsa Vincular hoja.</li>
                </ol>
                <div>
                  <Label>ID o URL de Google Sheets</Label>
                  <Input
                    className="mt-1"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
                <div>
                  <Label>Nombre de la pestaña</Label>
                  <Input
                    className="mt-1"
                    value={spreadsheetTab}
                    onChange={(e) => setSpreadsheetTab(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    La plantilla se descarga como <code>{sheetTabFilename(spreadsheetTab)}</code> para que Excel y Sheets
                    usen esa misma pestaña.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveSettings} disabled={saveMutation.isPending}>
                    Vincular hoja
                  </Button>
                  <Button variant="outline" asChild>
                    <a href={`/api/talento/forms/${encodeURIComponent(formSlug)}/template.csv?tab=${encodeURIComponent(spreadsheetTab || "Respuestas")}`}>
                      <Download className="h-4 w-4" />
                      Descargar {sheetTabFilename(spreadsheetTab)}
                    </a>
                  </Button>
                </div>
                </div>
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-medium">Encabezados que debe tener la fila 1</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se actualizan al guardar el formulario, incluido si arrastras una pregunta a otra sección.
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                    {fields.length === 0 ? (
                      <li>Se generan al guardar el formulario.</li>
                    ) : (
                      ["Fecha de envío", "ID de envío", ...fields.map((f) => f.label)].map((header, index) => (
                        <li key={`${header}-${index}`}>{header}</li>
                      ))
                    )}
                  </ol>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
