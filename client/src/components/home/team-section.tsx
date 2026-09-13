import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Team } from "@shared/schema";
import { getTeamRoleColorMeta } from "@shared/team-colors";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Misma separación que el grid de 4 (gap-8). */
const CARD_GAP_PX = 32;

function roleColorStyle(roleColor?: string | null): CSSProperties {
  const meta = getTeamRoleColorMeta(roleColor);
  return { color: `hsl(var(${meta.swatchVar}))` };
}

function TeamMemberCard({
  member,
  className,
}: {
  member: Team;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-primary-700", className)}>
      <img
        src={member.image}
        alt={`${member.name} - ${member.role}`}
        className="aspect-square w-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
      <div className="p-6">
        <h3 className="mb-1 font-heading text-xl font-semibold">{member.name}</h3>
        <p className="mb-3 text-sm font-medium" style={roleColorStyle(member.roleColor)}>
          {member.role}
        </p>
        <p className="mb-4 text-justify text-sm text-muted">{member.bio}</p>
        <div className="flex space-x-3">
          {member.linkedIn && (
            <a
              href={member.linkedIn}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-[#0A66C2]"
              aria-label="Sígueme en LinkedIn"
            >
              <i className="fab fa-linkedin-in" />
            </a>
          )}
          {member.github && (
            <a
              href={member.github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-white"
              aria-label="Sígueme en GitHub"
            >
              <i className="fab fa-github" />
            </a>
          )}
          {member.twitter && (
            <a
              href={member.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-[#1DA1F2]"
              aria-label="Sígueme en Twitter"
            >
              <i className="fab fa-twitter" />
            </a>
          )}
          {member.instagram && (
            <a
              href={member.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted transition-colors hover:text-[#E4405F]"
              aria-label="Sígueme en Instagram"
            >
              <i className="fab fa-instagram" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamCarousel({ members }: { members: Team[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(3);
  const [duration, setDuration] = useState(40);
  const [cardWidth, setCardWidth] = useState(320);

  const sorted = useMemo(
    () => [...members].sort((a, b) => a.order - b.order),
    [members],
  );

  useEffect(() => {
    const update = () => {
      if (!containerRef.current || !measureRef.current) return;
      const viewportWidth = containerRef.current.offsetWidth;
      // Mismo ancho útil que el grid de 4 dentro de `.container mx-auto px-4`
      const measureEl = measureRef.current;
      const styles = getComputedStyle(measureEl);
      const contentWidth =
        measureEl.clientWidth -
        parseFloat(styles.paddingLeft) -
        parseFloat(styles.paddingRight);
      // En pantallas con escala Windows (viewport ~1100–1400) 4 columnas se ven “apretadas”.
      const visible =
        contentWidth < 640 ? 1 : contentWidth < 900 ? 2 : contentWidth < 1280 ? 3 : 4;
      const nextCardWidth = Math.floor(
        (contentWidth - CARD_GAP_PX * (visible - 1)) / visible,
      );
      setCardWidth(Math.max(220, nextCardWidth));

      const stride = nextCardWidth + CARD_GAP_PX;
      const needed = Math.max(2, Math.ceil((viewportWidth * 2) / (sorted.length * stride)));
      setCopies(needed);
      setDuration(Math.max(32, sorted.length * needed * 4.5));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [sorted.length]);

  const loop = useMemo(() => {
    const list: Team[] = [];
    for (let i = 0; i < copies; i++) list.push(...sorted);
    return list;
  }, [copies, sorted]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden border-y-0 py-2">
      {/* Guía invisible: mismo ancho que el container del grid de 4 */}
      <div
        ref={measureRef}
        className="pointer-events-none absolute left-1/2 top-0 h-0 w-full -translate-x-1/2 container mx-auto px-4 opacity-0"
        aria-hidden
      />
      <div
        data-team-track
        className="flex w-max will-change-transform"
        style={{
          gap: CARD_GAP_PX,
          animation: `team-marquee ${duration}s linear infinite`,
        }}
      >
        {loop.map((member, index) => (
          <div
            key={`${member.id}-${index}`}
            className="shrink-0 origin-center transition-transform duration-300 ease-out hover:scale-[0.97]"
            style={{ width: cardWidth }}
          >
            <TeamMemberCard member={member} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes team-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-${100 / copies}%); }
        }
      `}</style>
    </div>
  );
}

export default function TeamSection() {
  const { data: team, isLoading, error } = useQuery<Team[]>({
    queryKey: ["/api/team"],
  });

  const members = useMemo(
    () => (team ? [...team].sort((a, b) => a.order - b.order) : []),
    [team],
  );
  const useCarousel = members.length > 4;

  return (
    <section id="equipo" className="bg-primary-800 py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4 font-heading text-3xl font-bold md:text-4xl">Nuestro Equipo</h2>
          <p className="mx-auto max-w-2xl text-muted">
            Conoce a los profesionales apasionados que hacen posible al Ecosistema WCA.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-accent-blue" />
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <h3 className="mb-2 font-heading text-xl font-semibold">Error al cargar el equipo</h3>
            <p className="text-muted">
              Lo sentimos, ha ocurrido un error al cargar información del equipo. Inténtalo de nuevo
              más tarde.
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="mb-2 font-heading text-xl font-semibold">Equipo no disponible</h3>
            <p className="text-muted">La información del equipo estará disponible próximamente.</p>
          </div>
        ) : !useCarousel ? (
          <div
            className={cn(
              "grid gap-8",
              members.length === 1 && "mx-auto max-w-sm grid-cols-1",
              members.length === 2 && "mx-auto max-w-3xl grid-cols-1 md:grid-cols-2",
              members.length === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
              members.length >= 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            )}
          >
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 0.97 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <TeamMemberCard member={member} />
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      {members.length > 0 && useCarousel && !isLoading && !error ? (
        <TeamCarousel members={members} />
      ) : null}
    </section>
  );
}
