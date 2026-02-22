'use client';

// =============================================================================
// COMPONENTE: PanelDetalle
// =============================================================================
// Panel lateral deslizante que aparece al hacer clic en una carta.
// Muestra información completa de la obra.
//
// DISEÑO FUTURO: El espacio "minimapaZona" está reservado para mostrar
// un mapa del mundo con el país de creación resaltado. Por ahora muestra
// un placeholder. Se puede implementar con Leaflet o Mapbox.

import dynamic from 'next/dynamic';
import styles from './PanelDetalle.module.css';

// Carga dinámica: react-simple-maps solo funciona en cliente (usa SVG del navegador)
const MapaOrigen = dynamic(() => import('../MapaOrigen/MapaOrigen'), {
  ssr: false,
  loading: () => <div className={styles.minimapaPlaceholder}><div className={styles.minimapaIcono}>🗺️</div></div>,
});
import { Carta } from '@/types/juego';
import Image from 'next/image';

interface PanelDetalleProps {
  carta: Carta | null;
  onCerrar: () => void;
  ocultarFecha?: boolean; // true cuando la carta está en mano (evita trampa)
}

// Mapeamos tipo a texto legible y color
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
      {/* Overlay oscuro detrás del panel */}
      <div className={styles.overlay} onClick={onCerrar} />

      {/* Panel principal */}
      <aside className={styles.panel}>
        {/* ---- Cabecera ---- */}
        <div className={styles.cabecera}>
          <div className={styles.badgeTipo} style={{ color: tipoInfo.color, borderColor: tipoInfo.color }}>
            {tipoInfo.texto}
          </div>
          <button className={styles.btnCerrar} onClick={onCerrar} aria-label="Cerrar panel">
            ✕
          </button>
        </div>

        {/* ---- Imagen grande ---- */}
        <div className={styles.imagenContenedor}>
          {carta.imagen ? (
            <Image
              src={carta.imagen}
              alt={carta.titulo}
              fill
              className={styles.imagen}
              sizes="400px"
              unoptimized
            />
          ) : (
            <div className={styles.sinImagen}>Sin imagen disponible</div>
          )}
        </div>

        {/* ---- Info principal ---- */}
        <div className={styles.cuerpo}>
          <h2 className={styles.titulo}>{carta.titulo}</h2>
          <p className={styles.artista}>{carta.artista}</p>

          {/* Fecha: solo visible cuando la carta está en el tablero */}
          {!ocultarFecha && (
            <div className={styles.anio}>
              <span className={styles.labelCampo}>Fecha</span>
              <span className={styles.valorCampo}>{carta.anioTexto}</span>
            </div>
          )}

          {/* Separador */}
          <hr className={styles.separador} />

          {/* Ficha técnica */}
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

          {/* Descripción breve */}
          {carta.descripcion && (
            <>
              <hr className={styles.separador} />
              <div className={styles.descripcion}>
                <span className={styles.labelCampo}>Procedencia</span>
                <p>{carta.descripcion}</p>
              </div>
            </>
          )}

          {/* ============================================================
              ZONA RESERVADA PARA MINIMAPA (implementación futura)
              ============================================================
              Aquí irá un mapa interactivo de Leaflet/Mapbox mostrando
              el país de creación de la obra resaltado en el mapa mundi.
              La estructura HTML y el espacio ya están preparados.
          */}
          <div className={styles.minimapaZona}>
            <span className={styles.labelCampo}>Origen en el mundo</span>
            <MapaOrigen
              pais={carta.pais}
              cultura={carta.cultura}
              tipo={carta.tipo}
            />
          </div>

          {/* Enlace al museo: solo cuando la carta ya está en el tablero.
              Si está en mano, el enlace permitiría ver la fecha en la web del museo. */}
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
