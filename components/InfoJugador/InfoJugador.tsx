'use client';

// =============================================================================
// COMPONENTE: InfoJugador
// =============================================================================
// La barra superior que muestra la información del RIVAL.
// Incluye: nombre, número de cartas (con icono en abanico), indicador de turno.

import styles from './InfoJugador.module.css';

interface InfoJugadorProps {
  nombre: string;
  cartasEnMano: number;
  esSuTurno: boolean;
  desconectado?: boolean;
}

export default function InfoJugador({
  nombre,
  cartasEnMano,
  esSuTurno,
  desconectado = false,
}: InfoJugadorProps) {
  return (
    <header className={`${styles.barra} ${esSuTurno ? styles.esTurno : ''}`}>
      <div className={styles.jugadorInfo}>
        {/* Avatar con inicial */}
        <div className={`${styles.avatar} ${esSuTurno ? styles.avatarActivo : ''}`}>
          {nombre.charAt(0).toUpperCase()}
        </div>

        <div className={styles.datos}>
          <span className={styles.nombre}>{nombre}</span>
          {desconectado && (
            <span className={styles.desconectado}>Desconectado</span>
          )}
        </div>
      </div>

      {/* Contador de cartas */}
      <div className={styles.contador}>
        {/* Icono de abanico */}
        <span className={styles.abanico} aria-hidden="true">
          <span className={styles.c1} />
          <span className={styles.c2} />
          <span className={styles.c3} />
        </span>
        <span className={styles.numCartas}>{cartasEnMano}</span>
      </div>

      {/* Indicador de turno */}
      {esSuTurno && !desconectado && (
        <div className={styles.indicadorTurno}>
          <span className={styles.puntoPulsa} />
          <span>jugando</span>
        </div>
      )}
    </header>
  );
}
