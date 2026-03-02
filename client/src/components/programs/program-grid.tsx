import { Course } from '@shared/schema';
import ProgramCard from './program-card';

type ProgramGridProps = {
  programs: Course[];
};

export default function ProgramGrid({ programs }: ProgramGridProps) {
  if (!programs || programs.length === 0) {
    return (
      <div className="text-center py-16 bg-primary-800 rounded-xl">
        <h3 className="text-xl font-heading font-semibold mb-2">No hay programas disponibles</h3>
        <p className="text-muted">Próximamente tendremos nuevos programas disponibles para ti. ¡Mantente al tanto!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {programs.map((program, index) => (
        <ProgramCard 
          key={program.id} 
          program={program} 
          index={index}
        />
      ))}
    </div>
  );
}
