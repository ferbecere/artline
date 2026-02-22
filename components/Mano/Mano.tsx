'use client';

import styles from './Mano.module.css';
import Carta from '../Carta/Carta';
import { Carta as TipoCarta } from '@/types/juego';

interface ManoProps {
  cartas: TipoCarta[];
  miNombre: string;
  esMiTurno: boolean;
  cartaSeleccionada: TipoCarta | null;
  onSeleccionarCarta: (carta: TipoCarta) => void;
  onDeseleccionar: () => void;
  onVerDetalle: (carta: TipoCarta) => void;
  onRendirse: () => void;
  ultimoResultado?: { correcto: boolean; mensaje: string; cartaId: number } | null;
}

export default function Mano({
  cartas,
  miNombre,
  esMiTurno,
  cartaSeleccionada,
  onSeleccionarCarta,
  onDeseleccionar,
  onVerDetalle,
  onRendirse,
  ultimoResultado,
}: ManoProps) {
  function handleClickCarta(carta: TipoCarta) {
    if (!esMiTurno) return;
    if (cartaSeleccionada?.id === carta.id) {
      onDeseleccionar();
    } else {
      onSeleccionarCarta(carta);
    }
  }

  // Clase del contenedor según turno
  const claseContenedor = [
    styles.contenedor,
    esMiTurno ? styles.esTurno : styles.noEsTurno,
  ].join(' ');

  return (
    <section className={claseContenedor}>

      {/* ---- Barra de jugador ---- */}
      <div className={styles.barraJugador}>
        <div className={styles.infoJugador}>
          <span className={styles.nombreJugador}>{miNombre}</span>
          <span className={styles.contadorCartas}>
            <IconoCartas />
            <span className={styles.numCartas}>{cartas.length}</span>
          </span>
        </div>

        {/* Mensaje de turno o resultado */}
        <div className={styles.mensajeZona}>
          {ultimoResultado && (
            <span className={`${styles.mensajeResultado} ${ultimoResultado.correcto ? styles.correcto : styles.incorrecto}`}>
              {ultimoResultado.correcto ? '✓ ' : '✗ '}{ultimoResultado.mensaje}
            </span>
          )}
          {!ultimoResultado && esMiTurno && !cartaSeleccionada && (
            <span className={styles.indicadorTurno}>
              <span className={styles.puntoPulsa} />
              Tu turno — Selecciona una obra
            </span>
          )}
          {!ultimoResultado && esMiTurno && cartaSeleccionada && (
            <span className={styles.indicadorColocar}>
              ↑ Elige dónde colocarla en la línea de tiempo
            </span>
          )}
          {!ultimoResultado && !esMiTurno && (
            <span className={styles.esperando}>Esperando al rival...</span>
          )}
        </div>

        {/* Botones: cancelar selección + rendirse */}
        <div className={styles.accionesBarra}>
          {cartaSeleccionada && (
            <button className={styles.btnCancelar} onClick={onDeseleccionar}>
              Cancelar
            </button>
          )}
          <button className={styles.btnRendirse} onClick={onRendirse}>
            Rendirse
          </button>
        </div>
      </div>

      {/* ---- Cartas en mano ---- */}
      {/* La clase .mano vive dentro del contenedor que ya tiene .esTurno o .noEsTurno */}
      <div className={styles.mano}>
        {cartas.map((carta) => (
          <div key={carta.id} className={styles.cartaWrapper}>
            <Carta
              carta={carta}
              tamaño="normal"
              seleccionada={cartaSeleccionada?.id === carta.id}
              enTablero={false}
              animarError={ultimoResultado?.correcto === false && ultimoResultado?.cartaId === carta.id}
              onClick={handleClickCarta}
              onDetalle={onVerDetalle}
            />
          </div>
        ))}

        {cartas.length === 0 && (
          <div className={styles.sinCartas}>
            <span>🎉</span>
            <p>¡Sin cartas! ¡Has ganado!</p>
          </div>
        )}
      </div>
    </section>
  );
}

function IconoCartas() {
  return (
    <span className={styles.iconoAbanico} aria-label="cartas en mano">
      <span className={styles.carta1} />
      <span className={styles.carta2} />
      <span className={styles.carta3} />
    </span>
  );
}
