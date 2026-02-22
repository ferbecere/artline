// =============================================================================
// MET MUSEUM API - WRAPPER
// =============================================================================
// La Met API es pública y sin autenticación. Documentación oficial:
// https://metmuseum.github.io/
//
// Estrategia de carga:
// 1. Buscamos obras que tengan imagen pública disponible
// 2. Filtramos por obras con año conocido (necesario para el Timeline)
// 3. Mezclamos aleatoriamente para variedad
// 4. Cacheamos los IDs en memoria para no abusar de la API

import { Carta, TipoObra } from '../types/juego';

const BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Cache simple en memoria del servidor
// En producción usaríamos Redis, pero para este proyecto es suficiente
let cacheIdsObras: number[] = [];
let ultimaCargaCache: number = 0;
const DURACION_CACHE_MS = 1000 * 60 * 30; // 30 minutos

// Departamentos que queremos incluir (tienen buenos volúmenes de obras con imagen)
const DEPARTAMENTOS_BUSQUEDA = [
  'European Paintings',
  'American Paintings and Sculpture', 
  'Asian Art',
  'Modern and Contemporary Art',
  'Egyptian Art',
  'Greek and Roman Art',
];

// Mapeamos el departamento al tipo de obra para el color de la carta
function detectarTipoObra(departamento: string, medio: string): TipoObra {
  const dep = departamento.toLowerCase();
  const med = medio.toLowerCase();
  
  if (dep.includes('painting') || med.includes('oil') || med.includes('tempera') || med.includes('acrylic') || med.includes('watercolor')) {
    return 'pintura';
  }
  if (dep.includes('sculpture') || med.includes('marble') || med.includes('bronze') || med.includes('terracotta') || med.includes('stone')) {
    return 'escultura';
  }
  return 'otro';
}

// Transforma la respuesta cruda de la API a nuestra interfaz Carta
function transformarObra(obra: any): Carta | null {
  // objectEndDate = fecha de finalización de la obra, la más fiable como año oficial.
  // Fallback a objectBeginDate si endDate no existe o es 0.
  const anioFin = obra.objectEndDate;
  const anioInicio = obra.objectBeginDate;
  const anio = (anioFin && anioFin !== 0) ? anioFin : anioInicio;

  if (!anio || anio === 0) return null;

  // Necesitamos imagen
  if (!obra.primaryImageSmall && !obra.primaryImage) return null;
  
  // Necesitamos título
  if (!obra.title) return null;

  return {
    id: obra.objectID,
    titulo: obra.title,
    artista: obra.artistDisplayName || 'Artista desconocido',
    anio: anio,
    anioTexto: obra.objectDate || String(anio),
    imagen: obra.primaryImageSmall || obra.primaryImage,
    tipo: detectarTipoObra(obra.department || '', obra.medium || ''),
    departamento: obra.department || '',
    medio: obra.medium || 'Técnica desconocida',
    dimensiones: obra.dimensions || '',
    cultura: obra.culture || '',
    pais: obra.country || '',
    descripcion: obra.creditLine || '',
    urlObra: obra.objectURL || `https://www.metmuseum.org/art/collection/search/${obra.objectID}`,
  };
}

// IDs de departamento de la Met con más obras de dominio público con imagen
// Fuente: https://metmuseum.github.io/ — endpoint /search con departmentId
const DEPARTMENT_IDS = [
  6,   // Asian Art (~35.000 obras)
  11,  // European Paintings (~3.000 obras)
  13,  // Greek and Roman Art (~17.000 obras)
  15,  // Islamic Art (~12.000 obras)
  21,  // Modern and Contemporary Art (~13.000 obras)
  10,  // Egyptian Art (~26.000 obras)
  3,   // Ancient Near Eastern Art (~7.000 obras)
];

// Carga los IDs disponibles desde la API (con cache)
async function cargarIdsDisponibles(): Promise<number[]> {
  const ahora = Date.now();
  
  if (cacheIdsObras.length > 0 && (ahora - ultimaCargaCache) < DURACION_CACHE_MS) {
    return cacheIdsObras;
  }

  console.log('[MetAPI] Recargando IDs de obras desde la API...');

  // Lanzamos una búsqueda por cada departamento en paralelo
  // Usamos Promise.allSettled para que un fallo no cancele el resto
  const resultados = await Promise.allSettled(
    DEPARTMENT_IDS.map(deptId =>
      fetch(`${BASE_URL}/search?hasImages=true&isPublicDomain=true&q=*&departmentId=${deptId}`)
        .then(r => r.json())
        .then(d => (d.objectIDs as number[]) || [])
    )
  );

  const todosIds: number[] = [];
  for (const resultado of resultados) {
    if (resultado.status === 'fulfilled') {
      todosIds.push(...resultado.value);
    }
  }

  // Deduplicar y mezclar aleatoriamente
  const idsMezclados = [...new Set(todosIds)].sort(() => Math.random() - 0.5);

  cacheIdsObras = idsMezclados;
  ultimaCargaCache = ahora;

  console.log(`[MetAPI] Cache cargado: ${idsMezclados.length} IDs disponibles`);
  return idsMezclados;
}

// Obtiene los detalles de una obra por ID
async function obtenerObra(id: number): Promise<Carta | null> {
  try {
    const resp = await fetch(`${BASE_URL}/objects/${id}`);
    if (!resp.ok) return null;
    const datos = await resp.json();
    return transformarObra(datos);
  } catch {
    return null;
  }
}

// Función principal: obtiene N cartas válidas para el juego
// Estrategia: lotes paralelos de TAMANO_LOTE peticiones simultáneas
// Mucho más rápido que una a una, sin saturar la API
const TAMANO_LOTE = 10;

export async function obtenerCartasAleatorias(cantidad: number): Promise<Carta[]> {
  const ids = await cargarIdsDisponibles();

  if (ids.length === 0) {
    throw new Error('No se pudieron cargar obras de la Met API');
  }

  const cartas: Carta[] = [];
  const idsUsados = new Set<number>();

  // Seleccionamos un subconjunto aleatorio de IDs para este juego
  const indiceInicial = Math.floor(Math.random() * ids.length);
  const idsCandidatos = [
    ...ids.slice(indiceInicial),
    ...ids.slice(0, indiceInicial),
  ];

  let cursor = 0;

  while (cartas.length < cantidad && cursor < idsCandidatos.length) {
    // Cogemos el siguiente lote de IDs no usados
    const lote: number[] = [];
    while (lote.length < TAMANO_LOTE && cursor < idsCandidatos.length) {
      const id = idsCandidatos[cursor++];
      if (!idsUsados.has(id)) {
        idsUsados.add(id);
        lote.push(id);
      }
    }

    if (lote.length === 0) break;

    // Pedimos el lote en paralelo
    const resultados = await Promise.all(lote.map(id => obtenerObra(id)));

    for (const carta of resultados) {
      if (carta && cartas.length < cantidad) {
        cartas.push(carta);
      }
    }

    console.log(`[MetAPI] ${cartas.length}/${cantidad} cartas obtenidas...`);
  }

  if (cartas.length < cantidad) {
    console.warn(`[MetAPI] Solo se obtuvieron ${cartas.length}/${cantidad} cartas`);
  }

  return cartas;
}

// Obtiene una sola carta adicional (para cuando el jugador pierde una jugada y roba)
export async function obtenerCartaExtra(idsExcluidos: number[]): Promise<Carta | null> {
  const ids = await cargarIdsDisponibles();
  const excluidos = new Set(idsExcluidos);
  
  for (let i = 0; i < 50; i++) {
    const id = ids[Math.floor(Math.random() * ids.length)];
    if (excluidos.has(id)) continue;
    const carta = await obtenerObra(id);
    if (carta) return carta;
  }
  
  return null;
}
