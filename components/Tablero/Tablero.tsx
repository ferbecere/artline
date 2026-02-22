'use client';

// =============================================================================
// COMPONENTE: Tablero
// =============================================================================
// El tablero central donde se van colocando las cartas en orden cronológico.
//
// La mecánica de interacción:
// 1. El jugador primero selecciona una carta de su mano (en el comp. Mano)
// 2. Luego hace clic en una "zona de inserción" del tablero para colocarla
// 3. Las zonas de inserción son los espacios ENTRE cartas (y en los extremos)
//
// Si cartaSeleccionada es null, el tablero solo muestra las cartas.
// Si hay carta seleccionada, aparecen las zonas de inserción interactivas.

import styles from './Tablero.module.css';
import Carta from '../Carta/Carta';
import { Carta as TipoCarta } from '@/types/juego';

interface TableroProps {
  cartas: TipoCarta[];
  cartaSeleccionada: TipoCarta | null;
  onColocarCarta: (posicion: number) => void;
  onVerDetalle: (carta: TipoCarta) => void;
  ultimaJugadaCorrecta?: boolean; // para animar la última carta colocada
}

// Calculamos el tamaño de las cartas según cuántas haya en el tablero
function calcularTamano(numCartas: number): 'normal' | 'pequeña' | 'mini' {
  if (numCartas <= 5) return 'normal';
  if (numCartas <= 10) return 'pequeña';
  return 'mini';
}

export default function Tablero({
  cartas,
  cartaSeleccionada,
  onColocarCarta,
  onVerDetalle,
  ultimaJugadaCorrecta,
}: TableroProps) {
  const tamano = calcularTamano(cartas.length);
  const hayCartaSeleccionada = cartaSeleccionada !== null;

  return (
    <div className={styles.contenedor}>
      {/* Etiqueta "ANTERIOR" — extremo izquierdo */}
      <div className={styles.etiquetaTiempo}>
        <span>◀ ANTERIOR</span>
      </div>

      {/* La línea del tiempo */}
      <div className={styles.linea}>
        <div className={`${styles.tablero} ${hayCartaSeleccionada ? styles.modoColocacion : ''}`}>
          
          {cartas.length === 0 && !hayCartaSeleccionada && (
            <p className={styles.vacio}>El tablero está vacío</p>
          )}

          {/* Renderizamos: [zona] [carta] [zona] [carta] [zona] ... */}
          {/* Hay siempre (N+1) zonas de inserción para N cartas */}
          
          {/* Zona de inserción IZQUIERDA (posición 0) */}
          {hayCartaSeleccionada && (
            <ZonaInsercion posicion={0} onClick={onColocarCarta} />
          )}

          {cartas.map((carta, index) => (
            <div key={carta.id} className={styles.cartaConZona}>
              <Carta
                carta={carta}
                tamaño={tamano}
                enTablero={true}
                animarExito={ultimaJugadaCorrecta && index === cartas.length - 1}
                onDetalle={onVerDetalle}
              />

              {/* Zona de inserción DERECHA de esta carta (posición index+1) */}
              {hayCartaSeleccionada && (
                <ZonaInsercion posicion={index + 1} onClick={onColocarCarta} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Etiqueta "POSTERIOR" — extremo derecho */}
      <div className={styles.etiquetaTiempo}>
        <span>POSTERIOR ▶</span>
      </div>
    </div>
  );
}

// ---- Zona de Inserción ----
// Un espacio clicable que aparece entre (y alrededor de) las cartas
// cuando el jugador tiene una carta seleccionada para colocar.

interface ZonaInsercionProps {
  posicion: number;
  onClick: (posicion: number) => void;
}

function ZonaInsercion({ posicion, onClick }: ZonaInsercionProps) {
  return (
    <button
      className={styles.zonaInsercion}
      onClick={() => onClick(posicion)}
      title={`Colocar aquí (posición ${posicion})`}
      aria-label={`Colocar carta en posición ${posicion}`}
    >
      <span className={styles.flechaInsercion}>↓</span>
    </button>
  );
}
