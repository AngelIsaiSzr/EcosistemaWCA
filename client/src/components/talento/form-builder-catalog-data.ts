import {
  Calendar,
  CheckSquare,
  CircleDot,
  Clock,
  FileUp,
  Flag,
  Hash,
  ImageIcon,
  LayoutList,
  Link2,
  ListChecks,
  Mail,
  Minus,
  Phone,
  Sparkles,
  Star,
  ToggleLeft,
  Type,
  AlignLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IntegrationFieldType } from "@shared/integration-form";
import { FIELD_TYPE_LABELS } from "@shared/integration-form";

export type CatalogItem =
  | { kind: "structure"; id: "welcome" | "ending" | "section"; label: string; icon: LucideIcon }
  | { kind: "field"; type: IntegrationFieldType; label: string; icon: LucideIcon };

export type CatalogCategory = {
  id: string;
  title: string;
  items: CatalogItem[];
};

export const FORM_CATALOG: CatalogCategory[] = [
  {
    id: "estructura",
    title: "Estructura",
    items: [
      { kind: "structure", id: "welcome", label: "Página de bienvenida", icon: Sparkles },
      { kind: "structure", id: "section", label: "Sección", icon: LayoutList },
      { kind: "structure", id: "ending", label: "Pantalla final", icon: Flag },
    ],
  },
  {
    id: "esenciales",
    title: "Esenciales",
    items: [
      { kind: "field", type: "short_text", label: FIELD_TYPE_LABELS.short_text, icon: Type },
      { kind: "field", type: "long_text", label: FIELD_TYPE_LABELS.long_text, icon: AlignLeft },
      { kind: "field", type: "single_choice", label: FIELD_TYPE_LABELS.single_choice, icon: CircleDot },
      { kind: "field", type: "yes_no", label: FIELD_TYPE_LABELS.yes_no, icon: ToggleLeft },
      { kind: "field", type: "multiple_choice", label: FIELD_TYPE_LABELS.multiple_choice, icon: ListChecks },
      { kind: "field", type: "dropdown", label: FIELD_TYPE_LABELS.dropdown, icon: LayoutList },
      { kind: "field", type: "number", label: FIELD_TYPE_LABELS.number, icon: Hash },
      { kind: "field", type: "checkbox", label: FIELD_TYPE_LABELS.checkbox, icon: CheckSquare },
      { kind: "field", type: "explanation", label: FIELD_TYPE_LABELS.explanation, icon: Type },
      { kind: "field", type: "separator", label: FIELD_TYPE_LABELS.separator, icon: Minus },
    ],
  },
  {
    id: "contacto",
    title: "Detalles de contacto",
    items: [
      { kind: "field", type: "email", label: FIELD_TYPE_LABELS.email, icon: Mail },
      { kind: "field", type: "phone", label: FIELD_TYPE_LABELS.phone, icon: Phone },
      { kind: "field", type: "url", label: FIELD_TYPE_LABELS.url, icon: Link2 },
    ],
  },
  {
    id: "fecha",
    title: "Fecha y hora",
    items: [
      { kind: "field", type: "date", label: FIELD_TYPE_LABELS.date, icon: Calendar },
      { kind: "field", type: "time", label: FIELD_TYPE_LABELS.time, icon: Clock },
    ],
  },
  {
    id: "calificacion",
    title: "Escalas de calificación",
    items: [{ kind: "field", type: "rating", label: FIELD_TYPE_LABELS.rating, icon: Star }],
  },
  {
    id: "cargas",
    title: "Cargas",
    items: [
      { kind: "field", type: "image_upload", label: FIELD_TYPE_LABELS.image_upload, icon: ImageIcon },
      { kind: "field", type: "file", label: FIELD_TYPE_LABELS.file, icon: FileUp },
    ],
  },
];
