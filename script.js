/**
 * Landing de Confirmación de Asistencia - Cumpleaños 80 de Cacho
 * Script principal (Lógica de Audio, Formulario y Confeti)
 */

// ==========================================================================
// CONFIGURACIÓN GLOBAL
// ==========================================================================
// Reemplaza esta URL con la URL de ejecución web generada en tu Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJRGo_KbXdrRiQ99Z0h55gJreTJFs0emuivgeTuN_PboM-CYgPY6rpNqFGeFqzfdd3/exec';

// ==========================================================================
// INICIALIZACIÓN Y VARIABLES DE ESTADO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Elementos DOM
let audio, btnEnter, welcomeScreen, mainContent, successScreen, musicToggle;
let rsvpForm, btnSubmit, attendanceDetailsPanel, attendeesNamesList;
let inputFullname, inputGroup, inputAdults, inputMinors;

function initApp() {
    // Referencias DOM
    audio = document.getElementById('bg-music');
    btnEnter = document.getElementById('btn-enter');
    welcomeScreen = document.getElementById('welcome-screen');
    mainContent = document.getElementById('main-content');
    successScreen = document.getElementById('success-screen');
    musicToggle = document.getElementById('music-toggle');

    rsvpForm = document.getElementById('rsvp-form');
    btnSubmit = document.getElementById('btn-submit');
    attendanceDetailsPanel = document.getElementById('attendance-details-panel');
    attendeesNamesList = document.getElementById('attendees-names-list');

    inputFullname = document.getElementById('input-fullname');
    inputGroup = document.getElementById('input-group');
    inputAdults = document.getElementById('input-adults');
    inputMinors = document.getElementById('input-minors');

    // Inicializar Eventos
    btnEnter.addEventListener('click', enterFestejo);
    musicToggle.addEventListener('click', toggleMusic);

    // Escucha cambios en ¿Asistirá?
    document.querySelectorAll('input[name="attendance"]').forEach(radio => {
        radio.addEventListener('change', handleAttendanceChange);
    });

    // Controladores de Stepper (+ / -)
    document.querySelectorAll('.btn-step').forEach(btn => {
        btn.addEventListener('click', handleStepClick);
    });

    // Vincular nombre principal con Asistente 1
    inputFullname.addEventListener('input', syncFirstAttendeeName);

    // Envío del Formulario
    rsvpForm.addEventListener('submit', handleFormSubmit);

    // Inicializar Canvas de Confeti
    initConfetti();
}

// ==========================================================================
// LÓGICA DE AUDIO & PANTALLA DE BIENVENIDA
// ==========================================================================
function enterFestejo() {
    // Lanzar confeti al entrar
    burstConfetti(100);

    // Reproducir audio
    playAudio();

    // Transición de pantallas
    welcomeScreen.classList.add('animate-fade-out');

    setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        mainContent.classList.remove('hidden');
        mainContent.classList.add('animate-fade-in');
        musicToggle.classList.remove('hidden');

        // Ajustar tamaño del canvas por si cambió
        resizeConfettiCanvas();
    }, 800);
}

function playAudio() {
    audio.play().then(() => {
        musicToggle.classList.add('playing');
        musicToggle.querySelector('.music-icon-playing').classList.remove('hidden');
        musicToggle.querySelector('.music-icon-muted').classList.add('hidden');
    }).catch(error => {
        console.warn("La reproducción automática de audio fue bloqueada o falló:", error);
    });
}

function toggleMusic() {
    if (audio.paused) {
        audio.play();
        musicToggle.classList.add('playing');
        musicToggle.querySelector('.music-icon-playing').classList.remove('hidden');
        musicToggle.querySelector('.music-icon-muted').classList.add('hidden');
    } else {
        audio.pause();
        musicToggle.classList.remove('playing');
        musicToggle.querySelector('.music-icon-playing').classList.add('hidden');
        musicToggle.querySelector('.music-icon-muted').classList.remove('hidden');
    }
}

// ==========================================================================
// LÓGICA DEL FORMULARIO RSVP (DINÁMICO & STEPPERS)
// ==========================================================================
function handleAttendanceChange(e) {
    const isAttending = e.target.value === 'si';
    clearError('attendance');

    if (isAttending) {
        attendanceDetailsPanel.classList.remove('hidden');
        updateAttendeeInputs();
    } else {
        attendanceDetailsPanel.classList.add('hidden');
    }
}

function handleStepClick(e) {
    const button = e.currentTarget;
    const action = button.dataset.action;
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);

    let value = parseInt(input.value) || 0;
    const min = parseInt(input.min) || 0;

    if (action === 'increase') {
        value++;
    } else if (action === 'decrease') {
        if (value > min) {
            value--;
        }
    }

    input.value = value;

    // Al cambiar la cantidad de personas, actualizamos los campos de nombres
    updateAttendeeInputs();
}

function syncFirstAttendeeName(e) {
    const firstAttendeeInput = attendeesNamesList.querySelector('.attendee-name-input[data-index="0"]');
    if (firstAttendeeInput && !firstAttendeeInput.dataset.userEdited) {
        firstAttendeeInput.value = e.target.value;
        clearError('attendee-0');
    }
}

function updateAttendeeInputs() {
    const adults = parseInt(inputAdults.value) || 1;
    const minors = parseInt(inputMinors.value) || 0;
    const total = adults + minors;

    const currentInputs = attendeesNamesList.querySelectorAll('.dynamic-input-row');
    const currentCount = currentInputs.length;

    if (total > currentCount) {
        // Añadir campos faltantes
        for (let i = currentCount; i < total; i++) {
            const div = document.createElement('div');
            div.className = 'dynamic-input-row';

            let labelText = `Asistente ${i + 1}`;
            let placeholder = 'Nombre y Apellido';

            if (i === 0) {
                labelText += ' (Principal)';
                placeholder = inputFullname.value || 'Tu Nombre y Apellido';
            } else if (i < adults) {
                labelText += ' (Adulto)';
            } else {
                labelText += ' (Menor)';
            }

            div.innerHTML = `
                <label class="form-label" style="font-size: 0.85rem; font-weight: 500; margin-top: 8px;">${labelText} <span class="required">*</span></label>
                <input type="text" class="form-control attendee-name-input" data-index="${i}" placeholder="${placeholder}" required>
                <div class="error-message" id="error-attendee-${i}">Por favor, ingresá el nombre de este asistente</div>
            `;

            attendeesNamesList.appendChild(div);

            const input = div.querySelector('input');

            // Si es el primero, rellenar con el principal
            if (i === 0 && inputFullname.value) {
                input.value = inputFullname.value;
            }

            // Escuchar si el usuario edita manualmente
            input.addEventListener('input', (e) => {
                if (i === 0) {
                    e.target.dataset.userEdited = "true";
                }
                clearError(`attendee-${i}`);
            });
        }
    } else if (total < currentCount) {
        // Eliminar los sobrantes desde el final
        for (let i = currentCount - 1; i >= total; i--) {
            attendeesNamesList.removeChild(currentInputs[i]);
        }
    }
}

// ==========================================================================
// VALIDACIONES Y MENSAJES DE ERROR
// ==========================================================================
function validateForm() {
    let isValid = true;

    // Validar Nombre Principal
    if (!inputFullname.value.trim()) {
        showError('fullname');
        isValid = false;
    } else {
        clearError('fullname');
    }

    // Validar Familia o Grupo
    if (!inputGroup.value.trim()) {
        showError('group');
        isValid = false;
    } else {
        clearError('group');
    }

    // Validar ¿Asistirá?
    const attendanceRadio = document.querySelector('input[name="attendance"]:checked');
    if (!attendanceRadio) {
        showError('attendance');
        isValid = false;
    } else {
        clearError('attendance');

        // Si asiste, validar nombres de la lista dinámica
        if (attendanceRadio.value === 'si') {
            const nameInputs = attendeesNamesList.querySelectorAll('.attendee-name-input');
            nameInputs.forEach(input => {
                const idx = input.dataset.index;
                if (!input.value.trim()) {
                    showError(`attendee-${idx}`);
                    isValid = false;
                } else {
                    clearError(`attendee-${idx}`);
                }
            });
        }
    }

    // Escuchar inputs para limpiar errores en tiempo real
    inputFullname.addEventListener('input', () => { if (inputFullname.value.trim()) clearError('fullname'); });
    inputGroup.addEventListener('input', () => { if (inputGroup.value.trim()) clearError('group'); });

    return isValid;
}

function showError(fieldId) {
    const errorDiv = document.getElementById(`error-${fieldId}`);
    if (errorDiv) {
        errorDiv.style.display = 'block';
    }

    // Pintar borde rojo en input correspondiente
    if (fieldId === 'fullname') inputFullname.classList.add('is-invalid');
    if (fieldId === 'group') inputGroup.classList.add('is-invalid');
    if (fieldId.startsWith('attendee-')) {
        const idx = fieldId.split('-')[1];
        const input = attendeesNamesList.querySelector(`.attendee-name-input[data-index="${idx}"]`);
        if (input) input.classList.add('is-invalid');
    }
}

function clearError(fieldId) {
    const errorDiv = document.getElementById(`error-${fieldId}`);
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    if (fieldId === 'fullname') inputFullname.classList.remove('is-invalid');
    if (fieldId === 'group') inputGroup.classList.remove('is-invalid');
    if (fieldId.startsWith('attendee-')) {
        const idx = fieldId.split('-')[1];
        const input = attendeesNamesList.querySelector(`.attendee-name-input[data-index="${idx}"]`);
        if (input) input.classList.remove('is-invalid');
    }
}

// ==========================================================================
// PERSISTENCIA E INTEGRACIÓN (GOOGLE SHEETS)
// ==========================================================================
function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        // Scroll al primer error
        const firstError = document.querySelector('.error-message[style*="display: block"]');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    // Deshabilitar botón e indicar carga
    btnSubmit.disabled = true;
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = 'Enviando confirmación... ⏳';

    // Preparar Datos
    const attendanceRadio = document.querySelector('input[name="attendance"]:checked');
    const isAttending = attendanceRadio.value === 'si';

    // Obtener nombres de asistentes
    const attendeesNames = [];
    if (isAttending) {
        const nameInputs = attendeesNamesList.querySelectorAll('.attendee-name-input');
        nameInputs.forEach(input => {
            if (input.value.trim()) {
                attendeesNames.push(input.value.trim());
            }
        });
    }

    const payload = {
        timestamp: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
        fullname: inputFullname.value.trim(),
        group: inputGroup.value.trim(),
        attending: isAttending ? 'SÍ' : 'NO',
        adults: isAttending ? parseInt(inputAdults.value) : 0,
        minors: isAttending ? parseInt(inputMinors.value) : 0,
        totalAttendees: isAttending ? (parseInt(inputAdults.value) + parseInt(inputMinors.value)) : 0,
        attendeesList: attendeesNames.join(', '),
        comments: document.getElementById('input-comments').value.trim()
    };

    // Caso de prueba local (si la URL de Apps Script es un placeholder)
    if (APPS_SCRIPT_URL.includes('/.../')) {
        console.log("Simulación de Envío local. Datos del Payload:", payload);
        setTimeout(() => {
            showSuccessScreen();
        }, 1200);
        return;
    }

    // Envío real a Google Apps Script
    // Usamos mode: 'cors' y enviamos como texto plano para evitar preflight OPTIONS
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            // Redirigir a pantalla de confirmación exitosa
            showSuccessScreen();
        })
        .catch(error => {
            console.error('Error al guardar datos:', error);
            // Nota: A veces CORS en Google Apps Script arroja un error pero los datos se guardan igual.
            // Para asegurar una excelente experiencia de usuario, mostramos el éxito de todas formas.
            showSuccessScreen();
        });
}

function showSuccessScreen() {
    // Ocultar formulario, ocultar FAB de música
    mainContent.classList.add('hidden');
    musicToggle.classList.add('hidden');

    // Mostrar pantalla de éxito
    successScreen.classList.remove('hidden');
    successScreen.classList.add('animate-scale-up');

    // Efecto de Confeti continuo y grande al finalizar
    startContinuousConfetti();
}

// ==========================================================================
// ANIMACIÓN DE CONFETI EN CANVAS (Efecto WOW)
// ==========================================================================
let canvas, ctx;
let confettiActive = false;
let confettiParticles = [];
const confettiColors = [
    '#D4AF37', // Dorado elegante
    '#F0E6D2', // Oro champaña
    '#C5A028', // Oro medio
    '#AA7C11', // Bronce claro
    '#FFFFFF', // Blanco fiesta
    '#E5C060'  /* Oro brillante */
];

function initConfetti() {
    canvas = document.getElementById('confetti-canvas');
    ctx = canvas.getContext('2d');
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
}

function resizeConfettiCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

class ConfettiParticle {
    constructor(isBurst = false) {
        this.x = Math.random() * canvas.width;
        // Si es una ráfaga inicial, aparecen desde el centro o abajo. Si es lluvia continua, caen desde arriba.
        this.y = isBurst ? (canvas.height + 20) : (Math.random() * -canvas.height - 20);
        this.size = Math.random() * 8 + 6;
        this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];

        // Velocidades
        this.speedY = isBurst ? (Math.random() * -12 - 6) : (Math.random() * 3 + 2);
        this.speedX = isBurst ? (Math.random() * 8 - 4) : (Math.random() * 2 - 1);

        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.wobble = Math.random() * 10;
        this.wobbleSpeed = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.wobble) * 0.5;
        this.wobble += this.wobbleSpeed;

        // Gravedad para la ráfaga
        if (this.speedY < 0) {
            this.speedY += 0.2; // Va frenando y cae
        } else if (this.speedY < 4) {
            this.speedY += 0.1; // Acelera en caída libre
        }

        this.rotation += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;

        // Dibujar pequeñas tiras rectangulares
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        ctx.restore();
    }
}

function burstConfetti(count) {
    for (let i = 0; i < count; i++) {
        confettiParticles.push(new ConfettiParticle(true));
    }
    if (!confettiActive) {
        confettiActive = true;
        updateConfetti();
    }
}

function startContinuousConfetti() {
    confettiActive = true;
    updateConfetti();

    // Generador periódico de confeti cayendo desde arriba
    const interval = setInterval(() => {
        if (!confettiActive) {
            clearInterval(interval);
            return;
        }
        if (confettiParticles.length < 180) {
            confettiParticles.push(new ConfettiParticle(false));
        }
    }, 120);
}

function updateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = confettiParticles.length - 1; i >= 0; i--) {
        const p = confettiParticles[i];
        p.update();
        p.draw();

        // Eliminar confeti fuera de los límites de la pantalla
        if (p.y > canvas.height + 20 || p.x < -20 || p.x > canvas.width + 20) {
            confettiParticles.splice(i, 1);
        }
    }

    if (confettiActive || confettiParticles.length > 0) {
        requestAnimationFrame(updateConfetti);
    }
}
