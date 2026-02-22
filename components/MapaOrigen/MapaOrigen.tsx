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

// Nombre país (Met API) → código numérico ISO 3166-1
// topojson devuelve geo.id como NUMBER, por eso comparamos con parseInt
const PAIS_A_ISO: Record<string, number> = {
  'France': 250, 'Italy': 380, 'Spain': 724, 'Germany': 276,
  'Netherlands': 528, 'Belgium': 56, 'England': 826,
  'Great Britain': 826, 'United Kingdom': 826, 'Scotland': 826,
  'Austria': 40, 'Switzerland': 756, 'Portugal': 620,
  'Sweden': 752, 'Denmark': 208, 'Norway': 578, 'Finland': 246,
  'Russia': 643, 'Poland': 616, 'Czech Republic': 203,
  'Hungary': 348, 'Romania': 642, 'Greece': 300,
  'Turkey': 792, 'Cyprus': 196,
  'China': 156, 'Japan': 392, 'Korea': 410,
  'South Korea': 410, 'North Korea': 408,
  'India': 356, 'Iran': 364, 'Iraq': 368,
  'Syria': 760, 'Lebanon': 422, 'Israel': 376,
  'Palestine': 275, 'Jordan': 400, 'Saudi Arabia': 682,
  'Afghanistan': 4, 'Pakistan': 586,
  'Cambodia': 116, 'Thailand': 764, 'Vietnam': 704,
  'Indonesia': 360, 'Myanmar': 104,
  'Egypt': 818, 'Nigeria': 566, 'Ethiopia': 231,
  'Mali': 466, 'Ghana': 288, 'Morocco': 504,
  'Tunisia': 788, 'Algeria': 12, 'Sudan': 729,
  'Kenya': 404, 'Tanzania': 834,
  'United States': 840, 'Mexico': 484, 'Peru': 604,
  'Colombia': 170, 'Brazil': 76, 'Argentina': 32,
  'Chile': 152, 'Bolivia': 68, 'Ecuador': 218,
  'Guatemala': 320,
  'Australia': 36, 'New Zealand': 554,
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
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 153, center: [0, 15] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // geo.id llega como número desde topojson
                const esOrigen = isoNumerico !== null && Number(geo.id) === isoNumerico;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={{
                      default: {
                        fill: esOrigen ? colorObra : '#2a2a2a',
                        stroke: '#111',
                        strokeWidth: 0.5,
                        outline: 'none',
                      },
                      hover: {
                        fill: esOrigen ? colorObra : '#383838',
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
            <span className={styles.punto} style={{ background: isoNumerico ? colorObra : '#555' }} />
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
