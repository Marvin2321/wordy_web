/* ==========================================================
   WORDY - Páginas posteriores al login (inicio, cuenta cuentos)
   ========================================================== */

const CLAVE_SESION = 'wordy_sesion';
const PREFIJO_PROGRESO = 'wordy_progreso_';
const CLAVE_ULTIMO_REFRAN = 'wordy_ultimo_refran';

/* ----------------------------------------------------------
   REFRANES (temporal)
   Cuando exista la base de datos, esta lista desaparece y
   obtenerRefran() pide uno al servidor (ver comentario abajo).
   ---------------------------------------------------------- */
const REFRANES = [
  'No dejes para mañana lo que puedes hacer hoy',
  'A quien madruga, Dios lo ayuda',
  'Poco a poco se anda lejos',
  'La práctica hace al maestro'
];

/* ==========================================================
   FECHAS
   Siempre se usa la fecha LOCAL del jugador en formato AAAA-MM-DD
   (no toISOString, que usa UTC y puede cambiar el día).
   ========================================================== */
function fechaLocal(fecha = new Date()) {
  const a = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return a + '-' + m + '-' + d;
}

function sumarDias(fechaTexto, dias) {
  const [a, m, d] = fechaTexto.split('-').map(Number);
  return fechaLocal(new Date(a, m - 1, d + dias));
}

/* ==========================================================
   RACHA = días consecutivos jugados
   - Si hoy ya jugó: cuenta hacia atrás desde hoy.
   - Si hoy aún no juega pero ayer sí: la racha sigue viva
     (cuenta desde ayer) hasta que termine el día de hoy.
   - Si no jugó ni hoy ni ayer: la racha es 0.
   Esta función recibe una lista de fechas, así que sirve igual
   cuando la lista venga de la base de datos.
   ========================================================== */
function calcularRacha(diasJugados, hoy = fechaLocal()) {
  const jugados = new Set(diasJugados);
  let cursor = jugados.has(hoy) ? hoy : sumarDias(hoy, -1);
  let racha = 0;
  while (jugados.has(cursor)) {
    racha++;
    cursor = sumarDias(cursor, -1);
  }
  return racha;
}

/* ==========================================================
   SESIÓN
   ========================================================== */
function obtenerSesion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION));
  } catch (e) {
    return null;
  }
}

function cerrarSesion() {
  try {
    sessionStorage.removeItem(CLAVE_SESION);
    sessionStorage.removeItem(CLAVE_ULTIMO_REFRAN);
  } catch (e) { /* sin almacenamiento disponible */ }
  window.location.href = 'index.html';
}

/* ==========================================================
   PROGRESO DEL JUGADOR (días jugados y estrellas)
   Hoy se guarda en el navegador (localStorage) por usuario, para que
   la racha se conserve aunque cierre sesión.
   Con la base de datos, solo hay que cambiar el cuerpo de estas tres
   funciones: leerProgreso, guardarDiaJugado y obtenerDatosUsuario.
   ========================================================== */
function leerProgreso(usuario) {
  try {
    const p = JSON.parse(localStorage.getItem(PREFIJO_PROGRESO + usuario.toLowerCase()));
    return {
      dias: Array.isArray(p && p.dias) ? p.dias : [],
      estrellas: Number(p && p.estrellas) || 0
    };
  } catch (e) {
    return { dias: [], estrellas: 0 };
  }
}

function guardarProgreso(usuario, progreso) {
  try {
    localStorage.setItem(PREFIJO_PROGRESO + usuario.toLowerCase(), JSON.stringify(progreso));
  } catch (e) { /* sin almacenamiento disponible */ }
}

/* Devuelve { usuario, racha, estrellas } */
async function obtenerDatosUsuario() {
  // Con base de datos:
  //   const r = await fetch('php/datos_usuario.php');
  //   const { dias_jugados, estrellas } = await r.json();
  //   (dias_jugados: lista de fechas 'AAAA-MM-DD' de la tabla dias_jugados)
  const sesion = obtenerSesion();
  const progreso = leerProgreso(sesion.usuario);
  return {
    usuario: sesion.usuario,
    racha: calcularRacha(progreso.dias),
    estrellas: progreso.estrellas
  };
}

/* Marca HOY como día jugado (si ya estaba, no lo duplica) y devuelve la racha nueva */
async function registrarDiaJugado() {
  // Con base de datos:
  //   await fetch('php/registrar_dia.php', { method: 'POST' });
  //   SQL: INSERT IGNORE INTO dias_jugados (usuario_id, fecha) VALUES (?, CURDATE());
  //   (con una llave única en usuario_id + fecha para que no se repita el día)
  const sesion = obtenerSesion();
  const progreso = leerProgreso(sesion.usuario);
  const hoy = fechaLocal();
  if (!progreso.dias.includes(hoy)) progreso.dias.push(hoy);
  guardarProgreso(sesion.usuario, progreso);
  return calcularRacha(progreso.dias);
}

async function obtenerRefran() {
  // Con base de datos: const r = await fetch('php/refran_aleatorio.php'); return (await r.json()).texto;
  // (en SQL: SELECT texto FROM refranes ORDER BY RAND() LIMIT 1)
  let indice = Math.floor(Math.random() * REFRANES.length);

  // Evita repetir el mismo refrán que se mostró la última vez
  try {
    const ultimo = Number(sessionStorage.getItem(CLAVE_ULTIMO_REFRAN));
    if (REFRANES.length > 1 && indice === ultimo) {
      indice = (indice + 1 + Math.floor(Math.random() * (REFRANES.length - 1))) % REFRANES.length;
    }
    sessionStorage.setItem(CLAVE_ULTIMO_REFRAN, String(indice));
  } catch (e) { /* sin almacenamiento disponible */ }

  return REFRANES[indice];
}

/* ==========================================================
   INICIO
   ========================================================== */
async function iniciarInicio() {
  const elRefran = document.getElementById('refran');
  if (!elRefran) return;

  const datos = await obtenerDatosUsuario();
  [['racha', datos.racha], ['estrellas', datos.estrellas]].forEach(([id, valor]) => {
    const el = document.getElementById(id);
    el.textContent = valor;
    // Si el número tiene 3 o más cifras se achica para que quepa en la tarjeta
    el.parentElement.classList.toggle('largo', String(valor).length >= 3);
  });

  const texto = await obtenerRefran();
  elRefran.textContent = '"' + texto + '"';
}

/* ==========================================================
   CUENTA CUENTOS
   ========================================================== */
function mostrarAviso(texto) {
  const aviso = document.getElementById('aviso');
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.classList.add('visible');
  clearTimeout(mostrarAviso.temporizador);
  mostrarAviso.temporizador = setTimeout(() => aviso.classList.remove('visible'), 3200);
}

function iniciarCuentos() {
  const boton = document.getElementById('btnJugar');
  if (!boton) return;

  boton.addEventListener('click', async evento => {
    evento.preventDefault();
    const racha = await registrarDiaJugado();
    mostrarAviso('¡Día jugado! Racha: ' + racha + (racha === 1 ? ' día' : ' días'));

    // Cuando exista la pantalla del juego, pon su ruta en data-destino del botón
    const destino = boton.getAttribute('data-destino');
    if (destino) window.location.href = destino;
  });
}

/* ---------- Menú hamburguesa ---------- */
function iniciarMenu() {
  const boton = document.getElementById('btnMenu');
  const panel = document.getElementById('menuPanel');
  if (!boton || !panel) return;

  boton.addEventListener('click', evento => {
    evento.stopPropagation();
    const abierto = panel.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', abierto);
  });

  document.addEventListener('click', evento => {
    if (!panel.contains(evento.target)) {
      panel.classList.remove('abierto');
      boton.setAttribute('aria-expanded', 'false');
    }
  });

  const salir = document.getElementById('menuCerrarSesion');
  if (salir) salir.addEventListener('click', cerrarSesion);
}

/* ==========================================================
   SOLO PARA PRUEBAS (borrar cuando exista la base de datos)
   Desde la consola del navegador (F12):
     WordyPrueba.simularRacha(5)   -> marca los últimos 5 días como jugados
     WordyPrueba.darEstrellas(12)  -> pone 12 estrellas
     WordyPrueba.reiniciar()       -> borra el progreso del usuario
   Después recarga la página.
   ========================================================== */
window.WordyPrueba = {
  simularRacha(n) {
    const sesion = obtenerSesion();
    if (!sesion) return 'Inicia sesión primero';
    const progreso = leerProgreso(sesion.usuario);
    const hoy = fechaLocal();
    for (let i = 0; i < n; i++) {
      const dia = sumarDias(hoy, -i);
      if (!progreso.dias.includes(dia)) progreso.dias.push(dia);
    }
    guardarProgreso(sesion.usuario, progreso);
    return 'Listo: recarga la página';
  },
  darEstrellas(n) {
    const sesion = obtenerSesion();
    if (!sesion) return 'Inicia sesión primero';
    const progreso = leerProgreso(sesion.usuario);
    progreso.estrellas = Number(n) || 0;
    guardarProgreso(sesion.usuario, progreso);
    return 'Listo: recarga la página';
  },
  reiniciar() {
    const sesion = obtenerSesion();
    if (!sesion) return 'Inicia sesión primero';
    guardarProgreso(sesion.usuario, { dias: [], estrellas: 0 });
    return 'Listo: recarga la página';
  }
};

/* ==========================================================
   ARRANQUE
   ========================================================== */
// Si la página exige sesión y no hay, regresa al login
if (document.body.hasAttribute('data-requiere-sesion') && !obtenerSesion()) {
  window.location.replace('index.html');
} else {
  const botonSalir = document.getElementById('cerrarSesion');
  if (botonSalir) botonSalir.addEventListener('click', cerrarSesion);
  iniciarMenu();
  iniciarInicio();
  iniciarCuentos();
}