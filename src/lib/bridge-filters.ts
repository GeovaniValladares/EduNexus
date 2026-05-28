import type { BridgeOpportunity } from './bridge-types';
import { textMatchesQuery } from './text-search';

export type BridgeTypeFilter = 'all' | 'micro' | 'pasantia' | 'job' | 'project';
export type BridgeHoursFilter = 'all' | '1-10' | '10-20' | '20-40';
export type BridgeDurationFilter = 'all' | 'short' | 'medium' | 'long';

export function opportunityMatchesSearch(opp: BridgeOpportunity, query: string): boolean {
  return textMatchesQuery(
    [
      opp.titulo,
      opp.empresa,
      opp.ubicacion,
      opp.descripcion,
      ...opp.requisitos,
      ...opp.carreras,
    ],
    query
  );
}

export function filterBridgeOpportunities(
  opportunities: BridgeOpportunity[],
  opts: {
    typeFilter: BridgeTypeFilter;
    hoursFilter: BridgeHoursFilter;
    durationFilter: BridgeDurationFilter;
    busqueda: string;
    ubicacion?: string;
    soloMiCarrera?: boolean;
    userCarrera?: string;
    soloActivas?: boolean;
  }
): BridgeOpportunity[] {
  return opportunities.filter((opp) => {
    if (opts.soloActivas !== false && !opp.activo) return false;
    if (opts.soloMiCarrera && opts.userCarrera?.trim()) {
      const carreras = opp.carreras;
      if (carreras.length > 0 && !carreras.includes(opts.userCarrera)) {
        return false;
      }
    }

    if (opts.ubicacion && opts.ubicacion !== 'todas' && opp.ubicacion !== opts.ubicacion) {
      return false;
    }

    if (opts.typeFilter === 'micro' && opp.tipo !== 'micro-pasantia') return false;
    if (opts.typeFilter === 'pasantia' && opp.tipo !== 'pasantia') return false;
    if (opts.typeFilter === 'job' && opp.tipo !== 'empleo') return false;
    if (opts.typeFilter === 'project' && opp.tipo !== 'proyecto') return false;

    if (opts.hoursFilter === '1-10' && opp.horasSemanales > 10) return false;
    if (
      opts.hoursFilter === '10-20' &&
      (opp.horasSemanales <= 10 || opp.horasSemanales > 20)
    ) {
      return false;
    }
    if (opts.hoursFilter === '20-40' && opp.horasSemanales <= 20) return false;

    if (opts.durationFilter === 'short' && opp.duracionSemanas > 4) return false;
    if (
      opts.durationFilter === 'medium' &&
      (opp.duracionSemanas <= 4 || opp.duracionSemanas > 12)
    ) {
      return false;
    }
    if (opts.durationFilter === 'long' && opp.duracionSemanas <= 12) return false;

    if (opts.busqueda.trim() && !opportunityMatchesSearch(opp, opts.busqueda)) {
      return false;
    }

    return true;
  });
}
