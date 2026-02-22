'use client';

import { Carta } from '@/types/juego';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from './PanelDetalle.module.css';

// Carga dinámica: react-simple-maps usa APIs del navegador, no funciona en SSR
const MapaOrigen = dynamic(() => import('../MapaOrigen/MapaOrigen'), {
  ssr: false,
  loading: () => (
    <div className={styles.mapaLoading}>
      <span className={styles.mapaLoadingIcono}>🗺️</span>
      <span className={styles.mapaLoadingTexto}>Cargando mapa...</span>
    </div>
  ),
});

interface PanelDetalleProps {
  carta: Carta | null;
  onCerrar: () => void;
  ocultarFecha?: boolean;
}

const INFO_TIPO = {
  pintura:   { texto: 'Pintura',   color: 'var(--color-pintura)' },
  escultura: { texto: 'Escultura', color: 'var(--color-escultura)' },
  otro:      { texto: 'Obra',      color: 'var(--color-otro)' },
};

export default function PanelDetalle({ carta, onCerrar, ocultarFecha = false }: PanelDetalleProps) {
  if (!carta) return null;

  const tipoInfo = INFO_TIPO[carta.tipo];

  return (
    <>
      <div className={styles.overlay} onClick={onCerrar} />
      <aside className={styles.panel}>

        {/* Cabecera */}
        <div className={styles.cabecera}>
          <div className={styles.badgeTipo} style={{ color: tipoInfo.color, borderColor: tipoInfo.color }}>
            {tipoInfo.texto}
          </div>
          <button className={styles.btnCerrar} onClick={onCerrar} aria-label="Cerrar panel">✕</button>
        </div>

        {/* Imagen */}
        <div className={styles.imagenContenedor}>
          {carta.imagen ? (
            <Image
              src={carta.imagen}
              alt={carta.titulo}
              fill
              style={{ objectFit: 'contain' }}
              unoptimized
            />
          ) : (
            <div className={styles.sinImagen}>Sin imagen disponible</div>
          )}
        </div>

        {/* Cuerpo */}
        <div className={styles.cuerpo}>
          <h2 className={styles.titulo}>{carta.titulo}</h2>
          <p className={styles.artista}>{carta.artista}</p>

          {!ocultarFecha && (
            <div className={styles.anio}>
              <span className={styles.labelCampo}>Fecha</span>
              <span className={styles.valorCampo}>{carta.anioTexto}</span>
            </div>
          )}

          <hr className={styles.separador} />

          <div className={styles.fichaTecnica}>
            {carta.medio && (
              <div className={styles.campo}>
                <span className={styles.labelCampo}>Técnica</span>
                <span className={styles.valorCampo}>{carta.medio}</span>
              </div>
            )}
            {carta.dimensiones && (
              <div className={styles.campo}>
                <span className={styles.labelCampo}>Dimensiones</span>
                <span className={styles.valorCampo}>{carta.dimensiones}</span>
              </div>
            )}
            {carta.departamento && (
              <div className={styles.campo}>
                <span className={styles.labelCampo}>Departamento</span>
                <span className={styles.valorCampo}>{carta.departamento}</span>
              </div>
            )}
            {carta.cultura && (
              <div className={styles.campo}>
                <span className={styles.labelCampo}>Cultura</span>
                <span className={styles.valorCampo}>{carta.cultura}</span>
              </div>
            )}
            {carta.pais && (
              <div className={styles.campo}>
                <span className={styles.labelCampo}>País</span>
                <span className={styles.valorCampo}>{carta.pais}</span>
              </div>
            )}
          </div>

          {carta.descripcion && (
            <>
              <hr className={styles.separador} />
              <div className={styles.descripcion}>
                <span className={styles.labelCampo}>Procedencia</span>
                <p>{carta.descripcion}</p>
              </div>
            </>
          )}

          {/* Minimapa — siempre visible */}
          <div className={styles.minimapaZona}>
            <span className={styles.labelCampo}>Origen en el mundo</span>
            <MapaOrigen
              pais={carta.pais}
              cultura={carta.cultura}
              tipo={carta.tipo}
            />
          </div>

          {!ocultarFecha && (
            <a
              href={carta.urlObra}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.enlaceMuseo}
            >
              Ver en el Metropolitan Museum →
            </a>
          )}
        </div>
      </aside>
    </>
  );
}
