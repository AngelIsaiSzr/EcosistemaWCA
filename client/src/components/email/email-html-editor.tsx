import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { motion } from "framer-motion";
import {
  Bold,
  Code2,
  Eye,
  Italic,
  LayoutTemplate,
  Monitor,
  Plus,
  Redo2,
  Smartphone,
  Type,
  Underline,
  Undo2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EMAIL_HTML_SNIPPETS, htmlToPlainText } from "@shared/email-presets";
import { cn } from "@/lib/utils";

type Mode = "visual" | "html" | "text";

const FRAME_STYLE = `
  html,body{margin:0;background:#ffffff;color:#1f2937;}
  body{padding:20px 12px;font-family:Arial,Helvetica,sans-serif;}
  #wca-root{outline:none;}
  #wca-root:focus-within{outline:none;}
  ::selection{background:#bfd6f6;}
`;

function frameDocument(html: string, editable: boolean) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${FRAME_STYLE}</style></head><body><div id="wca-root"${
    editable ? ' contenteditable="true" spellcheck="true"' : ""
  }>${html}</div></body></html>`;
}

function fitFrame(frame: HTMLIFrameElement | null, min = 380) {
  const doc = frame?.contentDocument;
  if (!frame || !doc?.body) return;
  frame.style.height = `${Math.max(min, doc.body.scrollHeight + 4)}px`;
}

/** Vista previa de solo lectura del correo. */
export function EmailPreviewFrame({ html, className, minHeight = 380 }: { html: string; className?: string; minHeight?: number }) {
  const ref = useRef<HTMLIFrameElement>(null);
  return (
    <iframe
      ref={ref}
      title="Vista previa del correo"
      sandbox="allow-same-origin"
      srcDoc={frameDocument(html, false)}
      onLoad={() => fitFrame(ref.current, minHeight)}
      className={cn("block w-full rounded-xl border bg-white", className)}
    />
  );
}

/** Editor tipo Word dentro de un iframe: se escribe directo sobre el correo y se sincroniza el HTML. */
function VisualEditor({
  html,
  onChange,
  width,
  insertRef,
}: {
  html: string;
  onChange: (html: string) => void;
  width: "desktop" | "mobile";
  insertRef: MutableRefObject<((snippet: string) => void) | null>;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lastHtml = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const htmlRef = useRef(html);
  htmlRef.current = html;

  const write = useCallback((value: string) => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc) return;
    doc.open();
    doc.write(frameDocument(value, true));
    doc.close();
    lastHtml.current = value;
    const root = doc.getElementById("wca-root");
    if (!root) return;
    root.addEventListener("input", () => {
      const next = root.innerHTML;
      lastHtml.current = next;
      onChangeRef.current(next);
      fitFrame(frame);
    });
    root.addEventListener("keydown", (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "b" || key === "i" || key === "u") {
        event.preventDefault();
        doc.execCommand(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
      }
    });
    requestAnimationFrame(() => fitFrame(frame));
  }, []);

  useEffect(() => {
    if (html !== lastHtml.current) write(html);
  }, [html, write]);

  useEffect(() => {
    requestAnimationFrame(() => fitFrame(frameRef.current));
  }, [width]);

  useEffect(() => {
    insertRef.current = (snippet: string) => {
      const doc = frameRef.current?.contentDocument;
      const root = doc?.getElementById("wca-root");
      if (!doc || !root) return;
      const selection = doc.getSelection();
      const inside = selection && selection.rangeCount > 0 && root.contains(selection.anchorNode);
      if (inside) {
        doc.execCommand("insertHTML", false, snippet);
      } else {
        const card = root.querySelector<HTMLElement>('div[style*="padding:28px"]') ?? root;
        const signature = Array.from(card.querySelectorAll("p")).find((el) => el.textContent?.includes("Dirección de Sede"));
        const holder = doc.createElement("div");
        holder.innerHTML = snippet;
        const nodes = Array.from(holder.childNodes);
        nodes.forEach((node) => (signature ? card.insertBefore(node, signature) : card.appendChild(node)));
      }
      const next = root.innerHTML;
      lastHtml.current = next;
      onChangeRef.current(next);
      fitFrame(frameRef.current);
    };
    return () => {
      insertRef.current = null;
    };
  }, [insertRef]);

  const exec = (command: string) => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    doc.execCommand(command);
    const root = doc.getElementById("wca-root");
    if (root) {
      lastHtml.current = root.innerHTML;
      onChangeRef.current(root.innerHTML);
    }
  };

  const tools = [
    { icon: Bold, label: "Negrita (Ctrl+B)", command: "bold" },
    { icon: Italic, label: "Cursiva (Ctrl+I)", command: "italic" },
    { icon: Underline, label: "Subrayado (Ctrl+U)", command: "underline" },
    { icon: Undo2, label: "Deshacer", command: "undo" },
    { icon: Redo2, label: "Rehacer", command: "redo" },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {tools.map((tool, i) => (
          <span key={tool.command} className="contents">
            {i === 3 && <span className="mx-1 h-4 w-px bg-border" />}
            <motion.button
              type="button"
              title={tool.label}
              aria-label={tool.label}
              whileTap={{ scale: 0.9 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(tool.command)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-[#5b8fd4]/15 hover:text-[#5b8fd4]"
            >
              <tool.icon className="h-3.5 w-3.5" />
            </motion.button>
          </span>
        ))}
      </div>
      <div className={cn("mx-auto transition-[max-width] duration-300", width === "mobile" ? "max-w-[380px]" : "max-w-full")}>
        <iframe
          ref={frameRef}
          title="Editor visual del correo"
          sandbox="allow-same-origin"
          onLoad={() => {
            if (!frameRef.current?.contentDocument?.getElementById("wca-root")) write(htmlRef.current);
          }}
          className="block w-full rounded-xl border bg-white transition-[height]"
          style={{ height: 380 }}
        />
      </div>
    </div>
  );
}

export function EmailHtmlEditor({
  html,
  text,
  onHtmlChange,
  onTextChange,
}: {
  html: string;
  text: string;
  onHtmlChange: (html: string) => void;
  onTextChange: (text: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("visual");
  const [width, setWidth] = useState<"desktop" | "mobile">("desktop");
  const insertVisual = useRef<((snippet: string) => void) | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[0] | null>(null);

  const insertSnippet = (snippet: string) => {
    if (mode === "visual") {
      insertVisual.current?.(snippet);
      return;
    }
    const editor = monacoRef.current;
    if (editor) {
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits("snippet", [{ range: selection, text: `\n${snippet}\n`, forceMoveMarkers: true }]);
        editor.focus();
        return;
      }
    }
    onHtmlChange(`${html}\n${snippet}`);
  };

  const modes: { id: Mode; label: string; icon: typeof Eye }[] = [
    { id: "visual", label: "Visual", icon: Eye },
    { id: "html", label: "HTML", icon: Code2 },
    { id: "text", label: "Texto plano", icon: Type },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-2.5 py-2">
        <div className="flex gap-1 rounded-lg bg-muted/70 p-0.5 text-xs">
          {modes.map((m) => {
            const active = m.id === mode;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="email-editor-mode"
                    className="absolute inset-0 rounded-md bg-background shadow-sm dark:bg-white/10"
                    transition={{ type: "spring", stiffness: 450, damping: 36 }}
                  />
                )}
                <m.icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {mode !== "text" && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1.5 rounded-lg px-2 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Insertar bloque
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  Bloques con el estilo WCA
                </DropdownMenuLabel>
                {EMAIL_HTML_SNIPPETS.map((snippet) => (
                  <DropdownMenuItem key={snippet.id} onSelect={() => insertSnippet(snippet.html)}>
                    {snippet.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {mode === "visual" && (
            <div className="flex rounded-lg bg-muted/70 p-0.5">
              {(
                [
                  { id: "desktop", icon: Monitor, label: "Vista de escritorio" },
                  { id: "mobile", icon: Smartphone, label: "Vista de celular" },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  title={w.label}
                  aria-label={w.label}
                  onClick={() => setWidth(w.id)}
                  className={cn(
                    "flex h-6 w-7 items-center justify-center rounded-md transition",
                    width === w.id ? "bg-background text-foreground shadow-sm dark:bg-white/10" : "text-muted-foreground",
                  )}
                >
                  <w.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-2.5">
        {mode === "visual" && (
          <>
            <VisualEditor html={html} onChange={onHtmlChange} width={width} insertRef={insertVisual} />
            <p className="mt-2 px-1 text-[11px] text-muted-foreground">
              Escribe directo sobre el correo como en Word. Lo que ves es lo que les llega.
            </p>
          </>
        )}

        {mode === "html" && (
          <div className="space-y-2.5">
            <div className="overflow-hidden rounded-xl border">
              <Editor
                height="300px"
                defaultLanguage="html"
                value={html}
                theme="vs-dark"
                onChange={(value) => onHtmlChange(value ?? "")}
                onMount={(editor) => {
                  monacoRef.current = editor;
                }}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12.5,
                  wordWrap: "on",
                  tabSize: 2,
                  lineNumbers: "on",
                  automaticLayout: true,
                }}
              />
            </div>
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Vista previa en vivo</p>
            <EmailPreviewFrame html={html} minHeight={260} />
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3 px-1">
              <p className="text-[11px] text-muted-foreground">
                Versión sin diseño para apps de correo que no muestran HTML. Normalmente nadie la ve, pero conviene que coincida.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0 gap-1.5 rounded-lg text-xs"
                onClick={() => onTextChange(htmlToPlainText(html))}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Generar desde el diseño
              </Button>
            </div>
            <Textarea
              rows={16}
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              className="wca-scroll font-mono text-xs leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
}
