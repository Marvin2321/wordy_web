/* ==========================================================
   WORDY - Validación de formularios (login y registro)
   ========================================================== */

/* Mientras no exista la base de datos déjalo en true:
   valida, crea una sesión de prueba y entra a inicio.html.
   Cuando el backend esté listo, cámbialo a false y el formulario
   se enviará por POST al action. */
const MODO_DEMO = true;

const CLAVE_SESION = 'wordy_sesion';
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function marcar(campoEl, valido) {
  campoEl.closest('.campo').classList.toggle('invalido', !valido);
  return valido;
}

function validarCampo(el) {
  const valor = el.value.trim();

  switch (el.name) {
    case 'tipo_cuenta':
      return marcar(el, valor !== '');
    case 'correo':
      return marcar(el, REGEX_CORREO.test(valor));
    case 'usuario':
      return marcar(el, el.minLength > 0
        ? valor.length >= el.minLength && valor.length <= el.maxLength
        : valor !== '');
    case 'contrasena':
      return marcar(el, el.minLength > 0
        ? el.value.length >= el.minLength
        : el.value !== '');
    default:
      return true;
  }
}

function iniciarFormulario(form) {
  if (!form) return;

  const mensaje = form.querySelector('#mensaje');
  const campos = form.querySelectorAll('input, select');

  // Quita el error mientras el usuario corrige
  campos.forEach(el => {
    el.addEventListener('input', () => {
      if (el.closest('.campo').classList.contains('invalido')) validarCampo(el);
    });
    el.addEventListener('change', () => {
      if (el.closest('.campo').classList.contains('invalido')) validarCampo(el);
    });
  });

  form.addEventListener('submit', evento => {
    let todoValido = true;
    campos.forEach(el => {
      if (!validarCampo(el)) todoValido = false;
    });

    if (!todoValido) {
      evento.preventDefault();
      mensaje.className = 'mensaje error';
      mensaje.textContent = 'Revisa los campos marcados.';
      return;
    }

    if (MODO_DEMO) {
      evento.preventDefault();

      if (form.id === 'formLogin') {
        // Sesión de prueba (después vendrá de la base de datos).
        // La racha y las estrellas ya NO van aquí: se calculan con los días jugados.
        const sesion = {
          usuario: form.usuario.value.trim(),
          tipo_cuenta: form.tipo_cuenta.value
        };
        try {
          sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
        } catch (e) { /* sin almacenamiento disponible */ }

        mensaje.className = 'mensaje ok';
        mensaje.textContent = '✔ Entrando...';
        window.location.href = 'inicio.html';
      } else {
        mensaje.className = 'mensaje ok';
        mensaje.textContent = '✔ Cuenta creada (modo demo). Redirigiendo al login...';
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
      }
    }
    // Con MODO_DEMO = false el formulario se envía por POST al action.
  });
}

iniciarFormulario(document.getElementById('formLogin'));
iniciarFormulario(document.getElementById('formRegistro'));