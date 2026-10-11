import { forwardRef, useEffect, useState, type HTMLAttributes } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Course,
  Team,
  Testimonial,
  Module,
  Section,
  insertCourseSchema,
  insertTeamSchema,
  insertTestimonialSchema,
  insertModuleSchema,
  insertSectionSchema
} from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  AdminEditPanel,
  AdminEmptyState,
  AdminPanelBody,
  AdminPanelFooter,
  AdminPanelHeader,
  AdminPanelSection,
  AdminPanelTabs,
  AdminSearchInput,
  AdminTile,
  matchesSearch,
} from "@/components/admin/edit-panel";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";
import { ImageUrlInput } from "@/components/media/image-url-input";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_LXP_ENROLLMENT_URL } from "@shared/lxp-enrollment";
import {
  DEFAULT_TEAM_ROLE_COLOR,
  TEAM_ROLE_COLORS,
  getTeamRoleColorMeta,
  getTeamRoleCssColor,
  isTeamRoleColorId,
} from "@shared/team-colors";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Pencil,
  ArrowLeft,
  Clapperboard,
  Plus,
  Layers,
  Eye,
  EyeOff,
  Star,
  MessageSquareQuote,
  ImageIcon,
  Radio,
  Linkedin,
  Github,
  Instagram,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const courseFormSchema = insertCourseSchema.extend({
  title: z.string().min(3, "El título es requerido"),
  slug: z.string().min(3, "El slug es requerido"),
  description: z.string().min(10, "La descripción es requerida"),
  shortDescription: z.string().min(10, "La descripción corta es requerida"),
  level: z.string().min(3, "El nivel es requerido"),
  category: z.string().min(3, "La categoría es requerida"),
  duration: z.number({
    required_error: "La duración es requerida",
    invalid_type_error: "La duración debe ser un número"
  }).min(1, "La duración debe ser mayor a 0"),
  modules: z.number({
    required_error: "El número de módulos es requerido",
    invalid_type_error: "El número de módulos debe ser un número"
  }).min(1, "El número de módulos debe ser mayor a 0"),
  image: z.string().min(5, "La URL de la imagen es requerida"),
  instructor: z.string().min(3, "El instructor es requerido"),
  featured: z.boolean().optional(),
  popular: z.boolean().optional(),
  new: z.boolean().optional(),
  isLive: z.boolean().optional().default(false),
  liveDetails: z.object({
    liveDuration: z.string().min(1, "La duración del programa en vivo es requerida."),
    schedule: z.string().min(1, "El horario del programa en vivo es requerido."),
    modality: z.enum(["Presencial", "Virtual", "Mixta"], { message: "Por favor, selecciona una modalidad.", }),
    address: z.string().min(1, "La dirección del programa en vivo es requerida."),
    contact: z.string().min(1, "El contacto del programa en vivo es requerido."),
  }).optional(),
  isDisabled: z.boolean().optional().default(false),
  comingSoon: z.boolean().optional().default(false),
  techHumanSpecialization: z.boolean().optional().default(false),
  lxpEnrollmentUrl: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.isLive) {
    if (!data.liveDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Los detalles del programa en vivo son requeridos si el programa es en vivo.',
        path: ['liveDetails'],
      });
      return;
    }
    // Validar campos individuales dentro de liveDetails si isLive es true
    if (!data.liveDetails.liveDuration || data.liveDetails.liveDuration.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La duración del programa en vivo es requerida.',
        path: ['liveDetails.liveDuration'],
      });
    }
    if (!data.liveDetails.schedule || data.liveDetails.schedule.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El horario del programa en vivo es requerido.',
        path: ['liveDetails.schedule'],
      });
    }
    if (!data.liveDetails.modality) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La modalidad del programa en vivo es requerida.',
        path: ['liveDetails.modality'],
      });
    }
    if (!data.liveDetails.address || data.liveDetails.address.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La dirección del programa en vivo es requerida.',
        path: ['liveDetails.address'],
      });
    }
    if (!data.liveDetails.contact || data.liveDetails.contact.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El contacto del programa en vivo es requerido.',
        path: ['liveDetails.contact'],
      });
    }
  }
  if (data.techHumanSpecialization && data.lxpEnrollmentUrl?.trim()) {
    const raw = data.lxpEnrollmentUrl.trim();
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      void new URL(candidate);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa una URL válida para la LXP (ej. https://lxp.ecosistemawca.com).",
        path: ["lxpEnrollmentUrl"],
      });
    }
  }
});

function coursePayloadFromForm(data: CourseFormValues) {
  const techHuman = !!data.techHumanSpecialization;
  return {
    ...data,
    isLive: techHuman ? false : !!data.isLive,
    liveDetails: techHuman ? null : data.isLive ? data.liveDetails : null,
    techHumanSpecialization: techHuman,
    lxpEnrollmentUrl: techHuman ? data.lxpEnrollmentUrl?.trim() || null : null,
  };
}

const teamFormSchema = insertTeamSchema.extend({
  name: z.string().min(3, "El nombre es requerido"),
  role: z.string().min(3, "El cargo es requerido"),
  bio: z.string().min(10, "La biografía es requerida"),
  image: z.string().min(5, "La URL de la imagen es requerida"),
  roleColor: z.string().default(DEFAULT_TEAM_ROLE_COLOR),
  order: z.number().optional(),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
});

const testimonialFormSchema = insertTestimonialSchema.extend({
  image: z.string().min(5, "La URL de la imagen es requerida"),
  order: z.number({
    required_error: "El orden es requerido",
    invalid_type_error: "El orden debe ser un número"
  }).min(1, "El orden debe ser mayor a 0"),
});

const moduleFormSchema = insertModuleSchema.extend({
  title: z.string().min(3, "El título es requerido"),
  description: z.string().min(10, "La descripción es requerida"),
  duration: z.number({
    required_error: "La duración es requerida",
    invalid_type_error: "La duración debe ser un número"
  }).min(1, "La duración debe ser mayor a 0"),
  order: z.number({
    required_error: "El orden es requerido",
    invalid_type_error: "El orden debe ser un número"
  }).min(1, "El orden debe ser mayor a 0"),
});

const sectionFormSchema = insertSectionSchema.extend({
  title: z.string().min(3, "El título es requerido"),
  content: z.string().min(10, "El contenido es requerido"),
  duration: z.number({
    required_error: "La duración es requerida",
    invalid_type_error: "La duración debe ser un número"
  }).min(1, "La duración debe ser mayor a 0"),
  order: z.number({
    required_error: "El orden es requerido",
    invalid_type_error: "El orden debe ser un número"
  }).min(1, "El orden debe ser mayor a 0"),
});

type CourseFormValues = z.infer<typeof courseFormSchema>;
type TeamFormValues = z.infer<typeof teamFormSchema>;
type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;
type ModuleFormValues = z.infer<typeof moduleFormSchema>;
type SectionFormValues = z.infer<typeof sectionFormSchema>;

const ADMIN_SECTIONS = {
  programas: {
    tab: "courses",
    title: "Programas",
    description: "Crea y edita programas, módulos y secciones de la plataforma.",
  },
  equipo: {
    tab: "team",
    title: "Equipo",
    description: "Gestiona los perfiles completos del equipo que aparecen en el sitio.",
  },
  testimonios: {
    tab: "testimonials",
    title: "Testimonios",
    description: "Administra reseñas y testimonios públicos de la comunidad.",
  },
} as const;

type AdminSectionSlug = keyof typeof ADMIN_SECTIONS;

type CourseTab = "general" | "imagen" | "etiquetas" | "envivo" | "modulos";

const COURSE_TAB_FIELDS: Record<Exclude<CourseTab, "modulos">, string[]> = {
  general: ["title", "slug", "level", "category", "duration", "modules", "shortDescription", "description", "instructor"],
  imagen: ["image"],
  etiquetas: ["lxpEnrollmentUrl"],
  envivo: ["liveDetails", "isLive"],
};

const NEW_ITEM_LABEL: Record<string, string> = {
  courses: "Nuevo programa",
  team: "Nuevo integrante",
  testimonials: "Nuevo testimonio",
};

const COURSE_CATEGORIES = [
  "Desarrollo Web",
  "Frontend",
  "Backend",
  "FullStack",
  "Desarrollo Móvil",
  "Diseño UX/UI",
  "Ciberseguridad",
  "Computación",
  "Informática",
  "Ofimática",
  "Herramientas Digitales",
  "Pensamiento Computacional",
  "Educación Tecnológica",
  "Programación",
  "Ciencia de Datos",
  "DevOps",
  "Inteligencia Artificial",
  "Innovación Social",
];

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function courseStatus(course: Course): { label: string; dot: string } {
  if (course.isDisabled) return { label: "Inhabilitado", dot: "bg-zinc-400" };
  if (course.comingSoon) return { label: "Próximamente", dot: "bg-amber-400" };
  if (course.isLive) return { label: "En vivo", dot: "bg-rose-500" };
  if (course.techHumanSpecialization) return { label: "TechHuman", dot: "bg-cyan-400" };
  return { label: "Activo", dot: "bg-emerald-400" };
}

type RatingStarsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "lg";
};

const RatingStars = forwardRef<HTMLDivElement, RatingStarsProps>(
  ({ value, onChange, size = "sm", className, ...rest }, ref) => {
    const iconClass = size === "lg" ? "h-7 w-7" : "h-3.5 w-3.5";
    return (
      <div ref={ref} className={cn("flex items-center gap-0.5", className)} {...rest}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = n <= value;
          const star = (
            <Star
              className={cn(
                iconClass,
                "transition-colors duration-200",
                filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          );
          if (!onChange) return <span key={n}>{star}</span>;
          return (
            <motion.button
              key={n}
              type="button"
              aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onChange(n)}
              className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b8fd4]"
            >
              {star}
            </motion.button>
          );
        })}
      </div>
    );
  },
);
RatingStars.displayName = "RatingStars";

export default function AdminPage({
  params,
  portal = "admin",
}: {
  params?: Record<string | number, string | undefined>;
  /** En Talento solo se usa la sección Equipo. */
  portal?: "admin" | "talento";
}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sectionSlug = (params?.section || (portal === "talento" ? "equipo" : "programas")) as string;
  const sectionMeta =
    sectionSlug in ADMIN_SECTIONS
      ? ADMIN_SECTIONS[sectionSlug as AdminSectionSlug]
      : null;
  const activeTab = sectionMeta?.tab ?? "courses";
  const isTalentoPortal = portal === "talento";

  // Estados para los diálogos de confirmación
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);
  const [testimonialToDelete, setTestimonialToDelete] = useState<number | null>(null);
  const [showLiveSettings, setShowLiveSettings] = useState(false);

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (isTalentoPortal) {
      if (user.role !== "talento") {
        navigate("/");
        toast({
          title: "Acceso denegado",
          description: "Esta sección pertenece al panel de Talento.",
          variant: "destructive",
        });
      }
      return;
    }
    if (user.role !== "admin") {
      navigate("/auth");
    }
  }, [user, navigate, toast, isTalentoPortal]);

  useEffect(() => {
    if (!sectionMeta) {
      navigate(isTalentoPortal ? "/talento" : "/admin");
      return;
    }
    // Equipo ya no vive en Admin
    if (!isTalentoPortal && sectionSlug === "equipo") {
      navigate("/talento/equipo");
    }
  }, [sectionMeta, navigate, isTalentoPortal, sectionSlug]);

  // Fetch data
  const { data: courses, refetch: refetchCourses } = useQuery<Course[]>({
    queryKey: ["/api/programs"],
  });

  const { data: teamMembers, refetch: refetchTeam } = useQuery<Team[]>({
    queryKey: ["/api/team"],
  });

  const { data: testimonials, refetch: refetchTestimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"],
  });

  // Delete course mutation
  const deleteCourse = useMutation({
    mutationFn: async (courseId: number) => {
      const response = await apiRequest("DELETE", `/api/programs/${courseId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el programa");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Programa eliminado",
        description: "El programa ha sido eliminado correctamente",
      });
      refetchCourses();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete team member mutation
  const deleteTeamMember = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await apiRequest("DELETE", `/api/team/${teamId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el miembro del equipo");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Miembro eliminado",
        description: "El miembro del equipo ha sido eliminado correctamente",
      });
      refetchTeam();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete testimonial mutation
  const deleteTestimonial = useMutation({
    mutationFn: async (testimonialId: number) => {
      const response = await apiRequest("DELETE", `/api/testimonials/${testimonialId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el testimonio");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Testimonio eliminado",
        description: "El testimonio ha sido eliminado correctamente",
      });
      refetchTestimonials();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // State variables
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [search, setSearch] = useState("");
  const [coursePanelOpen, setCoursePanelOpen] = useState(false);
  const [courseTab, setCourseTab] = useState<CourseTab>("general");
  const [teamPanelOpen, setTeamPanelOpen] = useState(false);
  const [testimonialPanelOpen, setTestimonialPanelOpen] = useState(false);
  const [showSocials, setShowSocials] = useState(true);

  // Default empty values for course form
  const emptyCourseValues = {
    title: "",
    slug: "",
    description: "",
    shortDescription: "",
    level: "Principiante",
    category: "Desarrollo Web",
    duration: 0,
    modules: 0,
    image: "",
    featured: false,
    popular: false,
    new: false,
    instructor: "",
    isLive: false,
    liveDetails: undefined,
    isDisabled: false,
    comingSoon: false,
    techHumanSpecialization: false,
    lxpEnrollmentUrl: "",
  };

  // Course form
  const courseForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: emptyCourseValues,
  });

  // Update form with course data when editing
  useEffect(() => {
    if (editingCourse) {
      courseForm.reset({
        title: editingCourse.title,
        slug: editingCourse.slug,
        description: editingCourse.description,
        shortDescription: editingCourse.shortDescription,
        level: editingCourse.level,
        category: editingCourse.category,
        duration: editingCourse.duration,
        modules: editingCourse.modules,
        image: editingCourse.image,
        featured: editingCourse.featured || false,
        popular: editingCourse.popular || false,
        new: editingCourse.new || false,
        instructor: editingCourse.instructor,
        isLive: editingCourse.isLive || false,
        liveDetails: editingCourse.liveDetails || undefined,
        isDisabled: editingCourse.isDisabled || false,
        comingSoon: editingCourse.comingSoon || false,
        techHumanSpecialization: editingCourse.techHumanSpecialization || false,
        lxpEnrollmentUrl: editingCourse.lxpEnrollmentUrl || "",
      });
      // Si estamos editando un programa en vivo, mostrar las configuraciones
      if (editingCourse.isLive) {
        setShowLiveSettings(true);
      }
    }
  }, [editingCourse, courseForm]);

  // Handle isLive checkbox change
  const handleIsLiveChange = (checked: boolean) => {
    courseForm.setValue("isLive", checked);
    if (checked) {
      courseForm.setValue("techHumanSpecialization", false);
    }
    if (!checked) {
      setShowLiveSettings(false);
      courseForm.setValue('liveDetails', undefined); // Limpiar liveDetails si no es en vivo
    }
  };

  const handleTechHumanChange = (checked: boolean) => {
    courseForm.setValue("techHumanSpecialization", checked);
    if (checked) {
      courseForm.setValue("isLive", false);
      setShowLiveSettings(false);
      courseForm.setValue("liveDetails", undefined);
      if (!courseForm.getValues("lxpEnrollmentUrl")?.trim()) {
        courseForm.setValue("lxpEnrollmentUrl", DEFAULT_LXP_ENROLLMENT_URL);
      }
    }
  };

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      const payload = coursePayloadFromForm(data);
      const res = await apiRequest("POST", "/api/programs", payload);
      return res.json() as Promise<Course>;
    },
    onSuccess: (created) => {
      toast({
        title: "Programa creado",
        description: "El programa se ha creado correctamente.",
      });
      queryClient.setQueryData<Course[]>(["/api/programs"], (old) =>
        old ? [...old, created] : [created],
      );
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el programa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CourseFormValues }) => {
      const payload = coursePayloadFromForm(data);
      const res = await apiRequest("PATCH", `/api/programs/${id}`, payload);
      return res.json() as Promise<Course>;
    },
    onSuccess: (updated) => {
      toast({
        title: "Programa actualizado",
        description: "El programa se ha actualizado correctamente.",
      });
      queryClient.setQueryData<Course[]>(["/api/programs"], (old) =>
        old ? old.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) : old,
      );
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el programa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCourseSubmit = (data: CourseFormValues) => {
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data }, { onSuccess: () => closeCoursePanel() });
    } else {
      createCourseMutation.mutate(data, { onSuccess: () => closeCoursePanel() });
    }
  };

  const onCourseInvalid = (errors: FieldErrors<CourseFormValues>) => {
    const keys = Object.keys(errors);
    const tab = (Object.keys(COURSE_TAB_FIELDS) as Exclude<CourseTab, "modulos">[]).find((t) =>
      COURSE_TAB_FIELDS[t].some((f) => keys.includes(f)),
    );
    if (tab) setCourseTab(tab);
    toast({
      title: "Revisa los campos marcados",
      description: "Hay datos faltantes o inválidos en el programa.",
      variant: "destructive",
    });
  };

  const openCourse = (course: Course, tab: CourseTab = "general") => {
    setEditingCourse(course);
    setSelectedCourse(course);
    setSelectedModule(null);
    setEditingModule(null);
    setEditingSection(null);
    moduleForm.reset({
      ...emptyModuleValues,
      courseId: course.id,
      instructor: course.instructor,
    });
    setCourseTab(tab);
    setCoursePanelOpen(true);
  };

  const openNewCourse = () => {
    setEditingCourse(null);
    setSelectedCourse(null);
    setSelectedModule(null);
    courseForm.reset(emptyCourseValues);
    setShowLiveSettings(false);
    setCourseTab("general");
    setCoursePanelOpen(true);
  };

  function closeCoursePanel() {
    setCoursePanelOpen(false);
    setEditingCourse(null);
    setSelectedCourse(null);
    setSelectedModule(null);
    setEditingModule(null);
    setEditingSection(null);
    setShowLiveSettings(false);
  }

  const toggleCourseDisabled = (course: Course) => {
    updateCourseMutation.mutate({
      id: course.id,
      data: {
        title: course.title,
        slug: course.slug,
        description: course.description,
        shortDescription: course.shortDescription,
        level: course.level,
        category: course.category,
        duration: course.duration,
        modules: course.modules,
        image: course.image,
        instructor: course.instructor,
        featured: course.featured as boolean,
        popular: course.popular as boolean,
        new: course.new as boolean,
        isLive: course.isLive as boolean,
        liveDetails: (course.liveDetails || undefined) as CourseFormValues["liveDetails"],
        isDisabled: !(course.isDisabled as boolean),
        comingSoon: course.comingSoon as boolean,
        techHumanSpecialization: course.techHumanSpecialization as boolean,
        lxpEnrollmentUrl: (course.lxpEnrollmentUrl as string) || "",
      },
    });
  };

  const cancelEditing = () => {
    setEditingCourse(null);
    courseForm.reset(emptyCourseValues);
  };

  // Handle slug generation
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    courseForm.setValue("title", title);

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");

    courseForm.setValue("slug", slug);
  };

  // Default empty values for team form
  const emptyTeamValues = {
    name: "",
    role: "",
    bio: "",
    image: "",
    linkedIn: "",
    github: "",
    twitter: "",
    instagram: "",
    roleColor: DEFAULT_TEAM_ROLE_COLOR,
    order: 1,
  };

  // Team member form  
  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: emptyTeamValues,
  });
  const watchedTeamImage = teamForm.watch("image");
  const watchedRoleColor = teamForm.watch("roleColor");

  // Update form with team member data when editing
  useEffect(() => {
    if (editingTeam) {
      teamForm.reset({
        name: editingTeam.name,
        role: editingTeam.role,
        bio: editingTeam.bio,
        image: editingTeam.image,
        linkedIn: editingTeam.linkedIn || "",
        github: editingTeam.github || "",
        twitter: editingTeam.twitter || "",
        instagram: editingTeam.instagram || "",
        roleColor: isTeamRoleColorId(editingTeam.roleColor)
          ? editingTeam.roleColor
          : DEFAULT_TEAM_ROLE_COLOR,
        order: editingTeam.order,
      });
    }
  }, [editingTeam, teamForm]);

  const createTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamFormValues) => {
      const res = await apiRequest("POST", "/api/team", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Miembro agregado",
        description: "El miembro del equipo se ha agregado correctamente.",
      });
      teamForm.reset(emptyTeamValues);
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al agregar miembro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update team member mutation
  const updateTeamMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TeamFormValues> }) => {
      const res = await apiRequest("PATCH", `/api/team/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Miembro actualizado",
        description: "El miembro del equipo se ha actualizado correctamente.",
      });
      teamForm.reset(emptyTeamValues);
      setEditingTeam(null);
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar miembro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderTeamMutation = useMutation({
    mutationFn: async (updates: { id: number; order: number }[]) => {
      await Promise.all(
        updates.map((item) => apiRequest("PATCH", `/api/team/${item.id}`, { order: item.order })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team"] });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onTeamSubmit = (data: TeamFormValues) => {
    const roleColor = isTeamRoleColorId(data.roleColor)
      ? data.roleColor
      : DEFAULT_TEAM_ROLE_COLOR;
    if (editingTeam) {
      updateTeamMemberMutation.mutate(
        {
          id: editingTeam.id,
          data: { ...data, roleColor, order: editingTeam.order },
        },
        { onSuccess: () => closeTeamPanel() },
      );
      return;
    }
    const nextOrder =
      teamMembers && teamMembers.length > 0
        ? Math.max(...teamMembers.map((m) => m.order)) + 1
        : 1;
    createTeamMemberMutation.mutate(
      { ...data, roleColor, order: nextOrder },
      { onSuccess: () => closeTeamPanel() },
    );
  };

  const openTeam = (member: Team) => {
    setEditingTeam(member);
    setTeamPanelOpen(true);
  };

  const openNewTeam = () => {
    setEditingTeam(null);
    teamForm.reset(emptyTeamValues);
    setTeamPanelOpen(true);
  };

  function closeTeamPanel() {
    setTeamPanelOpen(false);
    setEditingTeam(null);
  }

  const moveTeamMember = (index: number, direction: -1 | 1) => {
    if (!teamMembers?.length) return;
    const sorted = [...teamMembers].sort((a, b) => a.order - b.order);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[target];
    reorderTeamMutation.mutate([
      { id: a.id, order: b.order },
      { id: b.id, order: a.order },
    ]);
  };

  const cancelEditingTeam = () => {
    setEditingTeam(null);
    teamForm.reset(emptyTeamValues);
  };

  // Default empty values for testimonial form
  const emptyTestimonialValues = {
    name: "",
    courseName: "",
    text: "",
    image: "",
    rating: 5,
    order: 1,
  };

  // Testimonial form  
  const testimonialForm = useForm<TestimonialFormValues>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: emptyTestimonialValues,
  });

  // Update form with testimonial data when editing
  useEffect(() => {
    if (editingTestimonial) {
      testimonialForm.reset({
        name: editingTestimonial.name,
        courseName: editingTestimonial.courseName,
        text: editingTestimonial.text,
        image: editingTestimonial.image,
        rating: editingTestimonial.rating,
        order: editingTestimonial.order,
      });
    }
  }, [editingTestimonial, testimonialForm]);

  const createTestimonialMutation = useMutation({
    mutationFn: async (data: TestimonialFormValues) => {
      const res = await apiRequest("POST", "/api/testimonials", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Testimonio agregado",
        description: "El testimonio se ha agregado correctamente.",
      });
      testimonialForm.reset(emptyTestimonialValues);
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al agregar testimonio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update testimonial mutation
  const updateTestimonialMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TestimonialFormValues }) => {
      const res = await apiRequest("PATCH", `/api/testimonials/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Testimonio actualizado",
        description: "El testimonio se ha actualizado correctamente.",
      });
      testimonialForm.reset(emptyTestimonialValues);
      setEditingTestimonial(null);
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar testimonio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reorderTestimonialsMutation = useMutation({
    mutationFn: async (updates: { id: number; order: number }[]) => {
      await Promise.all(
        updates.map((item) => apiRequest("PATCH", `/api/testimonials/${item.id}`, { order: item.order })),
      );
      return updates;
    },
    onMutate: (updates) => {
      queryClient.setQueryData<typeof testimonials>(["/api/testimonials"], (old) =>
        old?.map((t) => {
          const update = updates.find((u) => u.id === t.id);
          return update ? { ...t, order: update.order } : t;
        }),
      );
      const current = editingTestimonial && updates.find((u) => u.id === editingTestimonial.id);
      if (current) testimonialForm.setValue("order", current.order);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo reordenar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveTestimonial = (index: number, direction: -1 | 1) => {
    if (!testimonials?.length) return;
    const sorted = [...testimonials].sort((a, b) => a.order - b.order);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    const updates = sorted
      .map((t, i) => ({ id: t.id, order: i + 1, prev: t.order }))
      .filter((t) => t.order !== t.prev)
      .map(({ id, order }) => ({ id, order }));
    if (updates.length) reorderTestimonialsMutation.mutate(updates);
  };

  const onTestimonialSubmit = (data: TestimonialFormValues) => {
    if (editingTestimonial) {
      updateTestimonialMutation.mutate(
        { id: editingTestimonial.id, data },
        { onSuccess: () => closeTestimonialPanel() },
      );
    } else {
      createTestimonialMutation.mutate(data, { onSuccess: () => closeTestimonialPanel() });
    }
  };

  const openTestimonial = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial);
    setTestimonialPanelOpen(true);
  };

  const openNewTestimonial = () => {
    setEditingTestimonial(null);
    testimonialForm.reset({
      ...emptyTestimonialValues,
      order: testimonials?.length ? Math.max(...testimonials.map((t) => t.order)) + 1 : 1,
    });
    setTestimonialPanelOpen(true);
  };

  function closeTestimonialPanel() {
    setTestimonialPanelOpen(false);
    setEditingTestimonial(null);
  }

  const cancelEditingTestimonial = () => {
    setEditingTestimonial(null);
    testimonialForm.reset(emptyTestimonialValues);
  };

  // Default empty values for module form
  const emptyModuleValues = {
    courseId: 0,
    title: "",
    description: "",
    duration: 1,
    order: 1,
    difficulty: "Principiante",
    instructor: "",
  };

  // Module form 
  const moduleForm = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: emptyModuleValues,
  });

  // Update form with module data when editing
  useEffect(() => {
    if (editingModule) {
      moduleForm.reset({
        courseId: editingModule.courseId,
        title: editingModule.title,
        description: editingModule.description,
        duration: editingModule.duration,
        order: editingModule.order,
        difficulty: editingModule.difficulty,
        instructor: editingModule.instructor,
      });
    } else if (selectedCourse) {
      moduleForm.setValue("courseId", selectedCourse.id);
      moduleForm.setValue("instructor", selectedCourse.instructor);
    }
  }, [editingModule, selectedCourse, moduleForm]);

  // Fetch modules for selected course
  const { data: modules, refetch: refetchModules } = useQuery<Module[]>({
    queryKey: ["/api/programs", selectedCourse?.id, "modules"],
    queryFn: async () => {
      if (!selectedCourse) return [];
      const res = await fetch(`/api/programs/${selectedCourse.id}/modules`);
      if (!res.ok) throw new Error("Error al cargar los módulos");
      return res.json();
    },
    enabled: !!selectedCourse,
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormValues) => {
      const res = await apiRequest("POST", "/api/modules", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Módulo creado",
        description: "El módulo se ha creado correctamente.",
      });
      moduleForm.reset({
        ...emptyModuleValues,
        courseId: selectedCourse?.id || 0,
        order: modules?.length ? modules.length + 1 : 1,
        instructor: selectedCourse?.instructor || "",
      });
      setEditingModule(null);
      refetchModules();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const response = await apiRequest("DELETE", `/api/modules/${moduleId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el módulo");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Módulo eliminado",
        description: "El módulo ha sido eliminado correctamente",
      });
      refetchModules();

      setModuleToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ModuleFormValues }) => {
      const res = await apiRequest("PATCH", `/api/modules/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Módulo actualizado",
        description: "El módulo se ha actualizado correctamente.",
      });
      moduleForm.reset(emptyModuleValues);
      setEditingModule(null);
      refetchModules();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onModuleSubmit = (data: ModuleFormValues) => {
    // Check if order already exists
    const orderExists = modules?.some(m =>
      m.order === data.order && (!editingModule || m.id !== editingModule.id)
    );

    if (orderExists) {
      toast({
        title: "Error de orden",
        description: "Ya existe un módulo con ese número de orden. Por favor, elige otro número.",
        variant: "destructive",
      });
      return;
    }

    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, data });
    } else {
      createModuleMutation.mutate(data);
    }
  };

  const cancelEditingModule = () => {
    setEditingModule(null);
    if (selectedCourse) {
      moduleForm.reset({
        ...emptyModuleValues,
        courseId: selectedCourse.id,
        order: modules?.length ? modules.length + 1 : 1,
        instructor: selectedCourse.instructor,
      });
    }
  };

  // Default empty values for section form
  const emptySectionValues = {
    moduleId: 0,
    title: "",
    content: "",
    duration: 30,
    order: 1,
  };

  // Section form
  const sectionForm = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: emptySectionValues,
  });

  // Update form with section data when editing
  useEffect(() => {
    if (editingSection) {
      sectionForm.reset({
        moduleId: editingSection.moduleId,
        title: editingSection.title,
        content: editingSection.content,
        duration: editingSection.duration,
        order: editingSection.order,
      });
    } else if (selectedModule) {
      sectionForm.setValue("moduleId", selectedModule.id);
    }
  }, [editingSection, selectedModule, sectionForm]);

  // Fetch sections for selected module
  const { data: sections, refetch: refetchSections } = useQuery<Section[]>({
    queryKey: ["/api/modules", selectedModule?.id, "sections"],
    queryFn: async () => {
      if (!selectedModule) return [];
      const res = await fetch(`/api/modules/${selectedModule.id}/sections`);
      if (!res.ok) throw new Error("Error al cargar las secciones");
      return res.json();
    },
    enabled: !!selectedModule,
  });

  // Create section mutation
  const createSectionMutation = useMutation({
    mutationFn: async (data: SectionFormValues) => {
      const res = await apiRequest("POST", "/api/sections", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sección creada",
        description: "La sección se ha creado correctamente.",
      });
      sectionForm.reset({
        ...emptySectionValues,
        moduleId: selectedModule?.id || 0,
        order: sections?.length ? sections.length + 1 : 1,
      });
      setEditingSection(null);
      refetchSections();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear la sección",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete section mutation
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: number) => {
      const response = await apiRequest("DELETE", `/api/sections/${sectionId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar la sección");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sección eliminada",
        description: "La sección ha sido eliminada correctamente",
      });
      refetchSections();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update section mutation
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SectionFormValues }) => {
      const res = await apiRequest("PATCH", `/api/sections/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sección actualizada",
        description: "La sección se ha actualizado correctamente.",
      });
      sectionForm.reset(emptySectionValues);
      setEditingSection(null);
      refetchSections();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar la sección",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSectionSubmit = (data: SectionFormValues) => {
    // Check if order already exists
    const orderExists = sections?.some(s =>
      s.order === data.order && (!editingSection || s.id !== editingSection.id)
    );

    if (orderExists) {
      toast({
        title: "Error de orden",
        description: "Ya existe una sección con ese número de orden. Por favor, elige otro número.",
        variant: "destructive",
      });
      return;
    }

    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data });
    } else {
      createSectionMutation.mutate(data);
    }
  };

  const cancelEditingSection = () => {
    setEditingSection(null);
    if (selectedModule) {
      sectionForm.reset({
        ...emptySectionValues,
        moduleId: selectedModule.id,
        order: sections?.length ? sections.length + 1 : 1,
      });
    }
  };

  if (!user) {
    return null;
  }
  if (isTalentoPortal) {
    if (user.role !== "talento") {
      return null;
    }
  } else if (user.role !== "admin") {
    return null;
  }

  // Diálogos de confirmación para eliminación
  const moduleDeleteDialog = (
    <Dialog open={moduleToDelete !== null} onOpenChange={(open) => !open && setModuleToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar este módulo? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setModuleToDelete(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (moduleToDelete) {
                deleteModuleMutation.mutate(moduleToDelete);
                setModuleToDelete(null);
              }
            }}
          >
            {deleteModuleMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const sectionDeleteDialog = (
    <Dialog open={sectionToDelete !== null} onOpenChange={(open) => !open && setSectionToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar esta sección? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSectionToDelete(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (sectionToDelete) {
                deleteSectionMutation.mutate(sectionToDelete);
                setSectionToDelete(null);
              }
            }}
          >
            {deleteSectionMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const courseDeleteDialog = (
    <Dialog open={courseToDelete !== null} onOpenChange={(open) => !open && setCourseToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar este programa? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setCourseToDelete(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (courseToDelete) {
                deleteCourse.mutate(courseToDelete);
                setCourseToDelete(null);
                closeCoursePanel();
              }
            }}
          >
            {deleteCourse.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const teamDeleteDialog = (
    <Dialog open={teamToDelete !== null} onOpenChange={(open) => !open && setTeamToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar este miembro del equipo? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setTeamToDelete(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (teamToDelete) {
                deleteTeamMember.mutate(teamToDelete);
                setTeamToDelete(null);
                closeTeamPanel();
              }
            }}
          >
            {deleteTeamMember.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const testimonialDeleteDialog = (
    <Dialog open={testimonialToDelete !== null} onOpenChange={(open) => !open && setTestimonialToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar este testimonio? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setTestimonialToDelete(null)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (testimonialToDelete) {
                deleteTestimonial.mutate(testimonialToDelete);
                setTestimonialToDelete(null);
                closeTestimonialPanel();
              }
            }}
          >
            {deleteTestimonial.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const visibleCourses = (courses ?? []).filter((c) =>
    matchesSearch(search, c.title, c.category, c.level, c.instructor),
  );
  const sortedTeam = [...(teamMembers ?? [])].sort((a, b) => a.order - b.order);
  const visibleTeam = sortedTeam.filter((m) => matchesSearch(search, m.name, m.role));
  const sortedTestimonials = [...(testimonials ?? [])].sort((a, b) => a.order - b.order);
  const visibleTestimonials = sortedTestimonials.filter((t) =>
    matchesSearch(search, t.name, t.courseName, t.text),
  );
  const sidePanelOpen =
    (activeTab === "courses" && coursePanelOpen) ||
    (activeTab === "team" && teamPanelOpen) ||
    (activeTab === "testimonials" && testimonialPanelOpen);

  const watchedCourse = courseForm.watch();
  const courseChecks = [
    watchedCourse.title,
    watchedCourse.slug,
    watchedCourse.instructor,
    watchedCourse.level,
    watchedCourse.category,
    watchedCourse.duration,
    watchedCourse.modules,
    watchedCourse.shortDescription,
    watchedCourse.description,
    watchedCourse.image,
  ];
  const courseCompletion = Math.round(
    (courseChecks.filter((value) => (typeof value === "number" ? value > 0 : !!value?.toString().trim())).length /
      courseChecks.length) *
      100,
  );
  const courseErrors = courseForm.formState.errors;
  const courseTabHasError = (tab: Exclude<CourseTab, "modulos">) =>
    COURSE_TAB_FIELDS[tab].some((field) => field in courseErrors);
  const liveEditingCourse = editingCourse
    ? courses?.find((c) => c.id === editingCourse.id) ?? editingCourse
    : null;

  const teamColorMeta = getTeamRoleColorMeta(watchedRoleColor);
  const watchedTestimonial = testimonialForm.watch();

  type CourseTagField = "featured" | "popular" | "new" | "comingSoon" | "isLive" | "techHumanSpecialization";
  const courseTagCard = (
    name: CourseTagField,
    label: string,
    description: string,
    onToggle?: (checked: boolean) => void,
  ) => (
    <FormField
      control={courseForm.control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex flex-row items-start gap-3 space-y-0 rounded-xl border p-3 transition-colors duration-200",
            field.value ? "border-[#5b8fd4]/60 bg-[#5b8fd4]/[0.07]" : "hover:border-[#5b8fd4]/40",
          )}
        >
          <FormControl>
            <Checkbox
              checked={!!field.value}
              onCheckedChange={(checked) => (onToggle ? onToggle(checked === true) : field.onChange(checked === true))}
              className="mt-0.5"
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="cursor-pointer">{label}</FormLabel>
            <FormDescription className="text-xs">{description}</FormDescription>
          </div>
        </FormItem>
      )}
    />
  );

  const modulesContent = selectedCourse ? (
    <div className="space-y-5">
      <AdminPanelSection
        title={editingModule ? "Editar módulo" : "Nuevo módulo"}
        action={
          editingModule ? (
            <button
              type="button"
              onClick={cancelEditingModule}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Cancelar edición
            </button>
          ) : null
        }
      >
        <Form {...moduleForm}>
          <form
            onSubmit={moduleForm.handleSubmit(onModuleSubmit)}
            className="space-y-4 rounded-2xl border bg-muted/20 p-4"
          >
            <FormField
              control={moduleForm.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del módulo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Introducción a HTML y CSS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={moduleForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe el contenido de este módulo..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={moduleForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (horas)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 1"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={moduleForm.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 1"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={moduleForm.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dificultad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} key={`${editingModule?.id ?? "new"}-difficulty`}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un nivel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Principiante">Principiante</SelectItem>
                        <SelectItem value="Intermedio">Intermedio</SelectItem>
                        <SelectItem value="Avanzado">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={moduleForm.control}
                name="instructor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del instructor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" className="rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]">
                {createModuleMutation.isPending || updateModuleMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingModule ? "Actualizar" : "Guardar"} módulo
              </Button>
            </div>
          </form>
        </Form>
      </AdminPanelSection>

      <AdminPanelSection title={`Módulos (${modules?.length ?? 0})`}>
        {modules && modules.length > 0 ? (
          <div className="space-y-2.5">
            {[...modules]
              .sort((a, b) => a.order - b.order)
              .map((module, i) => {
                const open = selectedModule?.id === module.id;
                return (
                  <motion.div
                    key={module.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(i, 10) * 0.03 }}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-card transition-colors",
                      (open || editingModule?.id === module.id) && "border-[#5b8fd4]/60",
                    )}
                  >
                    <div className="flex items-start gap-3 p-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5b8fd4]/15 text-xs font-semibold text-[#5b8fd4]">
                        {module.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h5 className="truncate font-semibold">{module.title}</h5>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{module.description}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {module.duration} h · {module.difficulty} · {module.instructor}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar módulo"
                          onClick={() => setEditingModule(module)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Eliminar módulo"
                          onClick={() => setModuleToDelete(module.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedModule(open ? null : module)}
                      className="flex w-full items-center justify-between border-t px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                    >
                      Secciones
                      <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 border-t bg-muted/30 p-3.5">
                            <Form {...sectionForm}>
                              <form
                                onSubmit={sectionForm.handleSubmit(onSectionSubmit)}
                                className="space-y-3 rounded-xl border bg-background/60 p-3"
                              >
                                <p className="text-xs font-semibold">
                                  {editingSection ? "Editar sección" : "Agregar nueva sección"}
                                </p>
                                <FormField
                                  control={sectionForm.control}
                                  name="title"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Título</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Ej: Estructura básica HTML" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={sectionForm.control}
                                  name="content"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Contenido</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Contenido de la sección (puede incluir texto, enlaces, códigos, etc.)"
                                          {...field}
                                          rows={3}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                  <FormField
                                    control={sectionForm.control}
                                    name="duration"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Duración (minutos)</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            placeholder="Ej: 30"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={sectionForm.control}
                                    name="order"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Orden</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            placeholder="Ej: 1"
                                            {...field}
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  {editingSection && (
                                    <Button type="button" variant="outline" size="sm" onClick={cancelEditingSection}>
                                      Cancelar
                                    </Button>
                                  )}
                                  <Button type="submit" size="sm" className="bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]">
                                    {createSectionMutation.isPending || updateSectionMutation.isPending ? (
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    ) : null}
                                    {editingSection ? "Actualizar" : "Guardar"}
                                  </Button>
                                </div>
                              </form>
                            </Form>

                            {sections && sections.length > 0 ? (
                              <div className="space-y-2">
                                {sections.map((section) => (
                                  <div
                                    key={section.id}
                                    className={cn(
                                      "rounded-xl border bg-card p-3 transition-colors",
                                      editingSection?.id === section.id && "border-[#5b8fd4]/60",
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <h6 className="truncate text-sm font-semibold">{section.title}</h6>
                                        <p className="text-[11px] text-muted-foreground">
                                          {section.duration} minutos · Orden: {section.order}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 gap-1">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setEditingSection(section)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive hover:text-destructive"
                                          onClick={() => setSectionToDelete(section.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{section.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="py-2 text-center text-xs text-muted-foreground">
                                No hay secciones para este módulo. Agrega una nueva.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            No hay módulos para este programa. Agrega uno nuevo para comenzar.
          </div>
        )}
      </AdminPanelSection>
    </div>
  ) : null;

  return (
    <>
      {/* Diálogos de confirmación para eliminación */}
      {moduleDeleteDialog}
      {sectionDeleteDialog}
      {courseDeleteDialog}
      {teamDeleteDialog}
      {testimonialDeleteDialog}

      <Helmet>
        <title>{sectionMeta?.title ?? "Administración"} | Ecosistema WCA</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className={cn("transition-[padding] duration-300 ease-out", sidePanelOpen && "lg:pr-[min(35rem,43vw)]")}>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href={isTalentoPortal ? "/talento" : "/admin"} className="hover:text-foreground">
                  {isTalentoPortal ? "Talento" : "Inicio"}
                </Link>
                {" › "}
                {sectionMeta?.title ?? (isTalentoPortal ? "Talento" : "Administración")}
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">
                {sectionMeta?.title ?? (isTalentoPortal ? "Talento" : "Administración")}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {sectionMeta?.description ?? "Gestiona el contenido de la plataforma."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <AdminSearchInput
                value={search}
                onChange={setSearch}
                placeholder={
                  activeTab === "courses"
                    ? "Buscar programa…"
                    : activeTab === "team"
                      ? "Buscar integrante…"
                      : "Buscar testimonio…"
                }
              />
              <Button
                onClick={
                  activeTab === "courses"
                    ? openNewCourse
                    : activeTab === "team"
                      ? openNewTeam
                      : openNewTestimonial
                }
                className="h-10 rounded-xl bg-[#5b8fd4] text-white hover:bg-[#4a7fc4]"
              >
                <Plus className="h-4 w-4" />
                {NEW_ITEM_LABEL[activeTab]}
              </Button>
              <Button variant="outline" className="h-10 rounded-xl" asChild>
                <Link href={isTalentoPortal ? "/talento" : "/admin"}>
                  <ArrowLeft className="h-4 w-4" />
                  Volver al panel
                </Link>
              </Button>
            </div>
          </div>

        <Tabs value={activeTab} className="w-full">
          {/* Tabs ocultos: la navegación vive en /admin */}
          <TabsList className="mb-8 hidden">
            <TabsTrigger value="courses">Programas</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonios</TabsTrigger>
          </TabsList>

          {/* Programas */}
          <TabsContent value="courses" className="mt-0">
            <p className="mb-4 text-sm text-muted-foreground">
              {courses?.length ?? 0} programas · da clic en uno para editarlo. Pasa el cursor para ir directo a Módulos o al Visor.
            </p>
            {visibleCourses.length > 0 ? (
              <motion.div
                layout
                className={cn(
                  "grid grid-cols-1 gap-5 sm:grid-cols-2",
                  sidePanelOpen ? "2xl:grid-cols-3" : "lg:grid-cols-3",
                )}
              >
                <AnimatePresence>
                  {visibleCourses.map((course, i) => {
                    const status = courseStatus(course);
                    return (
                      <AdminTile
                        key={course.id}
                        index={i}
                        selected={coursePanelOpen && editingCourse?.id === course.id}
                        onClick={() => openCourse(course)}
                        className="overflow-hidden"
                      >
                        <div className="relative h-40 overflow-hidden rounded-t-2xl">
                          <img
                            src={course.image}
                            alt={course.title}
                            className={cn(
                              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                              course.isDisabled && "opacity-50 grayscale",
                            )}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                          <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </span>
                          <div className="absolute right-2 top-2 flex translate-y-1 gap-1.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                            <button
                              type="button"
                              title="Módulos"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCourse(course, "modulos");
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-[#5b8fd4]"
                            >
                              <Layers className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              title="Editar contenido del visor /learn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/programas/${course.slug}/contenido`);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur transition hover:bg-[#5b8fd4]"
                            >
                              <Clapperboard className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="truncate font-semibold">{course.title}</h4>
                          <p className="truncate text-xs text-muted-foreground">
                            {course.level} · {course.category} · {course.duration} h · {course.modules} módulos
                          </p>
                        </div>
                      </AdminTile>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <AdminEmptyState>
                {search ? "No hay programas que coincidan con tu búsqueda." : "No hay programas disponibles."}
              </AdminEmptyState>
            )}
          </TabsContent>

          {/* Equipo */}
          <TabsContent value="team" className="mt-0">
            <p className="mb-4 text-sm text-muted-foreground">
              {sortedTeam.length} integrantes · da clic en uno para editarlo. Pasa el cursor para cambiar el orden.
            </p>
            {visibleTeam.length > 0 ? (
              <motion.div
                layout
                className={cn(
                  "grid grid-cols-1 gap-4",
                  sidePanelOpen ? "2xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3",
                )}
              >
                <AnimatePresence>
                  {visibleTeam.map((member, i) => {
                    const index = sortedTeam.indexOf(member);
                    const roleColor = getTeamRoleCssColor(member.roleColor);
                    return (
                      <AdminTile
                        key={member.id}
                        index={i}
                        selected={teamPanelOpen && editingTeam?.id === member.id}
                        onClick={() => openTeam(member)}
                        className="flex gap-4 p-4 pr-11"
                      >
                        <img
                          src={member.image}
                          alt={member.name}
                          className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-border transition duration-300 group-hover:ring-[#5b8fd4]/60"
                        />
                        <div className="min-w-0">
                          <h4 className="truncate font-semibold">{member.name}</h4>
                          <p className="truncate text-sm font-medium" style={{ color: roleColor }}>
                            {member.role}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{member.bio}</p>
                          <div className="mt-2 flex gap-2.5 text-muted-foreground/70">
                            {member.linkedIn ? <Linkedin className="h-3.5 w-3.5" /> : null}
                            {member.github ? <Github className="h-3.5 w-3.5" /> : null}
                            {member.twitter ? <XLogo className="h-3.5 w-3.5" /> : null}
                            {member.instagram ? <Instagram className="h-3.5 w-3.5" /> : null}
                          </div>
                        </div>
                        {!search && (
                          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label="Subir"
                              disabled={index === 0 || reorderTeamMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTeamMember(index, -1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition hover:bg-[#5b8fd4] hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Bajar"
                              disabled={index === sortedTeam.length - 1 || reorderTeamMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTeamMember(index, 1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition hover:bg-[#5b8fd4] hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </AdminTile>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <AdminEmptyState>
                {search ? "No hay integrantes que coincidan con tu búsqueda." : "Aún no hay miembros. Agrega el primero con «Nuevo integrante»."}
              </AdminEmptyState>
            )}
          </TabsContent>

          {/* Testimonios */}
          <TabsContent value="testimonials" className="mt-0">
            <p className="mb-4 text-sm text-muted-foreground">
              {testimonials?.length ?? 0} testimonios · da clic en uno para editarlo. Pasa el cursor para cambiar el orden.
            </p>
            {visibleTestimonials.length > 0 ? (
              <motion.div
                layout
                className={cn(
                  "grid grid-cols-1 gap-4",
                  sidePanelOpen ? "2xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3",
                )}
              >
                <AnimatePresence>
                  {visibleTestimonials.map((testimonial, i) => {
                    const index = sortedTestimonials.indexOf(testimonial);
                    return (
                      <AdminTile
                        key={testimonial.id}
                        index={i}
                        selected={testimonialPanelOpen && editingTestimonial?.id === testimonial.id}
                        onClick={() => openTestimonial(testimonial)}
                        className="p-4 pr-11"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={testimonial.image}
                              alt={testimonial.name}
                              className="h-11 w-11 rounded-full object-cover ring-2 ring-border transition duration-300 group-hover:ring-[#5b8fd4]/60"
                            />
                            <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#5b8fd4] px-1 text-[10px] font-bold text-white shadow ring-2 ring-card">
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate font-semibold">{testimonial.name}</h4>
                            <p className="truncate text-xs text-[#5b8fd4]">{testimonial.courseName}</p>
                          </div>
                          <RatingStars value={testimonial.rating} />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm italic text-muted-foreground">“{testimonial.text}”</p>
                        {!search && (
                          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label="Subir"
                              disabled={index === 0 || reorderTestimonialsMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTestimonial(index, -1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition hover:bg-[#5b8fd4] hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              aria-label="Bajar"
                              disabled={index === sortedTestimonials.length - 1 || reorderTestimonialsMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTestimonial(index, 1);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition hover:bg-[#5b8fd4] hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </AdminTile>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            ) : (
              <AdminEmptyState>
                {search ? "No hay testimonios que coincidan con tu búsqueda." : "No hay testimonios disponibles."}
              </AdminEmptyState>
            )}
          </TabsContent>
        </Tabs>
          </div>

        {/* Ventana: Programa */}
        <AdminEditPanel
          open={activeTab === "courses" && coursePanelOpen}
          onClose={closeCoursePanel}
          widthClass="lg:w-[min(34rem,42vw)]"
        >
          <AdminPanelHeader
            media={
              watchedCourse.image ? (
                <img src={watchedCourse.image} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-border" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-muted/50">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )
            }
            title={editingCourse ? watchedCourse.title || editingCourse.title : "Nuevo programa"}
            subtitle={
              editingCourse
                ? `${watchedCourse.level} · ${watchedCourse.category}`
                : "Completa la información y guarda"
            }
            onClose={closeCoursePanel}
            actions={
              liveEditingCourse
                ? [
                    {
                      label: "Editar visor /learn",
                      icon: Clapperboard,
                      onClick: () => navigate(`/admin/programas/${liveEditingCourse.slug}/contenido`),
                    },
                    {
                      label: liveEditingCourse.isDisabled ? "Habilitar programa" : "Inhabilitar programa",
                      icon: liveEditingCourse.isDisabled ? Eye : EyeOff,
                      disabled: updateCourseMutation.isPending,
                      onClick: () => toggleCourseDisabled(liveEditingCourse),
                    },
                    {
                      label: "Eliminar programa",
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setCourseToDelete(liveEditingCourse.id),
                    },
                  ]
                : undefined
            }
          />
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Programa completo</span>
              <span className="font-semibold text-[#5b8fd4]">{courseCompletion}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-[#5b8fd4]"
                initial={false}
                animate={{ width: `${courseCompletion}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
          <AdminPanelTabs
            layoutId="course-panel-tab"
            value={courseTab}
            onChange={setCourseTab}
            tabs={[
              { id: "general", label: "General", hasError: courseTabHasError("general") },
              { id: "imagen", label: "Imagen", hasError: courseTabHasError("imagen") },
              { id: "etiquetas", label: "Etiquetas", hasError: courseTabHasError("etiquetas") },
              { id: "envivo", label: "En vivo", hasError: courseTabHasError("envivo") },
              { id: "modulos", label: "Módulos", disabled: !editingCourse },
            ]}
          />
          <AdminPanelBody contentKey={`${editingCourse?.id ?? "new"}-${courseTab}`}>
            {courseTab === "modulos" ? (
              modulesContent
            ) : (
              <Form {...courseForm}>
                <form
                  id="course-form"
                  onSubmit={courseForm.handleSubmit(onCourseSubmit, onCourseInvalid)}
                  className="space-y-5"
                >
                  {courseTab === "general" && (
                    <>
                      <AdminPanelSection title="Información">
                        <FormField
                          control={courseForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título del programa</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: Desarrollo Web" {...field} onChange={handleTitleChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="slug"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Slug</FormLabel>
                              <FormControl>
                                <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                                  <span className="flex items-center border-r border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                                    /programs/
                                  </span>
                                  <Input
                                    placeholder="Ej: desarrollo-web"
                                    {...field}
                                    className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>Identificador único para la URL del programa</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="instructor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instructor</FormLabel>
                              <FormControl>
                                <Input placeholder="Nombre del instructor" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={courseForm.control}
                            name="level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nivel</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona un nivel" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Principiante">Principiante</SelectItem>
                                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                                    <SelectItem value="Avanzado">Avanzado</SelectItem>
                                    <SelectItem value="Todos los niveles">Todos los niveles</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={courseForm.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Categoría</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {COURSE_CATEGORIES.map((category) => (
                                      <SelectItem key={category} value={category}>
                                        {category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={courseForm.control}
                            name="duration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duración (horas)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ej: 30"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value === "" ? null : Number(value));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={courseForm.control}
                            name="modules"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Número de módulos</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ej: 5"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value === "" ? null : Number(value));
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </AdminPanelSection>
                      <AdminPanelSection title="Descripciones">
                        <FormField
                          control={courseForm.control}
                          name="shortDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción corta</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Breve descripción para mostrar en tarjetas" {...field} rows={2} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción completa</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Descripción detallada del programa" {...field} rows={5} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AdminPanelSection>
                    </>
                  )}

                  {courseTab === "imagen" && (
                    <AdminPanelSection title="Portada">
                      <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted/30">
                        <AnimatePresence mode="wait">
                          {watchedCourse.image ? (
                            <motion.img
                              key={watchedCourse.image}
                              src={watchedCourse.image}
                              alt="Vista previa de la portada"
                              initial={{ opacity: 0, scale: 1.04 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <motion.div
                              key="empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
                            >
                              <ImageIcon className="h-7 w-7" />
                              Agrega una imagen para ver la portada
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <FormField
                        control={courseForm.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL de la imagen</FormLabel>
                            <FormControl>
                              <ImageUrlInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="https://example.com/image.jpg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </AdminPanelSection>
                  )}

                  {courseTab === "etiquetas" && (
                    <AdminPanelSection title="Etiquetas y tipo de programa">
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {courseTagCard("featured", "Destacado", "Mostrar en sección destacada")}
                        {courseTagCard("popular", "Popular", "Marcar como popular")}
                        {courseTagCard("new", "Nuevo", "Marcar como recién agregado")}
                        {courseTagCard("comingSoon", "Próximamente", "Estará disponible próximamente.")}
                        {courseTagCard("isLive", "Programa en vivo", "Tendrá sesiones en vivo.", handleIsLiveChange)}
                        {courseTagCard(
                          "techHumanSpecialization",
                          "Especialización TechHuman",
                          "Página informativa con CTA «Descubre Más» hacia la LXP.",
                          handleTechHumanChange,
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {watchedCourse.techHumanSpecialization && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <FormField
                              control={courseForm.control}
                              name="lxpEnrollmentUrl"
                              render={({ field }) => (
                                <FormItem className="pt-1">
                                  <FormLabel>Enlace de la LXP (CTA «Descubre Más»)</FormLabel>
                                  <FormControl>
                                    <Input placeholder={DEFAULT_LXP_ENROLLMENT_URL} {...field} value={field.value ?? ""} />
                                  </FormControl>
                                  <FormDescription>
                                    Personalizable por programa. Si lo dejas vacío se usa {DEFAULT_LXP_ENROLLMENT_URL}.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </AdminPanelSection>
                  )}

                  {courseTab === "envivo" &&
                    (watchedCourse.isLive ? (
                      <AdminPanelSection
                        title="Detalles del programa en vivo"
                        action={
                          <button
                            type="button"
                            onClick={() => handleIsLiveChange(false)}
                            className="text-xs text-muted-foreground transition hover:text-red-500"
                          >
                            Desactivar en vivo
                          </button>
                        }
                      >
                        <FormField
                          control={courseForm.control}
                          name="liveDetails.liveDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duración del programa en vivo (Ej: 23 de Junio - 16 de Julio)</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: Desde el 23 de Junio del 2025 hasta el 16 de Julio del 2025" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="liveDetails.schedule"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horario (Ej: Lunes, Miércoles y Viernes de 3PM a 5:30PM)</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: Lunes, Miércoles y Viernes de 3PM a 5:30PM" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="liveDetails.modality"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modalidad</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una modalidad" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Presencial">Presencial</SelectItem>
                                  <SelectItem value="Virtual">Virtual</SelectItem>
                                  <SelectItem value="Mixta">Mixta</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="liveDetails.address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dirección (Solo para modalidad Presencial o Mixta)</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: CECyTEV, 02 Papantla" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={courseForm.control}
                          name="liveDetails.contact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Información de Contacto (Ej: +52 784 110 0108)</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: +52 784 110 0108" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </AdminPanelSection>
                    ) : (
                      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5b8fd4]/15 text-[#5b8fd4]">
                          <Radio className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">Este programa no es en vivo</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Actívalo para configurar fechas, horario, modalidad, dirección y contacto.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          disabled={!!watchedCourse.techHumanSpecialization}
                          onClick={() => handleIsLiveChange(true)}
                        >
                          Activar programa en vivo
                        </Button>
                        {watchedCourse.techHumanSpecialization ? (
                          <p className="text-xs text-muted-foreground">No disponible para programas TechHuman.</p>
                        ) : null}
                      </div>
                    ))}
                </form>
              </Form>
            )}
          </AdminPanelBody>
          {courseTab === "modulos" ? (
            <div className="flex items-center justify-between gap-3 border-t border-border/70 px-5 py-4 dark:border-white/10">
              <p className="text-xs text-muted-foreground">Cada módulo y sección se guarda por separado.</p>
              <Button variant="outline" className="h-10 rounded-xl" onClick={closeCoursePanel}>
                Cerrar
              </Button>
            </div>
          ) : (
            <AdminPanelFooter
              onCancel={closeCoursePanel}
              formId="course-form"
              pending={createCourseMutation.isPending || updateCourseMutation.isPending}
              submitLabel={editingCourse ? "Guardar cambios" : "Crear programa"}
            />
          )}
        </AdminEditPanel>

        {/* Ventana: Integrante del equipo */}
        <AdminEditPanel
          open={activeTab === "team" && teamPanelOpen}
          onClose={closeTeamPanel}
          widthClass="lg:w-[min(30rem,42vw)]"
        >
          <div className="relative h-24 shrink-0 overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.div
                key={teamColorMeta.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, hsl(${teamColorMeta.hsl} / 0.85), hsl(${teamColorMeta.hsl} / 0.12))`,
                }}
              />
            </AnimatePresence>
          </div>
          <div className="relative px-5">
            <motion.div
              key={watchedTeamImage || "no-image"}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-xs text-muted-foreground ring-4 ring-background"
            >
              {watchedTeamImage ? (
                <img src={watchedTeamImage} alt="Vista previa" className="h-full w-full object-cover" />
              ) : (
                "Foto"
              )}
            </motion.div>
          </div>
          <AdminPanelHeader
            className="pt-2"
            title={teamForm.watch("name") || (editingTeam ? editingTeam.name : "Nuevo integrante")}
            subtitle={
              <span style={{ color: getTeamRoleCssColor(watchedRoleColor) }}>
                {teamForm.watch("role") || "Cargo"}
              </span>
            }
            onClose={closeTeamPanel}
            actions={
              editingTeam
                ? [
                    {
                      label: "Eliminar integrante",
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setTeamToDelete(editingTeam.id),
                    },
                  ]
                : undefined
            }
          />
          <AdminPanelBody contentKey={editingTeam?.id ?? "new"}>
            <Form {...teamForm}>
              <form id="team-form" onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-5">
                <AdminPanelSection title="Perfil">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={teamForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={teamForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: CEO & Fundador" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={teamForm.control}
                    name="roleColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color del cargo</FormLabel>
                        <div className="flex flex-wrap gap-2.5 rounded-2xl border bg-muted/20 p-3">
                          {TEAM_ROLE_COLORS.map((color) => {
                            const selected = (field.value || DEFAULT_TEAM_ROLE_COLOR) === color.id;
                            return (
                              <motion.button
                                key={color.id}
                                type="button"
                                title={`${color.label} · ${color.hint}`}
                                aria-label={color.label}
                                onClick={() => field.onChange(color.id)}
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.9 }}
                                className={cn(
                                  "h-8 w-8 rounded-full transition-shadow",
                                  selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                                )}
                                style={{ backgroundColor: `hsl(${color.hsl})` }}
                              />
                            );
                          })}
                        </div>
                        <FormDescription>
                          {teamColorMeta.label} · Vista previa:{" "}
                          <span className="font-medium" style={{ color: getTeamRoleCssColor(field.value || watchedRoleColor) }}>
                            {teamForm.watch("role") || "Cargo de ejemplo"}
                          </span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biografía</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Breve biografía" {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={teamForm.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL de la imagen</FormLabel>
                        <FormControl>
                          <ImageUrlInput
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="https://example.com/image.jpg"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AdminPanelSection>

                <AdminPanelSection
                  title="Redes sociales"
                  action={
                    <button
                      type="button"
                      onClick={() => setShowSocials((v) => !v)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
                    >
                      {showSocials ? "Ocultar" : "Mostrar"}
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showSocials && "rotate-180")} />
                    </button>
                  }
                >
                  <AnimatePresence initial={false}>
                    {showSocials && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-3 overflow-hidden"
                      >
                        {(
                          [
                            { name: "linkedIn", label: "LinkedIn", icon: Linkedin, placeholder: "URL de LinkedIn" },
                            { name: "github", label: "GitHub", icon: Github, placeholder: "URL de GitHub" },
                            { name: "twitter", label: "X (antes Twitter)", icon: XLogo, placeholder: "URL de X" },
                            { name: "instagram", label: "Instagram", icon: Instagram, placeholder: "URL de Instagram" },
                          ] as const
                        ).map((social) => (
                          <FormField
                            key={social.name}
                            control={teamForm.control}
                            name={social.name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{social.label}</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <social.icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input placeholder={social.placeholder} {...field} value={field.value || ""} className="pl-9" />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </AdminPanelSection>
              </form>
            </Form>
          </AdminPanelBody>
          <AdminPanelFooter
            onCancel={closeTeamPanel}
            formId="team-form"
            pending={createTeamMemberMutation.isPending || updateTeamMemberMutation.isPending}
            submitLabel={editingTeam ? "Guardar cambios" : "Agregar integrante"}
          />
        </AdminEditPanel>

        {/* Ventana: Testimonio */}
        <AdminEditPanel
          open={activeTab === "testimonials" && testimonialPanelOpen}
          onClose={closeTestimonialPanel}
          widthClass="lg:w-[min(28rem,42vw)]"
        >
          <AdminPanelHeader
            media={
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/50">
                <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
              </div>
            }
            title={editingTestimonial ? "Editar testimonio" : "Nuevo testimonio"}
            subtitle="Se muestra en la sección de inicio"
            onClose={closeTestimonialPanel}
            actions={
              editingTestimonial
                ? [
                    {
                      label: "Eliminar testimonio",
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setTestimonialToDelete(editingTestimonial.id),
                    },
                  ]
                : undefined
            }
          />
          <AdminPanelBody contentKey={editingTestimonial?.id ?? "new"}>
            <Form {...testimonialForm}>
              <form id="testimonial-form" onSubmit={testimonialForm.handleSubmit(onTestimonialSubmit)} className="space-y-5">
                <AdminPanelSection title="Persona">
                  <div className="flex items-start gap-4">
                    <motion.div
                      key={watchedTestimonial.image || "no-image"}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                      className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs text-muted-foreground ring-4 ring-[#5b8fd4]/25"
                    >
                      {watchedTestimonial.image ? (
                        <img src={watchedTestimonial.image} alt="Vista previa" className="h-full w-full object-cover" />
                      ) : (
                        "Foto"
                      )}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <FormField
                        control={testimonialForm.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL de la imagen</FormLabel>
                            <FormControl>
                              <ImageUrlInput
                                value={field.value || ""}
                                onChange={field.onChange}
                                placeholder="https://example.com/image.jpg"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={testimonialForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del estudiante</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={testimonialForm.control}
                      name="courseName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del programa</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Desarrollo Web" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AdminPanelSection>

                <AdminPanelSection title="Testimonio">
                  <FormField
                    control={testimonialForm.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calificación</FormLabel>
                        <FormControl>
                          <RatingStars value={field.value ?? 5} onChange={field.onChange} size="lg" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={testimonialForm.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Testimonio</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Texto del testimonio" {...field} rows={4} />
                        </FormControl>
                        <div className="flex justify-end text-[11px] text-muted-foreground">
                          {(field.value ?? "").length} caracteres
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AdminPanelSection>

                <AdminPanelSection title="Vista previa">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      {watchedTestimonial.image ? (
                        <img src={watchedTestimonial.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{watchedTestimonial.name || "Nombre del estudiante"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          Estudiante de {watchedTestimonial.courseName || "programa"}
                        </p>
                      </div>
                      <RatingStars value={watchedTestimonial.rating ?? 5} />
                    </div>
                    <p className="mt-3 line-clamp-3 text-xs italic text-muted-foreground">
                      “{watchedTestimonial.text || "Aquí aparecerá el testimonio."}”
                    </p>
                  </div>
                </AdminPanelSection>
              </form>
            </Form>
          </AdminPanelBody>
          <AdminPanelFooter
            onCancel={closeTestimonialPanel}
            formId="testimonial-form"
            pending={createTestimonialMutation.isPending || updateTestimonialMutation.isPending}
            submitLabel={editingTestimonial ? "Guardar cambios" : "Agregar testimonio"}
          />
        </AdminEditPanel>
        </main>
      </div>
    </>
  );
}
