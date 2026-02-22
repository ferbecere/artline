'use client';

// =============================================================================
// PÁGINA: Inicio
// =============================================================================
// Pantalla de bienvenida donde el jugador puede:
// 1. Crear una sala nueva (recibe un código de 6 letras para compartir)
// 2. Unirse a una sala existente con el código
//
// Una vez en sala, se redirige a /sala/[salaId]

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useSocket } from '@/context/SocketContext';

type Vista = 'inicio' | 'crear' | 'unirse';

export default function PaginaInicio() {
  const router = useRouter();
  const { conectado, salaId, crearSala, unirseASala, error, limpiarError } = useSocket();
  
  const [vista, setVista] = useState<Vista>('inicio');
  const [nombre, setNombre] = useState('');
  const [codigoSala, setCodigoSala] = useState('');
  const [cargando, setCargando] = useState(false);

  // Guardamos el salaId que existía AL MONTAR la página.
  // Solo navegamos si el salaId cambia DESPUÉS de montarse
  // (es decir, el servidor acaba de confirmar una nueva sala).
  // Esto evita el bucle: volver al inicio → salaId antiguo → redirige de nuevo.
  const salaIdAlMontar = useRef(salaId);

  useEffect(() => {
    if (salaId && salaId !== salaIdAlMontar.current) {
      router.push(`/sala/${salaId}`);
    }
  }, [salaId, router]);

  // Limpiamos el error al cambiar de vista
  useEffect(() => {
    limpiarError();
  }, [vista, limpiarError]);

  function handleCrearSala(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCargando(true);
    crearSala(nombre.trim());
    // El estado 'cargando' se resetea cuando llegue el error o la sala
  }

  function handleUnirseASala(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !codigoSala.trim()) return;
    setCargando(true);
    unirseASala(codigoSala.trim(), nombre.trim());
  }

  // Si hay error, paramos el estado de carga
  useEffect(() => {
    if (error) setCargando(false);
  }, [error]);

  return (
    <main className={styles.main}>
      {/* Fondo decorativo */}
      <div className={styles.fondo} aria-hidden="true">
        <div className={styles.fondoLinea1} />
        <div className={styles.fondoLinea2} />
      </div>

      <div className={styles.contenedor}>
        {/* ---- Logo y tagline ---- */}
        <header className={styles.header}>
          <h1 className={styles.logo}>ArtLine</h1>
          <p className={styles.tagline}>El Timeline del Arte · Metropolitan Museum of Art</p>
          
          {/* Indicador de conexión */}
          <div className={styles.estadoConexion}>
            <span className={`${styles.puntoCon} ${conectado ? styles.conectado : styles.desconectado}`} />
            <span>{conectado ? 'Conectado' : 'Conectando...'}</span>
          </div>
        </header>

        {/* ---- Panel central ---- */}
        <div className={styles.panel}>
          
          {/* VISTA: Inicio — dos botones */}
          {vista === 'inicio' && (
            <div className={styles.opciones}>
              <div className={styles.descripcion}>
                <p>Ordena obras maestras en la línea del tiempo.</p>
                <p>El primero en vaciar su mano, gana.</p>
              </div>

              <div className={styles.botonesAccion}>
                <button
                  className={`${styles.btn} ${styles.btnPrimario}`}
                  onClick={() => setVista('crear')}
                  disabled={!conectado}
                >
                  <span className={styles.btnIcono}>✦</span>
                  Crear nueva partida
                </button>
                
                <button
                  className={`${styles.btn} ${styles.btnSecundario}`}
                  onClick={() => setVista('unirse')}
                  disabled={!conectado}
                >
                  Unirse con código
                </button>
              </div>

              {/* Leyenda de colores */}
              <div className={styles.leyenda}>
                <div className={styles.leyendaItem}>
                  <span className={`${styles.leyendaColor} ${styles.leyendaPintura}`} />
                  <span>Pinturas</span>
                </div>
                <div className={styles.leyendaItem}>
                  <span className={`${styles.leyendaColor} ${styles.leyendaEscultura}`} />
                  <span>Esculturas</span>
                </div>
                <div className={styles.leyendaItem}>
                  <span className={`${styles.leyendaColor} ${styles.leyendaOtro}`} />
                  <span>Otras obras</span>
                </div>
              </div>
            </div>
          )}

          {/* VISTA: Crear sala */}
          {vista === 'crear' && (
            <form onSubmit={handleCrearSala} className={styles.formulario}>
              <button type="button" className={styles.btnVolver} onClick={() => setVista('inicio')}>
                ← Volver
              </button>
              <h2 className={styles.formTitulo}>Nueva partida</h2>
              <p className={styles.formDescripcion}>
                Crea la sala y comparte el código con tu rival.
              </p>
              
              <div className={styles.campo}>
                <label htmlFor="nombre-crear" className={styles.label}>
                  Tu nombre
                </label>
                <input
                  id="nombre-crear"
                  type="text"
                  className={styles.input}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Picasso_Fan"
                  maxLength={20}
                  autoFocus
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimario}`}
                disabled={!nombre.trim() || cargando}
              >
                {cargando ? 'Creando sala...' : 'Crear sala'}
              </button>
            </form>
          )}

          {/* VISTA: Unirse a sala */}
          {vista === 'unirse' && (
            <form onSubmit={handleUnirseASala} className={styles.formulario}>
              <button type="button" className={styles.btnVolver} onClick={() => setVista('inicio')}>
                ← Volver
              </button>
              <h2 className={styles.formTitulo}>Unirse a partida</h2>
              <p className={styles.formDescripcion}>
                Introduce el código de 6 letras que te ha pasado tu rival.
              </p>

              <div className={styles.campo}>
                <label htmlFor="nombre-unirse" className={styles.label}>Tu nombre</label>
                <input
                  id="nombre-unirse"
                  type="text"
                  className={styles.input}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Vermeer_Fan"
                  maxLength={20}
                  autoFocus
                  required
                />
              </div>

              <div className={styles.campo}>
                <label htmlFor="codigo-sala" className={styles.label}>Código de sala</label>
                <input
                  id="codigo-sala"
                  type="text"
                  className={`${styles.input} ${styles.inputCodigo}`}
                  value={codigoSala}
                  onChange={e => setCodigoSala(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                  pattern="[A-Z0-9]{6}"
                  required
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimario}`}
                disabled={!nombre.trim() || codigoSala.length < 6 || cargando}
              >
                {cargando ? 'Conectando...' : 'Unirse'}
              </button>
            </form>
          )}
        </div>

        <footer className={styles.footer}>
          <p>Obras del <a href="https://metmuseum.org" target="_blank" rel="noopener noreferrer">Metropolitan Museum of Art</a> · API pública</p>
        </footer>
      </div>
    </main>
  );
}
