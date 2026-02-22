'use client';

// =============================================================================
// COMPONENTE: Carta
// =============================================================================
// La tarjeta visual de una obra de arte. Formato retrato, imagen dominante.
// 
// Props:
// - carta: datos de la obra (puede ser null para carta boca abajo)
// - tamaño: 'normal' | 'pequeña' | 'mini' — se adapta al número de cartas en tablero
// - seleccionada: cuando el jugador la ha elegido para colocar
// - enTablero: no se puede interactuar, solo se muestra
// - bocaAbajo: para mostrar las cartas del rival (sin contenido)
// - onClick: callback al hacer clic
// - onDetalle: callback para abrir el panel de detalles

import styles from './Carta.module.css';
import { Carta as TipoCarta, TipoObra } from '@/types/juego';
import Image from 'next/image';

type TamanoCarta = 'normal' | 'pequeña' | 'mini';

interface CartaProps {
  carta: TipoCarta | null;
  tamaño?: TamanoCarta;
  seleccionada?: boolean;
  enTablero?: boolean;
  bocaAbajo?: boolean;
  animarError?: boolean;
  animarExito?: boolean;
  onClick?: (carta: TipoCarta) => void;
  onDetalle?: (carta: TipoCarta) => void;
}

// Mapeamos el tipo de obra a la clase CSS de color
const CLASE_COLOR: Record<TipoObra, string> = {
  pintura: styles.colorPintura,
  escultura: styles.colorEscultura,
  otro: styles.colorOtro,
};

// Emoji indicativo del tipo (sutil, en el badge)
const ICONO_TIPO: Record<TipoObra, string> = {
  pintura: '🎨',
  escultura: '🏛️',
  otro: '✦',
};

export default function Carta({
  carta,
  tamaño = 'normal',
  seleccionada = false,
  enTablero = false,
  bocaAbajo = false,
  animarError = false,
  animarExito = false,
  onClick,
  onDetalle,
}: CartaProps) {
  // Carta boca abajo (rival) — solo mostramos el dorso
  if (bocaAbajo) {
    return (
      <div className={`${styles.carta} ${styles.bocaAbajo} ${styles[tamaño]}`}>
        <div className={styles.dorso}>
          <span className={styles.dorsoBrand}>A</span>
        </div>
      </div>
    );
  }

  // Carta sin datos — placeholder de carga
  if (!carta) {
    return (
      <div className={`${styles.carta} ${styles.cargando} ${styles[tamaño]}`}>
        <div className={styles.skeletonImg} />
        <div className={styles.skeletonTexto} />
      </div>
    );
  }

  const claseColor = CLASE_COLOR[carta.tipo];
  const claseAnimacion = animarError ? styles.animarError : animarExito ? styles.animarExito : '';

  function handleClick() {
    if (!enTablero && onClick) {
      onClick(carta!);
    }
  }

  function handleRightClick(e: React.MouseEvent) {
    e.preventDefault();
    if (onDetalle) {
      onDetalle(carta!);
    }
  }

  return (
    <article
      className={[
        styles.carta,
        styles[tamaño],
        claseColor,
        seleccionada ? styles.seleccionada : '',
        enTablero ? styles.enTablero : styles.enMano,
        claseAnimacion,
      ].join(' ')}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      title={enTablero ? `${carta.titulo} — Clic derecho para detalles` : `Seleccionar: ${carta.titulo}`}
      role={enTablero ? 'article' : 'button'}
      tabIndex={enTablero ? -1 : 0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* ---- IMAGEN (70% de la carta) ---- */}
      <div className={styles.imagenContenedor}>
        {carta.imagen ? (
          <Image
            src={carta.imagen}
            alt={carta.titulo}
            fill
            className={styles.imagen}
            sizes="(max-width: 768px) 100px, 140px"
            unoptimized // La Met API ya sirve imágenes optimizadas
          />
        ) : (
          <div className={styles.sinImagen}>
            <span>{ICONO_TIPO[carta.tipo]}</span>
          </div>
        )}
        
        {/* Badge de tipo sobre la imagen */}
        <span className={`${styles.badgeTipo} ${claseColor}`}>
          {ICONO_TIPO[carta.tipo]}
        </span>
      </div>

      {/* ---- INFO (30% de la carta) ---- */}
      <div className={styles.info}>
        <h3 className={styles.titulo}>{carta.titulo}</h3>
        <p className={styles.artista}>{carta.artista}</p>
        
        {/* El año: solo visible en tablero (en mano está oculto — ¡es el reto!) */}
        {enTablero && (
          <p className={styles.anio}>{carta.anioTexto}</p>
        )}
      </div>

      {/* Indicador de selección */}
      {seleccionada && (
        <div className={styles.indicadorSeleccion}>
          ✓ Seleccionada
        </div>
      )}
    </article>
  );
}
