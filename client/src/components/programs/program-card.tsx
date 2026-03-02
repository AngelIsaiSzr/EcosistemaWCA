import { Link } from 'wouter';
import { Course } from '@shared/schema';

type ProgramCardProps = {
  program: Course;
  index?: number;
};

export default function ProgramCard({ program, index = 0 }: ProgramCardProps) {
  return (
    <div className="program-card bg-primary-900 rounded-xl overflow-hidden">
      <div className="relative">
        <img 
          src={program.image} 
          alt={program.title} 
          className="w-full h-48 object-cover"
        />
        {/* Program badges */}
        <div className="absolute top-0 right-0 flex flex-col items-end gap-2 p-2">
          {program.popular && (
            <div className="bg-accent-blue text-white text-xs font-bold px-3 py-1 rounded">
              Más Popular
            </div>
          )}
          {program.featured && (
            <div className="bg-accent-red text-white text-xs font-bold px-3 py-1 rounded">
              Destacado
            </div>
          )}
          {program.new && (
            <div className="bg-accent-yellow text-primary-900 text-xs font-bold px-3 py-1 rounded">
              Nuevo
            </div>
          )}
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center mb-3">
          <span className="text-xs font-medium px-2 py-1 rounded bg-secondary-800 mr-2">{program.category}</span>
          <span className="text-xs font-medium px-2 py-1 rounded bg-secondary-800">{program.level}</span>
        </div>
        <h3 className="text-xl font-heading font-semibold mb-2">{program.title}</h3>
        <p className="text-muted text-sm mb-4">{program.shortDescription}</p>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-1">
              <i className={`fas fa-book-open ${getProgramIconStyle(program)} mr-2 text-sm`}></i>
              <span className="text-sm">{program.modules} Módulos</span>
            </div>
            <div className="flex items-center">
              <i className={`fas fa-clock ${getProgramIconStyle(program)} mr-2 text-sm`}></i>
              <span className="text-sm">{program.duration} Horas</span>
            </div>
          </div>
          <Link href={`/programs/${program.slug}`} className={`px-4 py-2 ${getProgramButtonStyle(program)} rounded-md text-sm transition-colors inline-block`}>
            Ver Programa
          </Link>
        </div>
      </div>
    </div>
  );
}

function getProgramIconStyle(program: Course): string {
  if (program.popular) {
    return 'text-accent-blue';
  } else if (program.featured) {
    return 'text-accent-red';
  } else if (program.new) {
    return 'text-accent-yellow';
  } else {
    return 'text-accent-blue';
  }
}

function getProgramButtonStyle(program: Course): string {
  if (program.popular) {
    return 'bg-accent-blue text-white hover:opacity-90';
  } else if (program.featured) {
    return 'bg-accent-red text-white hover:opacity-90';
  } else if (program.new) {
    return 'border border-accent-yellow text-accent-yellow hover:bg-accent-yellow hover:text-primary-900';
  } else {
    return 'border border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white';
  }
}
