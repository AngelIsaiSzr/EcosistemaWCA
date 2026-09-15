import { useEffect, useState } from "react";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/navbar";

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
  getTeamRoleCssColor,
  isTeamRoleColorId,
} from "@shared/team-colors";
import { ChevronDown, ChevronUp, Loader2, Trash2, Pencil, ArrowLeft, Clapperboard } from "lucide-react";
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

export default function AdminPage({
  params,
}: {
  params?: Record<string | number, string | undefined>;
}) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const sectionSlug = (params?.section || "programas") as string;
  const sectionMeta =
    sectionSlug in ADMIN_SECTIONS
      ? ADMIN_SECTIONS[sectionSlug as AdminSectionSlug]
      : null;
  const activeTab = sectionMeta?.tab ?? "courses";

  // Estados para los diálogos de confirmación
  const [moduleToDelete, setModuleToDelete] = useState<number | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<number | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<number | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(null);
  const [testimonialToDelete, setTestimonialToDelete] = useState<number | null>(null);
  const [showLiveSettings, setShowLiveSettings] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/auth");
    } else if (user.role !== "admin") {
      navigate("/");
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder al panel de administración.",
        variant: "destructive",
      });
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    if (!sectionMeta) {
      navigate("/admin");
    }
  }, [sectionMeta, navigate]);

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
  const [showModules, setShowModules] = useState(false);

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
      courseForm.reset();
      setEditingCourse(null);
      setShowLiveSettings(false);
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
      courseForm.reset(emptyCourseValues);
      setEditingCourse(null);
      setShowLiveSettings(false);
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
      updateCourseMutation.mutate({ id: editingCourse.id, data });
    } else {
      createCourseMutation.mutate(data);
    }
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
      updateTeamMemberMutation.mutate({
        id: editingTeam.id,
        data: { ...data, roleColor, order: editingTeam.order },
      });
      return;
    }
    const nextOrder =
      teamMembers && teamMembers.length > 0
        ? Math.max(...teamMembers.map((m) => m.order)) + 1
        : 1;
    createTeamMemberMutation.mutate({ ...data, roleColor, order: nextOrder });
  };

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

  const onTestimonialSubmit = (data: TestimonialFormValues) => {
    if (editingTestimonial) {
      updateTestimonialMutation.mutate({ id: editingTestimonial.id, data });
    } else {
      createTestimonialMutation.mutate(data);
    }
  };

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

  if (!user || user.role !== "admin") {
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
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                <Link href="/admin" className="hover:text-foreground">
                  Inicio
                </Link>
                {" › "}
                {sectionMeta?.title ?? "Administración"}
              </p>
              <h1 className="mt-1 font-heading text-4xl font-bold">
                {sectionMeta?.title ?? "Administración"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {sectionMeta?.description ?? "Gestiona el contenido de la plataforma."}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Volver al panel
              </Link>
            </Button>
          </div>

        <Tabs value={activeTab} className="w-full">
          {/* Tabs ocultos: la navegación vive en /admin */}
          <TabsList className="mb-8 hidden">
            <TabsTrigger value="courses">Programas</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
            <TabsTrigger value="testimonials">Testimonios</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses">
            <div className="flex flex-col gap-8">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{editingCourse ? "Editar programa" : "Agregar nuevo programa"}</CardTitle>
                    <CardDescription>
                      {editingCourse
                        ? `Actualizando el programa: ${editingCourse.title}`
                        : "Crea un nuevo programa para la plataforma."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...courseForm}>
                      <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4">
                        <FormField
                          control={courseForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título del programa</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ej: Desarrollo Web"
                                  {...field}
                                  onChange={handleTitleChange}
                                />
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
                                <Input
                                  placeholder="Ej: desarrollo-web"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Identificador único para la URL del programa
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={courseForm.control}
                            name="level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nivel</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
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
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Desarrollo Web">Desarrollo Web</SelectItem>
                                    <SelectItem value="Frontend">Frontend</SelectItem>
                                    <SelectItem value="Backend">Backend</SelectItem>
                                    <SelectItem value="FullStack">FullStack</SelectItem>
                                    <SelectItem value="Desarrollo Móvil">Desarrollo Móvil</SelectItem>
                                    <SelectItem value="Diseño UX/UI">Diseño UX/UI</SelectItem>
                                    <SelectItem value="Ciberseguridad">Ciberseguridad</SelectItem>
                                    <SelectItem value="Computación">Computación</SelectItem>
                                    <SelectItem value="Informática">Informática</SelectItem>
                                    <SelectItem value="Ofimática">Ofimática</SelectItem>
                                    <SelectItem value="Herramientas Digitales">Herramientas Digitales</SelectItem>
                                    <SelectItem value="Pensamiento Computacional">Pensamiento Computacional</SelectItem>
                                    <SelectItem value="Educación Tecnológica">Educación Tecnológica</SelectItem>
                                    <SelectItem value="Programación">Programación</SelectItem>
                                    <SelectItem value="Ciencia de Datos">Ciencia de Datos</SelectItem>
                                    <SelectItem value="DevOps">DevOps</SelectItem>
                                    <SelectItem value="Inteligencia Artificial">Inteligencia Artificial</SelectItem>
                                    <SelectItem value="Innovación Social">Innovación Social</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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
                                    value={field.value || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const numValue = value === '' ? null : Number(value);
                                      field.onChange(numValue);
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
                                    value={field.value || ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const numValue = value === '' ? null : Number(value);
                                      field.onChange(numValue);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={courseForm.control}
                          name="shortDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción corta</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Breve descripción para mostrar en tarjetas"
                                  {...field}
                                  rows={2}
                                />
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
                                <Textarea
                                  placeholder="Descripción detallada del programa"
                                  {...field}
                                  rows={4}
                                />
                              </FormControl>
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
                                <Input
                                  placeholder="Nombre del instructor"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={courseForm.control}
                          name="image"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL de la imagen</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-wrap gap-6">
                          <FormField
                            control={courseForm.control}
                            name="featured"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Destacado</FormLabel>
                                  <FormDescription>
                                    Mostrar en sección destacada
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={courseForm.control}
                            name="popular"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Popular</FormLabel>
                                  <FormDescription>
                                    Marcar como popular
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={courseForm.control}
                            name="new"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Nuevo</FormLabel>
                                  <FormDescription>
                                    Marcar como recién agregado
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Campo para programa en vivo */}
                          <FormField
                            control={courseForm.control}
                            name="isLive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={handleIsLiveChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Es un programa en vivo</FormLabel>
                                  <FormDescription>
                                    Marca si este programa tendrá sesiones en vivo.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Campo para programa próximo */}
                          <FormField
                            control={courseForm.control}
                            name="comingSoon"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Próximamente</FormLabel>
                                  <FormDescription>
                                    Marca si este programa estará disponible próximamente.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={courseForm.control}
                            name="techHumanSpecialization"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value || false}
                                    onCheckedChange={handleTechHumanChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Programa de Especialización TechHuman</FormLabel>
                                  <FormDescription>
                                    Página informativa: CTA «Descubre Más» hacia la LXP, sin temario ni
                                    inscripción clásica en la plataforma.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {courseForm.watch("techHumanSpecialization") && (
                          <FormField
                            control={courseForm.control}
                            name="lxpEnrollmentUrl"
                            render={({ field }) => (
                              <FormItem className="mt-2 max-w-xl">
                                <FormLabel>Enlace de la LXP (CTA «Descubre Más»)</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={DEFAULT_LXP_ENROLLMENT_URL}
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Personalizable por programa. Si lo dejas vacío se usa{" "}
                                  {DEFAULT_LXP_ENROLLMENT_URL}.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {courseForm.watch('isLive') && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowLiveSettings(prev => !prev)}
                            className="w-fit mt-4"
                          >
                            {showLiveSettings ? 'Ocultar' : 'Mostrar'} más configuraciones de programa en vivo
                          </Button>
                        )}

                        {showLiveSettings && courseForm.watch('isLive') && (
                          <Card className="border-dashed border-2 p-6 mt-4">
                            <CardHeader className="px-0 pt-0">
                              <CardTitle className="text-xl">Detalles del Programa en Vivo</CardTitle>
                              <CardDescription>Configura la información específica para programas con sesiones en vivo.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0 pb-0 space-y-4">
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
                            </CardContent>
                          </Card>
                        )}

                        <div className="flex justify-end space-x-4 pt-4">
                          {editingCourse && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button type="submit">
                            {createCourseMutation.isPending || updateCourseMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {editingCourse ? "Actualizar programa" : "Crear programa"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8">
                <h3 className="text-xl font-medium mb-4">Programas existentes</h3>

                {courses && courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <Card key={course.id} className="overflow-hidden flex flex-col">
                        <div className="flex flex-col">
                          <div className="w-full h-48 relative group">
                            <img
                              src={course.image}
                              alt={course.title}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="absolute top-2 right-2 shadow-md gap-1.5 bg-background/95 text-foreground hover:bg-background border"
                              variant="secondary"
                              onClick={() => navigate(`/admin/programas/${course.slug}/contenido`)}
                              title="Editar contenido del visor /learn"
                            >
                              <Clapperboard className="h-4 w-4" />
                              <span className="hidden sm:inline">Visor</span>
                            </Button>
                          </div>
                          <div className="w-full p-4">
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-lg font-medium">{course.title}</h4>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {course.category} • {course.level} • {course.duration} horas
                                    {course.isLive && " • En Vivo"} {/* Mostrar 'En Vivo' si isLive es true */}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm">{course.shortDescription}</p>

                              <div className="flex flex-wrap gap-2 mt-3">
                                {course.featured && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                                    Destacado
                                  </span>
                                )}
                                {course.popular && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-700 dark:text-orange-300">
                                    Popular
                                  </span>
                                )}
                                {course.new && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-700 dark:text-green-300">
                                    Nuevo
                                  </span>
                                )}
                                {course.isLive && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700 dark:text-blue-300">
                                    En Vivo
                                  </span>
                                )}

                                {/* Mostrar 'Inhabilitado' si isDisabled es true */}
                                {course.isDisabled && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-700 dark:text-red-300">
                                    Inhabilitado
                                  </span>
                                )}

                                {/* Mostrar 'Próximamente' si comingSoon es true */}
                                {course.comingSoon && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-700 dark:text-purple-300">
                                    Próximamente
                                  </span>
                                )}

                                {course.techHumanSpecialization && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-800 dark:text-cyan-200">
                                    TechHuman · LXP
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2 mt-4 border-t pt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary"
                                  onClick={() => setEditingCourse(course)}
                                >
                                  <Pencil className="h-4 w-4 mr-1.5" />
                                  Editar
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-500/20 text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                  onClick={() => {
                                    setSelectedCourse(course);
                                    setShowModules(true);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                                    <path d="M2 9h20M9 20V9M15 20V9"></path>
                                    <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path>
                                  </svg>
                                  Módulos
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/20 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                  onClick={() => setCourseToDelete(course.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1.5" />
                                  Eliminar
                                </Button>

                                {/* Botón Inhabilitar/Habilitar */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`border-orange-500/20 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 ${updateCourseMutation.isPending && "opacity-50 cursor-not-allowed"}`}
                                  onClick={() => {
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
                                        liveDetails: (course.liveDetails || undefined) as CourseFormValues['liveDetails'],
                                        isDisabled: !(course.isDisabled as boolean),
                                        comingSoon: course.comingSoon as boolean,
                                        techHumanSpecialization: course.techHumanSpecialization as boolean,
                                        lxpEnrollmentUrl: (course.lxpEnrollmentUrl as string) || "",
                                      },
                                    });
                                  }}
                                  disabled={updateCourseMutation.isPending}
                                >
                                  {updateCourseMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  {course.isDisabled ? "Habilitar" : "Inhabilitar"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No hay programas disponibles.</p>
                  </div>
                )}
              </div>

              {/* Módulos y Secciones */}
              {showModules && selectedCourse && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">
                      Módulos para: {selectedCourse.title}
                    </h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowModules(false);
                          setSelectedCourse(null);
                          setSelectedModule(null);
                        }}
                      >
                        Volver a la lista de programas
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-8">
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle>{editingModule ? "Editar módulo" : "Agregar nuevo módulo"}</CardTitle>
                          <CardDescription>
                            {editingModule
                              ? `Actualizando el módulo: ${editingModule.title}`
                              : `Agrega un nuevo módulo para el programa "${selectedCourse.title}".`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Form {...moduleForm}>
                            <form onSubmit={moduleForm.handleSubmit(onModuleSubmit)} className="space-y-4">
                              <FormField
                                control={moduleForm.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Título del módulo</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Ej: Introducción a HTML y CSS"
                                        {...field}
                                      />
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
                                      <Textarea
                                        placeholder="Describe el contenido de este módulo..."
                                        {...field}
                                        rows={3}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-2 gap-4">
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
                                          value={field.value || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const numValue = parseInt(value);
                                            field.onChange(numValue || null);
                                          }}
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
                                          value={field.value || ''}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const numValue = parseInt(value);
                                            field.onChange(numValue || null);
                                          }}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={moduleForm.control}
                                name="difficulty"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dificultad</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
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
                                      <Input
                                        placeholder="Nombre del instructor"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="flex justify-end space-x-2 pt-2">
                                {editingModule && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelEditingModule}
                                  >
                                    Cancelar
                                  </Button>
                                )}
                                <Button type="submit">
                                  {createModuleMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : null}
                                  {editingModule ? "Actualizar" : "Guardar"} módulo
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold mb-4">Módulos existentes</h4>

                      {modules && modules.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {modules.map((module) => (
                            <Card key={module.id} className="overflow-hidden flex flex-col h-full">
                              <div className="p-4 flex-grow">
                                <h5 className="font-semibold text-lg">{module.title}</h5>
                                <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                                <div className="flex flex-wrap items-center mt-2 gap-3 text-sm">
                                  <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                    {module.duration} horas
                                  </span>
                                  <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                                      <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    {module.difficulty}
                                  </span>
                                  <span className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M18 21a8 8 0 0 0-16 0"></path>
                                      <circle cx="10" cy="8" r="5"></circle>
                                      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"></path>
                                    </svg>
                                    {module.instructor}
                                  </span>
                                </div>
                              </div>
                              <div className="border-t p-3 flex justify-between items-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-blue-500/20 text-blue-600 hover:bg-blue-500/10 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                                  onClick={() => {
                                    setSelectedModule(module);
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                                    <path d="M8 2v4"></path>
                                    <path d="M16 2v4"></path>
                                    <rect width="18" height="12" x="3" y="10" rx="2"></rect>
                                    <path d="M3 10h18"></path>
                                  </svg>
                                  Secciones
                                </Button>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingModule(module)}
                                    className="h-8 w-8"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive h-8 w-8"
                                    onClick={() => setModuleToDelete(module.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              {selectedModule && selectedModule.id === module.id && (
                                <div className="border-t p-4 bg-muted/40">
                                  <div className="flex justify-between items-center mb-4">
                                    <h6 className="font-semibold">Secciones del módulo</h6>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedModule(null)}
                                    >
                                      Cerrar
                                    </Button>
                                  </div>

                                  <div className="space-y-4">
                                    <Card>
                                      <CardHeader className="py-2">
                                        <CardTitle className="text-base">{editingSection ? "Editar sección" : "Agregar nueva sección"}</CardTitle>
                                      </CardHeader>
                                      <CardContent className="py-2">
                                        <Form {...sectionForm}>
                                          <form onSubmit={sectionForm.handleSubmit(onSectionSubmit)} className="space-y-3">
                                            <FormField
                                              control={sectionForm.control}
                                              name="title"
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormLabel>Título</FormLabel>
                                                  <FormControl>
                                                    <Input
                                                      placeholder="Ej: Estructura básica HTML"
                                                      {...field}
                                                    />
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
                                                        value={field.value || ''}
                                                        onChange={(e) => {
                                                          const value = e.target.value;
                                                          const numValue = parseInt(value);
                                                          field.onChange(numValue || null);
                                                        }}
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
                                                        value={field.value || ''}
                                                        onChange={(e) => {
                                                          const value = e.target.value;
                                                          const numValue = parseInt(value);
                                                          field.onChange(numValue || null);
                                                        }}
                                                      />
                                                    </FormControl>
                                                    <FormMessage />
                                                  </FormItem>
                                                )}
                                              />
                                            </div>

                                            <div className="flex justify-end space-x-2 pt-2">
                                              {editingSection && (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={cancelEditingSection}
                                                  size="sm"
                                                >
                                                  Cancelar
                                                </Button>
                                              )}
                                              <Button type="submit" size="sm">
                                                {createSectionMutation.isPending ? (
                                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                ) : null}
                                                {editingSection ? "Actualizar" : "Guardar"}
                                              </Button>
                                            </div>
                                          </form>
                                        </Form>
                                      </CardContent>
                                    </Card>

                                    {sections && sections.length > 0 ? (
                                      <div className="space-y-2">
                                        <h6 className="font-medium text-sm mb-2">Secciones existentes:</h6>
                                        {sections.map((section) => (
                                          <div key={section.id} className="bg-card p-3 rounded-md border">
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <h6 className="font-semibold">{section.title}</h6>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                  {section.duration} minutos - Orden: {section.order}
                                                </p>
                                              </div>
                                              <div className="flex space-x-1">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7"
                                                  onClick={() => setEditingSection(section)}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                                  onClick={() => setSectionToDelete(section.id)}
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            <div className="mt-2 text-sm">
                                              <p className="line-clamp-2">{section.content}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-3 text-sm text-muted-foreground">
                                        No hay secciones para este módulo. Agrega una nueva.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground bg-muted rounded-md">
                          No hay módulos para este programa. Agrega uno nuevo para comenzar.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{editingTeam ? "Editar miembro" : "Agregar nuevo miembro"}</CardTitle>
                    <CardDescription>
                      {editingTeam
                        ? `Actualizando a: ${editingTeam.name}`
                        : "Agrega miembros sin límite práctico. Con más de 4, en el sitio se muestra un carrusel infinito."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...teamForm}>
                      <form onSubmit={teamForm.handleSubmit(onTeamSubmit)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                          <div className="flex justify-center sm:justify-start">
                            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border bg-muted text-xs text-muted-foreground">
                              {watchedTeamImage ? (
                                <img src={watchedTeamImage} alt="Vista previa" className="h-full w-full object-cover" />
                              ) : (
                                "Foto"
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 space-y-4">
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
                        </div>

                        <FormField
                          control={teamForm.control}
                          name="roleColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Color del cargo</FormLabel>
                              <FormDescription>
                                Vista previa:{" "}
                                <span
                                  className="font-medium"
                                  style={{
                                    color: getTeamRoleCssColor(
                                      field.value || watchedRoleColor || DEFAULT_TEAM_ROLE_COLOR,
                                    ),
                                  }}
                                >
                                  {teamForm.watch("role") || "Cargo de ejemplo"}
                                </span>
                              </FormDescription>
                              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {TEAM_ROLE_COLORS.map((color) => {
                                  const selected = (field.value || DEFAULT_TEAM_ROLE_COLOR) === color.id;
                                  return (
                                    <button
                                      key={color.id}
                                      type="button"
                                      onClick={() => field.onChange(color.id)}
                                      className={`rounded-xl border p-2 text-left transition ${
                                        selected
                                          ? "border-[#5b8fd4] bg-[#5b8fd4]/10 ring-1 ring-[#5b8fd4]/40"
                                          : "hover:bg-muted"
                                      }`}
                                      title={color.hint}
                                    >
                                      <span
                                        className="mb-1.5 block h-4 w-full rounded-md"
                                        style={{ backgroundColor: `hsl(${color.hsl})` }}
                                      />
                                      <span className="block text-[11px] font-medium leading-tight">{color.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
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
                                <Input placeholder="https://example.com/image.jpg" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <FormField
                            control={teamForm.control}
                            name="linkedIn"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn</FormLabel>
                                <FormControl>
                                  <Input placeholder="URL de LinkedIn" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={teamForm.control}
                            name="github"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GitHub</FormLabel>
                                <FormControl>
                                  <Input placeholder="URL de GitHub" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={teamForm.control}
                            name="twitter"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Twitter</FormLabel>
                                <FormControl>
                                  <Input placeholder="URL de Twitter" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={teamForm.control}
                            name="instagram"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Instagram</FormLabel>
                                <FormControl>
                                  <Input placeholder="URL de Instagram" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                          {editingTeam && (
                            <Button type="button" variant="outline" onClick={cancelEditingTeam}>
                              Cancelar
                            </Button>
                          )}
                          <Button type="submit" className="bg-[#5b8fd4] hover:bg-[#4a7fc4]">
                            {createTeamMemberMutation.isPending || updateTeamMemberMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {editingTeam ? "Actualizar miembro" : "Agregar miembro"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-medium">Miembros del equipo</h3>
                    <p className="text-sm text-muted-foreground">Usa las flechas para cambiar el orden.</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{teamMembers?.length ?? 0} miembros</span>
                </div>

                {teamMembers && teamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {[...teamMembers]
                      .sort((a, b) => a.order - b.order)
                      .map((member, index, list) => {
                        const roleColor = getTeamRoleCssColor(member.roleColor);
                        return (
                          <Card key={member.id} className="overflow-hidden">
                            <div className="flex items-stretch gap-2 p-3 sm:p-4">
                              <div className="flex flex-col justify-center gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={index === 0 || reorderTeamMutation.isPending}
                                  onClick={() => moveTeamMember(index, -1)}
                                  aria-label="Subir"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={index === list.length - 1 || reorderTeamMutation.isPending}
                                  onClick={() => moveTeamMember(index, 1)}
                                  aria-label="Bajar"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <img
                                src={member.image}
                                alt={member.name}
                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="truncate font-medium">{member.name}</h4>
                                    <p className="text-sm font-medium" style={{ color: roleColor }}>
                                      {member.role}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{member.bio}</p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingTeam(member)}>
                                      <Pencil className="mr-1 h-4 w-4" />
                                      Editar
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => setTeamToDelete(member.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                    Aún no hay miembros. Agrega el primero con el formulario.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Testimonials Tab */}

          <TabsContent value="testimonials">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>{editingTestimonial ? "Editar testimonio" : "Agregar nuevo testimonio"}</CardTitle>
                    <CardDescription>
                      {editingTestimonial
                        ? `Actualizando el testimonio de: ${editingTestimonial.name}`
                        : "Agrega un nuevo testimonio de estudiante."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...testimonialForm}>
                      <form onSubmit={testimonialForm.handleSubmit(onTestimonialSubmit)} className="space-y-4">
                        <FormField
                          control={testimonialForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del estudiante</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Nombre completo"
                                  {...field}
                                />
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
                                <Input
                                  placeholder="Ej: Desarrollo Web"
                                  {...field}
                                />
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
                                <Textarea
                                  placeholder="Texto del testimonio"
                                  {...field}
                                  rows={4}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={testimonialForm.control}
                          name="image"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL de la imagen</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="https://example.com/image.jpg"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={testimonialForm.control}
                          name="rating"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Calificación (1-5)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="5"
                                  placeholder="5"
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(value < 1 ? 1 : value > 5 ? 5 : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={testimonialForm.control}
                          name="order"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Orden</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    field.onChange(value < 1 ? 1 : value);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Determina el orden de aparición (menor número = aparece antes)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-4 pt-4">
                          {editingTestimonial && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEditingTestimonial}
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button type="submit">
                            {createTestimonialMutation.isPending || updateTestimonialMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {editingTestimonial ? "Actualizar testimonio" : "Agregar testimonio"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-4">Testimonios existentes</h3>

                {testimonials && testimonials.length > 0 ? (
                  <div className="space-y-4">
                    {testimonials.map((testimonial) => (
                      <Card key={testimonial.id}>
                        <div className="p-4">
                          <div className="flex justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 mr-3">
                                <img
                                  src={testimonial.image}
                                  alt={testimonial.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              </div>
                              <div>
                                <h4 className="font-medium">{testimonial.name}</h4>
                                <p className="text-sm text-muted-foreground">{testimonial.courseName}</p>
                                <div className="flex items-center mt-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <svg
                                      key={i}
                                      className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                      aria-hidden="true"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="currentColor"
                                      viewBox="0 0 22 20"
                                    >
                                      <path d="M20.924 7.625a1.523 1.523 0 0 0-1.238-1.044l-5.051-.734-2.259-4.577a1.534 1.534 0 0 0-2.752 0L7.365 5.847l-5.051.734A1.535 1.535 0 0 0 1.463 9.2l3.656 3.563-.863 5.031a1.532 1.532 0 0 0 2.226 1.616L11 17.033l4.518 2.375a1.534 1.534 0 0 0 2.226-1.617l-.863-5.03L20.537 9.2a1.523 1.523 0 0 0 .387-1.575Z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingTestimonial(testimonial)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Editar
                              </Button>

                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setTestimonialToDelete(testimonial.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                          <blockquote className="mt-3 text-sm italic">
                            "{testimonial.text}"
                          </blockquote>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No hay testimonios disponibles.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </main>
      </div>
    </>
  );
}