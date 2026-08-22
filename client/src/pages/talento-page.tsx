import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
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
  IntegrationFormDefinition,
  formatAnswerForSheet,
  getAllFields,
  sheetTabFilename,
} from "@shared/integration-form";
import { IntegrationForm, IntegrationResponse } from "@shared/schema";

function asDefinition(schema: unknown): IntegrationFormDefinition {
  return (schema as IntegrationFormDefinition) ?? DEFAULT_INTEGRATION_FORM;
}

export default function TalentoPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState("responses");

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
    queryKey: ["/api/talento/form"],
    enabled: user?.role === "talento",
  });

  const { data: responses = [], refetch, isFetching } = useQuery<IntegrationResponse[]>({
    queryKey: ["/api/talento/responses", search],
    queryFn: async () => {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const res = await fetch(`/api/talento/responses${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar las respuestas");
      return res.json();
    },
    enabled: user?.role === "talento",
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
      const res = await apiRequest("PATCH", "/api/talento/form", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talento/form"] });
      toast({ title: "Cambios guardados" });
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
              <p className="text-sm text-muted-foreground">Inicio › Respuestas</p>
              <h1 className="mt-1 font-heading text-4xl font-bold">{form?.title || "¡Súmate a WCA!"}</h1>
              <p className="mt-2 text-muted-foreground">
                Panel de Dirección de Talento y Bienestar. Reclutamiento, integración y postulaciones.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-[#5b8fd4] hover:bg-[#4a7fc4]" onClick={() => navigate("/talento/editar")}>
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
                    <a href="/api/talento/export.csv">
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

              <div className="rounded-xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      {fields.map((field) => (
                        <TableHead key={field.id} className="min-w-[160px]">
                          {field.label}
                        </TableHead>
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
                          Aún no hay postulaciones.
                        </TableCell>
                      </TableRow>
                    )}
                    {responses.map((item, index) => {
                      const answers = (item.answers ?? {}) as Record<string, unknown>;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleString("es-MX")
                              : "—"}
                          </TableCell>
                          {fields.map((field) => {
                            const raw = answers[field.id];
                            const formatted = formatAnswerForSheet(field, raw);
                            const key = `${item.id}-${field.id}`;
                            const isLong = formatted.length > 90;
                            const isChoice = field.type === "single_choice" || field.type === "multiple_choice";
                            return (
                              <TableCell key={field.id} className="align-top">
                                {field.type === "email" && formatted ? (
                                  <a className="text-[#5b8fd4] hover:underline" href={`mailto:${formatted}`}>
                                    {formatted}
                                  </a>
                                ) : field.type === "phone" && formatted ? (
                                  <a className="text-[#5b8fd4] hover:underline" href={`tel:${formatted.replace(/\s/g, "")}`}>
                                    {formatted}
                                  </a>
                                ) : field.type === "url" && formatted ? (
                                  <a className="text-[#5b8fd4] hover:underline" href={formatted} target="_blank" rel="noreferrer">
                                    Ver enlace
                                  </a>
                                ) : isChoice && Array.isArray(raw) ? (
                                  <div className="flex flex-wrap gap-1">
                                    {(raw as string[]).map((tag) => (
                                      <Badge key={tag} className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                        {formatAnswerForSheet(field, [tag])}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : isChoice && formatted ? (
                                  <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300">{formatted}</Badge>
                                ) : isLong ? (
                                  <div>
                                    <p>{expanded[key] ? formatted : `${formatted.slice(0, 90)}…`}</p>
                                    <button
                                      className="mt-1 text-xs text-[#5b8fd4]"
                                      onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                                    >
                                      {expanded[key] ? "Ver menos" : "Ver más"}
                                    </button>
                                  </div>
                                ) : (
                                  formatted || "—"
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <div className="relative min-h-[720px] overflow-x-hidden rounded-2xl border bg-[#0b1220] p-1">
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
                    <a href={`/api/talento/template.csv?tab=${encodeURIComponent(spreadsheetTab || "Respuestas")}`}>
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
