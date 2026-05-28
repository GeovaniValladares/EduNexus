import type { WikiSubject } from './wiki-types';
import { textMatchesQuery } from './text-search';

export { normalizeSearchText } from './text-search';

export function subjectMatchesSearch(subject: WikiSubject, query: string): boolean {
  return textMatchesQuery(
    [
      subject.nombre,
      subject.codigo,
      subject.profesor,
      subject.carrera,
      subject.aula,
      subject.horario,
      subject.semestre,
    ],
    query
  );
}

export function filterWikiSubjects(
  subjects: WikiSubject[],
  opts: {
    isAdmin: boolean;
    userCarrera: string;
    carreraFiltroAdmin: string;
    semestre: string;
    busqueda: string;
    profesor?: string;
    soloConCupo?: boolean;
  }
): WikiSubject[] {
  return subjects.filter((s) => {
    if (!opts.isAdmin) {
      if (opts.userCarrera && s.carrera !== opts.userCarrera) return false;
    } else if (opts.carreraFiltroAdmin !== 'todas' && s.carrera !== opts.carreraFiltroAdmin) {
      return false;
    }

    if (opts.semestre !== 'Todos' && s.semestre !== opts.semestre) {
      return false;
    }

    if (opts.profesor && opts.profesor !== 'Todos' && s.profesor !== opts.profesor) {
      return false;
    }

    if (opts.soloConCupo && s.inscritos >= s.cupo) {
      return false;
    }

    if (opts.busqueda.trim() && !subjectMatchesSearch(s, opts.busqueda)) {
      return false;
    }

    return true;
  });
}
