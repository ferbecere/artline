'use client';

import { memo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { TipoObra } from '@/types/juego';
import styles from './MapaOrigen.module.css';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COLOR_TIPO: Record<TipoObra, string> = {
  pintura:   '#66cc00',
  escultura: '#ffcc00',
  otro:      '#9b8ec4',
};

const PAIS_A_ISO: Record<string, number> = {
  // Europa
  'France': 250, 'Italy': 380, 'Spain': 724, 'Germany': 276,
  'Netherlands': 528, 'Netherlandish': 528, 'Belgian': 56, 'Belgium': 56,
  'England': 826, 'British': 826, 'Great Britain': 826,
  'United Kingdom': 826, 'Scotland': 826, 'Welsh': 826, 'Irish': 372,
  'Austria': 40, 'Swiss': 756, 'Switzerland': 756, 'Portugal': 620,
  'Swedish': 752, 'Sweden': 752, 'Danish': 208, 'Denmark': 208,
  'Norwegian': 578, 'Norway': 578, 'Finnish': 246, 'Finland': 246,
  'Russia': 643, 'Russian': 643, 'Polish': 616, 'Poland': 616,
  'Czech Republic': 203, 'Bohemian': 203,
  'Hungarian': 348, 'Hungary': 348, 'Romanian': 642, 'Romania': 642,
  'Greek': 300, 'Greece': 300, 'Turkish': 792, 'Turkey': 792,
  'Flemish': 56, 'Dutch': 528,
  // Asia
  'Chinese': 156, 'China': 156, 'Japanese': 392, 'Japan': 392,
  'Korean': 410, 'Korea': 410, 'South Korea': 410,
  'Indian': 356, 'India': 356, 'Iranian': 364, 'Iran': 364,
  'Persian': 364, 'Iraqi': 368, 'Iraq': 368,
  'Syrian': 760, 'Syria': 760, 'Lebanese': 422, 'Lebanon': 422,
  'Israeli': 376, 'Israel': 376, 'Jordanian': 400, 'Jordan': 400,
  'Saudi Arabia': 682, 'Afghan': 4, 'Afghanistan': 4,
  'Pakistani': 586, 'Pakistan': 586, 'Cambodian': 116, 'Cambodia': 116,
  'Thai': 764, 'Thailand': 764, 'Vietnamese': 704, 'Vietnam': 704,
  'Indonesian': 360, 'Indonesia': 360,
  // África
  'Egyptian': 818, 'Egypt': 818, 'Nigerian': 566, 'Nigeria': 566,
  'Ethiopian': 231, 'Ethiopia': 231, 'Malian': 466, 'Mali': 466,
  'Moroccan': 504, 'Morocco': 504, 'Tunisian': 788, 'Tunisia': 788,
  'Algerian': 12, 'Algeria': 12,
  // América
  'American': 840, 'United States': 840,
  'Mexican': 484, 'Mexico': 484, 'Peruvian': 604, 'Peru': 604,
  'Colombian': 170, 'Colombia': 170, 'Brazilian': 76, 'Brazil': 76,
  'Argentine': 32, 'Argentina': 32, 'Chilean': 152, 'Chile': 152,
  // Oceanía
  'Australian': 36, 'Australia': 36,
};

interface MapaOrigenProps {
  pais: string;
  cultura?: string;
  tipo: TipoObra;
}

function MapaOrigen({ pais, cultura, tipo }: MapaOrigenProps) {
  const colorObra = COLOR_TIPO[tipo];
  const isoNumerico = pais ? PAIS_A_ISO[pais] : null;
  const paisMostrado = pais || cultura || null;

  return (
    <div className={styles.contenedor}>
      <div className={styles.mapaWrapper}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 118,
            center: [10, 30], // más al norte → recorta más Antártida
          }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
              const id = Number(geo.id);
                // Log temporal — quitar después
                if (id === 156 || id === 364 || id === 818) {
                  console.log('País encontrado:', geo.id, geo.properties);
                 }
                const esOrigen = isoNumerico !== null && Number(geo.id) === isoNumerico;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    // La animación va en className — anima opacity, no fill
                    // (los inline styles sobreescriben fill pero no opacity)
                    className={esOrigen ? styles.paisOrigen : styles.paisNormal}
                    style={{
                      default: {
                        fill: esOrigen ? '#ffffff' : '#2a2a2a',
                        stroke: '#111',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: esOrigen ? '#ffffff' : '#383838',
                        stroke: '#111',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      <div className={styles.leyenda}>
        {paisMostrado ? (
          <>
            <span
              className={styles.punto}
              style={{ background: isoNumerico ? colorObra : '#555' }}
            />
            <span className={styles.labelPais}>{paisMostrado}</span>
            {pais && !isoNumerico && (
              <span className={styles.sinDatos}> · origen no localizable</span>
            )}
          </>
        ) : (
          <span className={styles.sinDatos}>Origen geográfico no catalogado</span>
        )}
      </div>
    </div>
  );
}

export default memo(MapaOrigen);
