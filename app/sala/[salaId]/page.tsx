'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useSocket } from '@/context/SocketContext';
import InfoJugador from '@/components/InfoJugador/InfoJugador';
import Tablero from '@/components/Tablero/Tablero';
import Mano from '@/components/Mano/Mano';
import PanelDetalle from '@/components/PanelDetalle/PanelDetalle';
import Chat from '@/components/Chat/Chat';
import { Carta } from '@/types/juego';

// Umbral para el modal de "distancia grande": yo tengo N más que el rival
const UMBRAL_RENDICION = 5;
const MIN_CARTAS_PARA_AVISO = 7;

export default function PaginaJuego() {
  const params = useParams();
  const router = useRouter();
  const salaId = params.salaId as string;

  const {
    miSocketId,
    estadoJuego,
    ultimoResultado,
    error,
    colocarCarta,
    limpiarError,
    resetearSala,
    rendirse,
    esCreador,
    socket,
  } = useSocket();

  // ---- Estado local de UI ----
  const [cartaSeleccionada, setCartaSeleccionada] = useState<Carta | null>(null);
  const [cartaDetalle, setCartaDetalle] = useState<{ carta: Carta; ocultarFecha: boolean } | null>(null);
  const [modalRendirse, setModalRendirse] = useState<'manual' | 'automatico' | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [avisoCerrado, setAvisoCerrado] = useState(false);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(salaId).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  };
  const [juegoTerminadoInfo, setJuegoTerminadoInfo] = useState<{
    ganador: string;
    soyElGanador: boolean;
    porRendicion?: boolean;
    nombreRendido?: string;
    porAbandono?: boolean;
  } | null>(null);
  const [pantallaAbandono, setPantallaAbandono] = useState(false);

  // ---- Derivados del estado ----
  const miJugador = estadoJuego?.jugadores.find(j => j.socketId === miSocketId);
  const rival = estadoJuego?.jugadores.find(j => j.socketId !== miSocketId);
  const esMiTurno = estadoJuego?.turnoActual === miSocketId;

  const misCartas = miJugador?.cartasEnMano ?? miJugador?.mano.length ?? 0;
  const cartasRival = rival?.cartasEnMano ?? 0;
  const diferenciaGrande = misCartas >= MIN_CARTAS_PARA_AVISO && (misCartas - cartasRival) >= UMBRAL_RENDICION;

  // ---- Detectar fin de juego ----
  useEffect(() => {
    if (estadoJuego?.fase === 'terminado' && estadoJuego.ganador) {
      const esAbandono = (estadoJuego as any).porAbandono === true;

      if (esAbandono) {
        // Mostrar pantalla de abandono durante 3 segundos, luego la de victoria
        setPantallaAbandono(true);
        setTimeout(() => {
          setPantallaAbandono(false);
          setJuegoTerminadoInfo({
            ganador: 'Tú',
            soyElGanador: true,
            porAbandono: true,
          });
        }, 3500);
      } else {
        const ganadorJugador = estadoJuego.jugadores.find(j => j.socketId === estadoJuego.ganador);
        setJuegoTerminadoInfo({
          ganador: ganadorJugador?.nombre || 'Desconocido',
          soyElGanador: estadoJuego.ganador === miSocketId,
        });
      }
    }
  }, [estadoJuego?.fase, estadoJuego?.ganador, miSocketId, estadoJuego?.jugadores]);

  // ---- Modal automático por diferencia grande ----
  // Solo se muestra una vez por partida (cuando se cumple la condición)
  const [avisoDiferenciaYaMostrado, setAvisoDiferenciaYaMostrado] = useState(false);
  useEffect(() => {
    if (diferenciaGrande && !avisoDiferenciaYaMostrado && estadoJuego?.fase === 'jugando') {
      setModalRendirse('automatico');
      setAvisoDiferenciaYaMostrado(true);
    }
  }, [diferenciaGrande, avisoDiferenciaYaMostrado, estadoJuego?.fase]);

  // Deseleccionamos carta cuando cambia el turno
  useEffect(() => {
    if (!esMiTurno) setCartaSeleccionada(null);
  }, [esMiTurno]);

  // ---- Acción: rendirse y volver al inicio ----
  const handleRendirse = useCallback(() => {
    rendirse();
    setModalRendirse(null);
    // Esperamos un tick para que el servidor procese el evento
    // antes de limpiar el estado local y navegar
    setTimeout(() => {
      resetearSala();
      router.push('/');
    }, 300);
  }, [rendirse, resetearSala, router]);

  // ---- Handlers de carta ----
  const handleSeleccionarCarta = useCallback((carta: Carta) => {
    setCartaSeleccionada(carta);
  }, []);

  const handleDeseleccionar = useCallback(() => {
    setCartaSeleccionada(null);
  }, []);

  const handleColocarEnTablero = useCallback((posicion: number) => {
    if (!cartaSeleccionada) return;
    colocarCarta(cartaSeleccionada.id, posicion);
    setCartaSeleccionada(null);
  }, [cartaSeleccionada, colocarCarta]);

  // Desde el tablero: mostramos toda la info incluida la fecha
  const handleVerDetalleTablero = useCallback((carta: Carta) => {
    setCartaDetalle({ carta, ocultarFecha: false });
  }, []);

  // Desde la mano: ocultamos la fecha para no hacer trampa
  const handleVerDetalleMano = useCallback((carta: Carta) => {
    setCartaDetalle({ carta, ocultarFecha: true });
  }, []);

  // ---- Pantalla: Esperando rival ----
  if (!estadoJuego || estadoJuego.fase === 'esperando') {
    return (
      <div className={styles.pantallaEspera}>
        <div className={styles.esperaContenedor}>
          <h1 className={styles.esperaLogo}>ArtLine</h1>
          <div className={styles.esperaBox}>
            <div className={styles.spinner} />

            {esCreador ? (
              <>
                <h2>Sala creada</h2>
                <p>Comparte este código con tu rival:</p>
                <div className={styles.filaCodigo}>
                  <div className={styles.codigoSala}>{salaId}</div>
                  <button
                    className={`${styles.btnCopiar} ${copiado ? styles.copiado : ''}`}
                    onClick={copiarCodigo}
                    title={copiado ? '¡Copiado!' : 'Copiar código'}
                  >
                    {copiado ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className={styles.esperaTexto}>Esperando que tu rival se una...</p>
              </>
            ) : (
              <>
                <h2>Entrando en sala</h2>
                <p className={styles.esperaTexto}>Cargando obras de arte...</p>
              </>
            )}
          </div>
          <button className={styles.btnVolver} onClick={() => { resetearSala(); router.push('/'); }}>
            ← Cancelar y volver
          </button>
        </div>
      </div>
    );
  }

  // ---- Pantalla: Fin de juego ----
  // ---- Pantalla: rival huye ----
  if (pantallaAbandono) {
    return (
      <div className={styles.pantallaAbandono}>
        <div className={styles.abandonoContenedor}>
          <div className={styles.abandonoEmoji}>🏃</div>
          <h2 className={styles.abandonoTitulo}>¡Tu rival ha huido con pavor!</h2>
          <p className={styles.abandonoSubtitulo}>La obra de arte los ha superado...</p>
          <div className={styles.abandonoDots}>
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  if (juegoTerminadoInfo) {
    return (
      <div className={styles.pantallaFin}>
        <div className={styles.finContenedor}>
          <h1 className={styles.finEmoji}>{juegoTerminadoInfo.soyElGanador ? '🏆' : '🎨'}</h1>
          <h2 className={styles.finTitulo}>
            {juegoTerminadoInfo.soyElGanador ? '¡Has ganado!' : 'Has perdido'}
          </h2>
          <p className={styles.finSubtitulo}>
            {juegoTerminadoInfo.porAbandono
              ? 'Victoria por abandono — tu rival no pudo con la presión'
              : juegoTerminadoInfo.soyElGanador
                ? 'Eres el experto en arte del Metropolitan Museum'
                : `${juegoTerminadoInfo.ganador} conoce mejor la historia del arte`}
          </p>
          <div className={styles.finTablero}>
            <p className={styles.finTableroLabel}>Línea de tiempo final — {estadoJuego.tablero.length} obras</p>
            <div className={styles.finTableroCartas}>
              {estadoJuego.tablero.map((carta) => (
                <div key={carta.id} className={styles.finCartaMini}>
                  <span className={styles.finAnio}>{carta.anioTexto}</span>
                </div>
              ))}
            </div>
          </div>
          <button className={styles.btnNuevaPartida} onClick={() => { resetearSala(); router.push('/'); }}>
            Nueva partida
          </button>
        </div>
      </div>
    );
  }

  // ---- Pantalla principal de juego ----
  return (
    <div className={styles.tapete}>

      {/* ---- ZONA SUPERIOR: Info del rival ---- */}
      {rival ? (
        <InfoJugador
          nombre={rival.nombre}
          cartasEnMano={rival.cartasEnMano}
          esSuTurno={estadoJuego.turnoActual === rival.socketId}
        />
      ) : (
        <div className={styles.sinRival}>Esperando rival...</div>
      )}

      {/* ---- ZONA CENTRAL: Timeline ---- */}
      <div className={styles.zonaCentral}>
        {estadoJuego.mensajeUltimaJugada && (
          <div className={styles.mensajeJugada} key={estadoJuego.mensajeUltimaJugada}>
            {estadoJuego.mensajeUltimaJugada}
          </div>
        )}
        <Tablero
          cartas={estadoJuego.tablero}
          cartaSeleccionada={esMiTurno ? cartaSeleccionada : null}
          onColocarCarta={handleColocarEnTablero}
          onVerDetalle={handleVerDetalleTablero}
          ultimaJugadaCorrecta={ultimoResultado?.correcto}
        />
      </div>

      {/* ---- ZONA INFERIOR: Mi mano ---- */}
      {miJugador && (
        <Mano
          cartas={miJugador.mano}
          miNombre={miJugador.nombre}
          esMiTurno={esMiTurno}
          cartaSeleccionada={cartaSeleccionada}
          onSeleccionarCarta={handleSeleccionarCarta}
          onDeseleccionar={handleDeseleccionar}
          onVerDetalle={handleVerDetalleMano}
          onRendirse={() => setModalRendirse('manual')}
          ultimoResultado={ultimoResultado}
        />
      )}

      {/* ---- AVISO: clic derecho para info (se cierra manualmente) ---- */}
      {!avisoCerrado && estadoJuego.fase === 'jugando' && (
        <div className={styles.avisoInfo}>
          <span>🖱️ Clic derecho sobre cualquier obra para más información</span>
          <button className={styles.avisoClose} onClick={() => setAvisoCerrado(true)} aria-label="Cerrar aviso">×</button>
        </div>
      )}

      {/* ---- CHAT FLOTANTE ---- */}
      {miJugador && (
        <Chat
          miNombre={miJugador.nombre}
          salaId={salaId}
          socket={socket}
        />
      )}

      {/* ---- PANEL LATERAL: Detalle de obra ---- */}
      <PanelDetalle
        carta={cartaDetalle?.carta ?? null}
        ocultarFecha={cartaDetalle?.ocultarFecha ?? false}
        onCerrar={() => setCartaDetalle(null)}
      />

      {/* ---- MODAL: Rendirse ---- */}
      {modalRendirse && (
        <div className={styles.modalOverlay} onClick={() => setModalRendirse(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            {modalRendirse === 'automatico' ? (
              <>
                <p className={styles.modalIcono}>😓</p>
                <h3 className={styles.modalTitulo}>La distancia es muy grande</h3>
                <p className={styles.modalTexto}>
                  Tienes <strong>{misCartas} cartas</strong> y tu rival solo tiene{' '}
                  <strong>{cartasRival}</strong>. ¿Quieres iniciar una nueva partida?
                </p>
              </>
            ) : (
              <>
                <p className={styles.modalIcono}>🏳️</p>
                <h3 className={styles.modalTitulo}>¿Seguro que quieres rendirte?</h3>
                <p className={styles.modalTexto}>
                  Tu rival ganará la partida. Podrás empezar una nueva inmediatamente.
                </p>
              </>
            )}
            <div className={styles.modalBotones}>
              <button className={styles.modalBtnSi} onClick={handleRendirse}>
                Sí, rendirse
              </button>
              <button className={styles.modalBtnNo} onClick={() => setModalRendirse(null)}>
                Seguir jugando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Error flotante ---- */}
      {error && (
        <div className={styles.errorFlotante} onClick={limpiarError}>
          ⚠️ {error}
          <span className={styles.errorCerrar}>×</span>
        </div>
      )}
    </div>
  );
}
