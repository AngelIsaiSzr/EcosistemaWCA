import { useState } from 'react';
import { Module, Section } from '@shared/schema';
import { useQueries, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, CheckCircle } from 'lucide-react';

type ProgramModulesProps = {
  modules: Module[];
  isEnrolled: boolean;
  isLive?: boolean;
};

function FlatModulesList({ modules }: { modules: Module[] }) {
  return (
    <div className="space-y-6">
      {modules.map((module, index) => (
        <motion.div
          key={module.id}
          className="bg-primary-700 rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
          }}
        >
          <div className="p-6">
            <div className="flex items-center flex-wrap gap-y-2">
              <h3 className="text-xl font-heading font-semibold mr-3">
                Módulo {index + 1}: {module.title}
              </h3>
              <span className="px-3 py-1 text-xs rounded-full bg-secondary-800 text-muted">
                {module.duration} horas
              </span>
              <span className="ml-3 px-3 py-1 text-xs rounded-full bg-secondary-800 text-muted">
                {getDifficultyLabel(module.difficulty)}
              </span>
            </div>
            <p className="text-muted mt-2 pr-8">{module.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function ProgramModules({ modules, isEnrolled, isLive = false }: ProgramModulesProps) {
  const [expandedModuleId, setExpandedModuleId] = useState<number | null>(null);

  const sectionQueries = useQueries({
    queries: modules.map((module) => ({
      queryKey: [`/api/modules/${module.id}/sections`] as const,
      enabled: !isLive && modules.length > 0,
    })),
  });

  const sectionsReady = isLive || sectionQueries.every((q) => !q.isLoading && !q.isFetching);
  const anyHasSections = sectionQueries.some(
    (q) => Array.isArray(q.data) && (q.data as Section[]).length > 0,
  );

  // Igual que programa en vivo: tarjetas fijas, sin desplegar ni instructor
  if (isLive || (sectionsReady && !anyHasSections)) {
    return <FlatModulesList modules={modules} />;
  }

  // Mientras cargamos secciones, mostrar la misma vista plana para no parpadear el accordion vacío
  if (!sectionsReady) {
    return <FlatModulesList modules={modules} />;
  }

  const toggleModule = (moduleId: number) => {
    setExpandedModuleId((current) => (current === moduleId ? null : moduleId));
  };

  return (
    <div className="space-y-6">
      {modules.map((module, index) => (
        <ModuleAccordion
          key={module.id}
          module={module}
          isExpanded={expandedModuleId === module.id}
          toggleExpanded={() => toggleModule(module.id)}
          isEnrolled={isEnrolled}
          index={index}
        />
      ))}
    </div>
  );
}

type ModuleAccordionProps = {
  module: Module;
  isExpanded: boolean;
  toggleExpanded: () => void;
  isEnrolled: boolean;
  index: number;
};

function ModuleAccordion({
  module,
  isExpanded,
  toggleExpanded,
  isEnrolled,
  index,
}: ModuleAccordionProps) {
  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: [`/api/modules/${module.id}/sections`],
  });

  const hasSections = sections.length > 0;

  // Sin secciones: misma tarjeta plana que en vivo (por si algún módulo viene vacío)
  if (!isLoading && !hasSections) {
    return (
      <motion.div
        className="bg-primary-700 rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <div className="p-6">
          <div className="flex items-center flex-wrap gap-y-2">
            <h3 className="text-xl font-heading font-semibold mr-3">
              Módulo {index + 1}: {module.title}
            </h3>
            <span className="px-3 py-1 text-xs rounded-full bg-secondary-800 text-muted">
              {module.duration} horas
            </span>
            <span className="ml-3 px-3 py-1 text-xs rounded-full bg-secondary-800 text-muted">
              {getDifficultyLabel(module.difficulty)}
            </span>
          </div>
          <p className="text-muted mt-2 pr-8">{module.description}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-primary-700 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
      }}
    >
      <div
        className="p-6 flex items-center justify-between gap-4 cursor-pointer"
        onClick={toggleExpanded}
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-y-2">
            <h3 className="text-xl font-heading font-semibold mr-3">
              Módulo {index + 1}: {module.title}
            </h3>
            <span className="px-3 py-1 text-xs rounded-full bg-secondary-800 text-muted">
              {module.duration} horas
            </span>
            <span className="ml-3 px-3 py-1 text-xs rounded-full bg-secondary-800 text-muted">
              {getDifficultyLabel(module.difficulty)}
            </span>
          </div>
          <p className="text-muted mt-2 pr-8">{module.description}</p>
        </div>
        <motion.div
          className="text-accent-blue shrink-0"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <div className="border-t border-secondary-800 pt-4 mt-2">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent-blue flex items-center justify-center text-white mr-3">
                    <i className="fas fa-user" />
                  </div>
                  <p className="text-sm">
                    Instructor: <span className="font-medium">{module.instructor}</span>
                  </p>
                </div>

                {isLoading ? (
                  <div className="py-4 text-center text-muted">Cargando secciones...</div>
                ) : (
                  <motion.div
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    {(isEnrolled ? sections : sections.slice(0, 3)).map((section, idx) => (
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * idx }}
                        className={`p-4 rounded-lg flex justify-between items-center ${
                          isEnrolled
                            ? 'bg-primary-800 cursor-pointer hover:bg-opacity-80'
                            : 'bg-primary-800 opacity-75'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="w-6 h-6 mt-0.5 mr-3 flex-shrink-0">
                            {isEnrolled ? (
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            ) : (
                              <Lock className="h-6 w-6 text-muted" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{section.title}</h4>
                            <p className="text-muted text-sm mt-1">{section.content}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted whitespace-nowrap ml-4">
                          {section.duration} min
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {!isEnrolled && (
                  <motion.div
                    className="mt-6 p-4 bg-secondary-900 rounded-lg border border-secondary-800"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <div className="flex items-center">
                      <Lock className="h-5 w-5 text-accent-red mr-2" />
                      <p className="text-sm font-medium">
                        Inscríbete en este programa para acceder a todo el contenido.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function getDifficultyLabel(difficulty: string): string {
  const difficultyMap: { [key: string]: string } = {
    Easy: 'Fácil',
    Medium: 'Intermedio',
    Hard: 'Difícil',
    'Very Hard': 'Muy Difícil',
  };

  return difficultyMap[difficulty] || difficulty;
}
