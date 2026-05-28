import { useEffect, useState } from 'react';
import { MapPin, Building2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LandingOpportunity {
  id: string;
  titulo: string;
  empresa: string;
  ubicacion: string;
  tipo: string;
}

interface Props {
  items: LandingOpportunity[];
}

export default function OpportunityCarousel({ items }: Props) {
  const [index, setIndex] = useState(0);
  const visible = 4;
  const maxIndex = Math.max(0, items.length - visible);

  useEffect(() => {
    if (items.length <= visible) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, 4500);
    return () => window.clearInterval(timer);
  }, [items.length, maxIndex, visible]);

  if (items.length === 0) {
    return (
      <div className="landing-carousel-empty">
        <p className="text-slate-500 text-sm">Próximamente nuevas oportunidades en Bridge.</p>
      </div>
    );
  }

  const slice = items.slice(index, index + visible);
  const padded =
    slice.length < visible
      ? [...slice, ...items.slice(0, visible - slice.length)]
      : slice;

  return (
    <div className="landing-carousel">
      <div className="landing-carousel-head">
        <div>
          <p className="landing-carousel-kicker">Vacantes destacadas</p>
          <h2 className="landing-carousel-title">Oportunidades en Bridge</h2>
        </div>
        {items.length > visible && (
          <div className="landing-carousel-controls">
            <button
              type="button"
              aria-label="Anterior"
              className="landing-carousel-btn"
              onClick={() => setIndex((current) => (current <= 0 ? maxIndex : current - 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              className="landing-carousel-btn"
              onClick={() => setIndex((current) => (current >= maxIndex ? 0 : current + 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="landing-carousel-track">
        {padded.map((item) => (
          <article key={`${item.id}-${item.titulo}`} className="landing-opp-card">
            <div className="landing-opp-card-top">
              <span className="landing-opp-type">{item.tipo.replace('-', ' ')}</span>
              <Building2 size={16} className="text-slate-400" />
            </div>
            <h3 className="landing-opp-title">{item.titulo}</h3>
            <p className="landing-opp-company">{item.empresa}</p>
            <p className="landing-opp-location">
              <MapPin size={14} />
              {item.ubicacion}
            </p>
            <a href="/auth/register" className="landing-opp-link">
              Ver detalle
              <ArrowRight size={14} />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
