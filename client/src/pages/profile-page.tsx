import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Redirect, Link, useLocation } from "wouter";
import {
  Loader2,
  BookOpen,
  Award,
  Trash2,
  Upload,
  ArrowLeft,
  User,
  Camera,
  Save,
  Pencil,
  Shield,
  LayoutGrid,
  Check,
  X,
  Lock,
} from "lucide-react";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef, useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";
import Navbar from "@/components/layout/navbar";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor ingresa un correo electrónico válido." }),
  username: z.string().min(3, { message: "El nombre de usuario debe tener al menos 3 caracteres." }),
  bio: z.string().optional(),
  profileImage: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, { message: "Mínimo 6 caracteres." }),
    newPassword: z.string().min(6, { message: "Mínimo 6 caracteres." }),
    confirmPassword: z.string().min(6, { message: "Mínimo 6 caracteres." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface EnrollmentWithProgram {
  id: number;
  userId: number;
  courseId: number;
  progress: number;
  completed: boolean;
  createdAt: string | null;
  program: {
    id: number;
    title: string;
    slug: string;
    description: string;
    shortDescription: string;
    level: string;
    category: string;
    image: string;
    duration: number;
  };
}

type SectionId = "perfil" | "programas" | "seguridad" | "cuenta";

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [, setLocation] = useLocation();
  const [section, setSection] = useState<SectionId>("perfil");
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingBio, setEditingBio] = useState(false);

  const isOfficialAccount = user?.role === "admin" || user?.role === "talento";

  const {
    data: enrollments,
    isLoading: isLoadingEnrollments,
    refetch: refetchEnrollments,
  } = useQuery<EnrollmentWithProgram[]>({
    queryKey: ["/api/enrollments"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: Boolean(user),
  });

  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      const response = await apiRequest("DELETE", `/api/enrollments/${enrollmentId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al cancelar inscripción");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Éxito", description: "Has cancelado tu inscripción al programa" });
      refetchEnrollments();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleNavigationAttempt = (to: string) => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      return false;
    }
    setLocation(to);
    return true;
  };

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
      bio: user?.bio || "",
      profileImage: user?.profileImage || "",
    },
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name || "",
      email: user.email || "",
      username: user.username || "",
      bio: user.bio || "",
      profileImage: user.profileImage || "",
    });
  }, [user?.id]);

  useEffect(() => {
    const subscription = profileForm.watch(() => {
      const formValues = profileForm.getValues();
      const hasChanges =
        formValues.name !== user?.name ||
        formValues.email !== user?.email ||
        formValues.username !== user?.username ||
        formValues.bio !== (user?.bio || "") ||
        imagePreview !== null;
      setHasUnsavedChanges(hasChanges);
    });
    return () => subscription.unsubscribe();
  }, [profileForm, user, imagePreview]);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: ProfileFormValues) => {
      const response = await apiRequest("PATCH", "/api/user/profile", profileData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el perfil");
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      profileForm.reset({
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profileImage: updatedUser.profileImage,
      });
      setHasUnsavedChanges(false);
      setImagePreview(null);
      setPendingImageFile(null);
      setEditingPersonal(false);
      setEditingBio(false);
      toast({
        title: "¡Perfil actualizado!",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    },
  });

  const onProfileSubmit = (data: ProfileFormValues) => {
    if (imagePreview) data.profileImage = imagePreview;
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    try {
      const res = await apiRequest("PATCH", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (res.ok) {
        toast({
          title: "Contraseña actualizada",
          description: "Tu contraseña ha sido actualizada exitosamente.",
        });
        passwordForm.reset();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al actualizar la contraseña");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error",
        variant: "destructive",
      });
    }
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/user");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Error al eliminar la cuenta",
        }));
        throw new Error(errorData.message || "Error al eliminar la cuenta");
      }
      return null;
    },
    onSuccess: () => {
      toast({ title: "Cuenta eliminada", description: "Tu cuenta ha sido eliminada exitosamente." });
      logout();
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 5MB",
        variant: "destructive",
      });
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Solo se permiten imágenes JPG, PNG o GIF",
        variant: "destructive",
      });
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
        setImagePreview(canvas.toDataURL("image/jpeg", 0.8));
        setHasUnsavedChanges(true);
      };
    };
    reader.readAsDataURL(file);
    setPendingImageFile(file);
  };

  const completion = useMemo(() => {
    if (!user) return { percent: 0; items: [] as { label: string; done: boolean; weight: number }[] };
    const items = [
      { label: "Cuenta creada", done: true, weight: 20 },
      { label: "Foto de perfil", done: !!(imagePreview || user.profileImage), weight: 20 },
      { label: "Datos personales", done: !!(user.name && user.email && user.username), weight: 25 },
      { label: "Biografía", done: !!(user.bio && user.bio.trim().length > 0), weight: 15 },
      {
        label: "Inscripción a un programa",
        done: !!(enrollments && enrollments.length > 0),
        weight: 20,
      },
    ];
    const percent = items.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
    return { percent, items };
  }, [user, imagePreview, enrollments]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Redirect to="/auth" />;

  const navItems: { id: SectionId; label: string; icon: typeof User; hidden?: boolean }[] = [
    { id: "perfil", label: "Editar perfil", icon: User },
    { id: "programas", label: "Mis programas", icon: LayoutGrid },
    { id: "seguridad", label: "Contraseña", icon: Lock, hidden: isOfficialAccount },
    { id: "cuenta", label: "Cuenta", icon: Shield },
  ];

  return (
    <>
      <Helmet>
        <title>Tu perfil | Ecosistema WCA</title>
      </Helmet>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Salir sin guardar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setHasUnsavedChanges(false);
                setShowUnsavedDialog(false);
                setLocation("/");
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pb-16 pt-24">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cuenta</p>
              <h1 className="mt-1 font-heading text-3xl font-bold md:text-4xl">Editar perfil</h1>
              <p className="mt-2 text-muted-foreground">
                Actualiza tu foto, datos personales y preferencias de cuenta.
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => handleNavigationAttempt("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
            {/* Side nav */}
            <aside className="h-fit rounded-2xl border bg-card/60 p-3 lg:sticky lg:top-24">
              <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Perfil
              </p>
              <nav className="space-y-1">
                {navItems
                  .filter((item) => !item.hidden)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.id)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition",
                          active
                            ? "border border-[#5b8fd4]/40 bg-[#5b8fd4]/10 text-[#5b8fd4]"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
              </nav>
              {!isOfficialAccount && (
                <div className="mt-4 border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setSection("cuenta")}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-destructive transition hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar cuenta
                  </button>
                </div>
              )}
            </aside>

            {/* Main */}
            <div className="min-w-0 space-y-5">
              {section === "perfil" && (
                <>
                  <section className="rounded-2xl border bg-card p-5 md:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="relative group shrink-0">
                        <Avatar className="h-24 w-24 ring-2 ring-[#5b8fd4]/30">
                          <AvatarImage
                            src={imagePreview || user.profileImage || undefined}
                            alt={user.name}
                          />
                          <AvatarFallback className="text-2xl">
                            {user.name ? user.name.charAt(0).toUpperCase() : <User />}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition group-hover:opacity-100"
                          onClick={() => fileInputRef.current?.click()}
                          aria-label="Cambiar foto"
                        >
                          <Camera className="h-6 w-6 text-white" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-heading text-lg font-semibold">Foto de perfil</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Recomendado 800×800 px. JPG o PNG.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4" />
                            Subir nueva foto
                          </Button>
                          {imagePreview && (
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2 bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                              disabled={updateProfileMutation.isPending}
                              onClick={profileForm.handleSubmit(onProfileSubmit)}
                            >
                              {updateProfileMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Guardar foto
                            </Button>
                          )}
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border bg-card p-5 md:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-heading text-lg font-semibold">Información personal</h2>
                        <p className="text-sm text-muted-foreground">Nombre, usuario y correo.</p>
                      </div>
                      {!editingPersonal ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditingPersonal(true)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      ) : null}
                    </div>

                    {editingPersonal ? (
                      <form
                        onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                        className="space-y-4"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="name">Nombre completo</Label>
                            <Input id="name" {...profileForm.register("name")} />
                            {profileForm.formState.errors.name && (
                              <p className="text-sm text-destructive">
                                {profileForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="username">Usuario</Label>
                            <Input id="username" {...profileForm.register("username")} />
                            {profileForm.formState.errors.username && (
                              <p className="text-sm text-destructive">
                                {profileForm.formState.errors.username.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Correo</Label>
                            <Input id="email" type="email" {...profileForm.register("email")} />
                            {profileForm.formState.errors.email && (
                              <p className="text-sm text-destructive">
                                {profileForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              profileForm.reset({
                                name: user.name,
                                email: user.email,
                                username: user.username,
                                bio: user.bio || "",
                                profileImage: user.profileImage || "",
                              });
                              setEditingPersonal(false);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Guardar cambios
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Nombre</p>
                          <p className="mt-1 font-medium">{user.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Usuario</p>
                          <p className="mt-1 font-medium">@{user.username}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Correo</p>
                          <p className="mt-1 break-all font-medium">{user.email}</p>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border bg-card p-5 md:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-heading text-lg font-semibold">Biografía</h2>
                        <p className="text-sm text-muted-foreground">Cuéntanos un poco sobre ti.</p>
                      </div>
                      {!editingBio ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditingBio(true)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                      ) : null}
                    </div>
                    {editingBio ? (
                      <form
                        onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                        className="space-y-4"
                      >
                        <Textarea
                          rows={5}
                          placeholder="Escribe algo sobre ti..."
                          className="resize-none"
                          {...profileForm.register("bio")}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              profileForm.setValue("bio", user.bio || "");
                              setEditingBio(false);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="submit"
                            className="bg-[#5b8fd4] hover:bg-[#4a7fc4]"
                            disabled={updateProfileMutation.isPending}
                          >
                            Guardar cambios
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {user.bio?.trim() || "Aún no has agregado una biografía."}
                      </p>
                    )}
                  </section>
                </>
              )}

              {section === "programas" && (
                <section className="rounded-2xl border bg-card p-5 md:p-6">
                  <h2 className="font-heading text-lg font-semibold">Mis programas</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visualiza tus inscripciones y continúa tu progreso.
                  </p>
                  <div className="mt-5">
                    {isLoadingEnrollments ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !enrollments || enrollments.length === 0 ? (
                      <div className="rounded-xl border border-dashed px-4 py-10 text-center">
                        <p className="text-muted-foreground">Aún no estás inscrito en ningún programa.</p>
                        <Button className="mt-4" variant="outline" asChild>
                          <Link href="/programs">Explorar programas</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="overflow-hidden rounded-xl border bg-background/40 md:flex"
                          >
                            <img
                              src={enrollment.program.image}
                              alt={enrollment.program.title}
                              className="h-36 w-full object-cover md:h-auto md:w-40"
                            />
                            <div className="flex flex-1 flex-col p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold">{enrollment.program.title}</h3>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <Badge variant="outline">{enrollment.program.level}</Badge>
                                    <span className="inline-flex items-center gap-1">
                                      <BookOpen className="h-3.5 w-3.5" />
                                      {enrollment.program.duration} h
                                    </span>
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancelar inscripción</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        ¿Cancelar tu inscripción de {enrollment.program.title}? Se perderá el progreso.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => unenrollMutation.mutate(enrollment.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Sí, cancelar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                {enrollment.program.shortDescription}
                              </p>
                              <div className="mt-auto pt-4">
                                <div className="mb-2 flex justify-between text-sm">
                                  <span>Progreso</span>
                                  <span className="font-medium">{enrollment.progress}%</span>
                                </div>
                                <Progress value={enrollment.progress} className="h-2" />
                                <div className="mt-3 flex items-center justify-between">
                                  {enrollment.completed ? (
                                    <span className="inline-flex items-center gap-1 text-sm text-[#5b8fd4]">
                                      <Award className="h-4 w-4" /> Completado
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">
                                      {enrollment.progress > 0 ? "En progreso" : "No iniciado"}
                                    </span>
                                  )}
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/programs/${enrollment.program.slug}/learn`}>
                                      {enrollment.progress > 0 ? "Continuar" : "Iniciar"}
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {section === "seguridad" && !isOfficialAccount && (
                <section className="rounded-2xl border bg-card p-5 md:p-6">
                  <h2 className="font-heading text-lg font-semibold">Contraseña</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cambia tu contraseña de acceso.
                  </p>
                  <form
                    onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                    className="mt-5 max-w-md space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Contraseña actual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        {...passwordForm.register("currentPassword")}
                      />
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="text-sm text-destructive">
                          {passwordForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nueva contraseña</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        {...passwordForm.register("newPassword")}
                      />
                      {passwordForm.formState.errors.newPassword && (
                        <p className="text-sm text-destructive">
                          {passwordForm.formState.errors.newPassword.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar nueva</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        {...passwordForm.register("confirmPassword")}
                      />
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {passwordForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    <Button type="submit" className="bg-[#5b8fd4] hover:bg-[#4a7fc4]">
                      Actualizar contraseña
                    </Button>
                  </form>
                </section>
              )}

              {section === "cuenta" && (
                <section className="rounded-2xl border bg-card p-5 md:p-6">
                  <h2 className="font-heading text-lg font-semibold">Administración de cuenta</h2>
                  {isOfficialAccount ? (
                    <div className="mt-4 rounded-xl border border-[#5b8fd4]/30 bg-[#5b8fd4]/10 p-4 text-sm">
                      Esta es una cuenta oficial ({user.role}). La contraseña y la eliminación de
                      cuenta no están disponibles desde el perfil.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-5">
                      <h3 className="font-semibold text-destructive">Zona de peligro</h3>
                      <p className="mt-1 text-sm text-destructive/80">
                        Una vez que elimines tu cuenta, no hay vuelta atrás.
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="mt-4" disabled={deleteAccountMutation.isPending}>
                            {deleteAccountMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Eliminando...
                              </>
                            ) : (
                              "Eliminar cuenta"
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará permanentemente tu cuenta
                              y tu progreso.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAccountMutation.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Sí, eliminar cuenta
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Completion panel */}
            <aside className="h-fit rounded-2xl border bg-card/60 p-5 lg:sticky lg:top-24">
              <h3 className="font-heading text-sm font-semibold">Completitud del perfil</h3>
              <div className="relative mx-auto my-6 flex h-28 w-28 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/40"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#5b8fd4"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - completion.percent / 100)}`}
                  />
                </svg>
                <span className="text-2xl font-bold">{completion.percent}%</span>
              </div>
              <ul className="space-y-3">
                {completion.items.map((item) => (
                  <li key={item.label} className="flex items-start justify-between gap-2 text-sm">
                    <span className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          item.done ? "bg-[#5b8fd4]/20 text-[#5b8fd4]" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.done ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      </span>
                      <span className={item.done ? "text-muted-foreground" : "text-foreground"}>
                        {item.label}
                      </span>
                    </span>
                    {!item.done && (
                      <span className="shrink-0 text-xs font-medium text-emerald-400">
                        +{item.weight}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
