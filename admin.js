/**
 * Panel de Administración - Cumpleaños 80 de Cacho
 * Script del Dashboard (Autenticación, Estadísticas y Renderizado de Listado Expandible con soporte Híbrido Fetch/JSONP)
 */

// ==========================================================================
// CONFIGURACIÓN GLOBAL
// ==========================================================================
// Reemplaza esta URL con la misma URL de tu Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzJRGo_KbXdrRiQ99Z0h55gJreTJFs0emuivgeTuN_PboM-CYgPY6rpNqFGeFqzfdd3/exec';

// ==========================================================================
// ESTADO DE LA APLICACIÓN
// ==========================================================================
let guestsData = [];
let activeFilter = 'all';
let searchQuery = '';
let currentPassword = '';
let tempInputPassword = ''; // Almacenamiento temporal para login JSONP

// Elementos DOM
let loginScreen, dashboardScreen, loginForm, passwordInput, loginError;
let statTotalConfirmed, statAdults, statMinors, statDeclined;
let searchInput, filterButtons, guestsListContainer, btnRefresh, btnLogout;
let countAll, countYes, countNo;

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initAdmin();
});

function initAdmin() {
    // Referencias DOM
    loginScreen = document.getElementById('admin-login-screen');
    dashboardScreen = document.getElementById('admin-dashboard');
    loginForm = document.getElementById('admin-login-form');
    passwordInput = document.getElementById('admin-password');
    loginError = document.getElementById('login-error-msg');

    statTotalConfirmed = document.getElementById('stat-total-confirmed');
    statAdults = document.getElementById('stat-adults');
    statMinors = document.getElementById('stat-minors');
    statDeclined = document.getElementById('stat-declined');

    searchInput = document.getElementById('admin-search-input');
    filterButtons = document.querySelectorAll('.btn-filter');
    guestsListContainer = document.getElementById('guests-list');

    btnRefresh = document.getElementById('btn-refresh');
    btnLogout = document.getElementById('btn-logout');

    countAll = document.getElementById('count-all');
    countYes = document.getElementById('count-yes');
    countNo = document.getElementById('count-no');

    // Eventos
    loginForm.addEventListener('submit', handleLoginSubmit);
    btnLogout.addEventListener('click', handleLogout);
    btnRefresh.addEventListener('click', () => fetchGuests(currentPassword));

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderDashboard();
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            activeFilter = e.currentTarget.dataset.filter;
            renderDashboard();
        });
    });

    // Registrar Callbacks Globales para JSONP
    registerCallbacks();

    // Auto-login si ya existe contraseña en sesión
    const savedPassword = sessionStorage.getItem('admin_password');
    if (savedPassword) {
        loginWithPassword(savedPassword);
    }
}

// ==========================================================================
// REGISTRO DE CALLBACKS JSONP (Esencial para evitar CORS en local file://)
// ==========================================================================
function registerCallbacks() {
    // Callback para el Login
    window.handleLoginResponse = function (res) {
        const tempScript = document.getElementById('jsonp-login-script');
        if (tempScript) tempScript.remove();

        if (res.status === 'success') {
            currentPassword = tempInputPassword;
            sessionStorage.setItem('admin_password', currentPassword);

            loginScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');

            guestsData = res.data || [];
            renderDashboard();
        } else {
            showLoginError(res.message || 'Contraseña incorrecta.');
        }
    };

    // Callback para el Refrescar
    window.handleRefreshResponse = function (res) {
        const tempScript = document.getElementById('jsonp-refresh-script');
        if (tempScript) tempScript.remove();

        btnRefresh.disabled = false;
        btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Actualizar';

        if (res.status === 'success') {
            guestsData = res.data || [];
            renderDashboard();
        } else {
            alert('Sesión expirada o contraseña inválida.');
            handleLogout();
        }
    };
}

// ==========================================================================
// AUTENTICACIÓN
// ==========================================================================
function handleLoginSubmit(e) {
    e.preventDefault();
    const password = passwordInput.value.trim();
    if (password) {
        loginWithPassword(password);
    }
}

function loginWithPassword(password) {
    loginError.style.display = 'none';

    // Si la URL es un placeholder, simulamos acceso exitoso para pruebas locales
    if (APPS_SCRIPT_URL.includes('/.../')) {
        console.log("Simulando inicio de sesión en local con contraseña...");
        setTimeout(() => {
            currentPassword = password;
            sessionStorage.setItem('admin_password', password);
            loginScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');

            // Cargar datos simulados
            guestsData = getMockData();
            renderDashboard();
        }, 800);
        return;
    }

    tempInputPassword = password;

    guestsListContainer.innerHTML = `
        <div class="list-info-message">Validando contraseña... ⏳</div>
    `;

    // Si estamos en un servidor web o localhost, preferimos Fetch estándar con CORS
    if (window.location.protocol !== 'file:') {
        const verifyUrl = `${APPS_SCRIPT_URL}?password=${encodeURIComponent(password)}`;
        fetch(verifyUrl, { method: 'GET', mode: 'cors' })
            .then(response => response.json())
            .then(res => {
                if (res.status === 'success') {
                    currentPassword = password;
                    sessionStorage.setItem('admin_password', password);
                    loginScreen.classList.add('hidden');
                    dashboardScreen.classList.remove('hidden');
                    guestsData = res.data || [];
                    renderDashboard();
                } else {
                    showLoginError(res.message || 'Contraseña incorrecta.');
                }
            })
            .catch(err => {
                console.warn('Error en Fetch estándar, intentando fallback a JSONP:', err);
                executeLoginJSONP(password);
            });
    } else {
        // En protocolo local file:// (doble clic) forzamos JSONP directamente
        executeLoginJSONP(password);
    }
}

function executeLoginJSONP(password) {
    const oldScript = document.getElementById('jsonp-login-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'jsonp-login-script';
    script.src = `${APPS_SCRIPT_URL}?password=${encodeURIComponent(password)}&callback=handleLoginResponse`;

    script.onerror = () => {
        script.remove();
        showLoginError('Error de conexión. Asegúrese de que la URL de Apps Script sea correcta y de haber implementado la NUEVA versión del script en Google Sheets.');
    };

    document.head.appendChild(script);
}

function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';

    guestsListContainer.innerHTML = `
        <div class="list-info-message">Por favor, inicie sesión primero.</div>
    `;
}

function handleLogout() {
    sessionStorage.removeItem('admin_password');
    currentPassword = '';
    guestsData = [];

    passwordInput.value = '';
    dashboardScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
}

// ==========================================================================
// CARGAR DATOS (REFRESH CON SOPORTE HÍBRIDO)
// ==========================================================================
function fetchGuests(password) {
    if (APPS_SCRIPT_URL.includes('/.../')) {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" style="margin-right: 6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Actualizando...';
        setTimeout(() => {
            guestsData = getMockData();
            renderDashboard();
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Actualizar';
        }, 800);
        return;
    }

    btnRefresh.disabled = true;
    btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" style="margin-right: 6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Actualizando...';

    // Si estamos en un servidor web, preferimos Fetch
    if (window.location.protocol !== 'file:') {
        const fetchUrl = `${APPS_SCRIPT_URL}?password=${encodeURIComponent(password)}`;
        fetch(fetchUrl, { method: 'GET', mode: 'cors' })
            .then(response => response.json())
            .then(res => {
                btnRefresh.disabled = false;
                btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Actualizar';
                if (res.status === 'success') {
                    guestsData = res.data || [];
                    renderDashboard();
                } else {
                    alert('Sesión expirada o contraseña inválida.');
                    handleLogout();
                }
            })
            .catch(err => {
                console.warn('Error en Fetch estándar al actualizar, intentando fallback JSONP:', err);
                executeRefreshJSONP(password);
            });
    } else {
        // En protocolo local file:// usamos JSONP
        executeRefreshJSONP(password);
    }
}

function executeRefreshJSONP(password) {
    const oldScript = document.getElementById('jsonp-refresh-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'jsonp-refresh-script';
    script.src = `${APPS_SCRIPT_URL}?password=${encodeURIComponent(password)}&callback=handleRefreshResponse`;

    script.onerror = () => {
        script.remove();
        btnRefresh.disabled = false;
        btnRefresh.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg> Actualizar';
        alert('Error de conexión al intentar actualizar los datos. Verifique la URL de su Apps Script.');
    };

    document.head.appendChild(script);
}

// ==========================================================================
// CÁLCULO DE ESTADÍSTICAS Y RENDERIZADO (LISTA EXPANDIBLE COMPACTA)
// ==========================================================================
function renderDashboard() {
    let totalConfirmed = 0;
    let totalAdults = 0;
    let totalMinors = 0;
    let totalDeclined = 0;

    let countAllTotal = guestsData.length;
    let countYesTotal = 0;
    let countNoTotal = 0;

    guestsData.forEach(g => {
        const attends = g['Asiste'] === 'SÍ' || g['attending'] === 'SÍ';
        if (attends) {
            countYesTotal++;
            const adults = parseInt(g['Cantidad de Adultos'] || g['adults']) || 0;
            const minors = parseInt(g['Cantidad de Menores'] || g['minors']) || 0;

            totalAdults += adults;
            totalMinors += minors;
            totalConfirmed += (adults + minors);
        } else {
            countNoTotal++;
            totalDeclined++;
        }
    });

    countAll.textContent = countAllTotal;
    countYes.textContent = countYesTotal;
    countNo.textContent = countNoTotal;

    statTotalConfirmed.textContent = totalConfirmed;
    statAdults.textContent = totalAdults;
    statMinors.textContent = totalMinors;
    statDeclined.textContent = totalDeclined;

    const filteredGuests = guestsData.filter(g => {
        const attends = g['Asiste'] === 'SÍ' || g['attending'] === 'SÍ';

        if (activeFilter === 'yes' && !attends) return false;
        if (activeFilter === 'no' && attends) return false;

        const name = (g['Nombre Principal'] || g['fullname'] || '').toLowerCase();
        const group = (g['Familia'] || g['Familia o Grupo'] || g['group'] || '').toLowerCase();
        const comments = (g['Comentarios'] || g['comments'] || '').toLowerCase();

        const matchesSearch = name.includes(searchQuery) ||
            group.includes(searchQuery) ||
            comments.includes(searchQuery);

        return matchesSearch;
    });

    guestsListContainer.innerHTML = '';

    if (filteredGuests.length === 0) {
        guestsListContainer.innerHTML = `
            <div class="list-info-message">No se encontraron confirmaciones.</div>
        `;
        return;
    }

    const displayList = [...filteredGuests].reverse();

    displayList.forEach((g, idx) => {
        const timestamp = g['Fecha y Hora'] || g['timestamp'] || '-';
        const name = g['Nombre Principal'] || g['fullname'] || '-';
        const group = g['Familia'] || g['Familia o Grupo'] || g['group'] || '-';
        const attends = g['Asiste'] === 'SÍ' || g['attending'] === 'SÍ';
        const adults = attends ? parseInt(g['Cantidad de Adultos'] || g['adults'] || 0) : 0;
        const minors = attends ? parseInt(g['Cantidad de Menores'] || g['minors'] || 0) : 0;
        const attendeesList = attends ? (g['Lista de Asistentes'] || g['attendeesList'] || '-') : '-';
        const comments = g['Comentarios'] || g['comments'] || '';

        const badgeClass = attends ? 'badge-yes' : 'badge-no';
        const totalPeople = adults + minors;
        const badgeText = attends ? (totalPeople === 1 ? '1 asistente' : `${totalPeople} asistentes`) : 'No asistirá';

        const card = document.createElement('div');
        card.className = 'guest-card';
        card.dataset.index = idx;

        const hasDetails = attends || comments.trim().length > 0;

        card.innerHTML = `
            <div class="guest-card-header">
                <div class="guest-primary-info">
                    <span class="guest-card-title">${name}</span>
                    <span class="guest-card-subtitle">${group}</span>
                </div>
                <div class="guest-card-status-wrapper">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                    ${hasDetails ? `
                        <span class="guest-card-arrow-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </span>
                    ` : ''}
                </div>
            </div>
            ${hasDetails ? `
                <div class="guest-card-details">
                    <div class="guest-details-inner">
                        <div class="details-meta-grid">
                            <div class="meta-item">
                                <span class="meta-label">Fecha de Envío:</span>
                                <span class="meta-val">${timestamp}</span>
                            </div>
                            ${attends ? `
                                <div class="meta-item">
                                    <span class="meta-label">Distribución:</span>
                                    <span class="meta-val">${adults} Adultos / ${minors} Menores</span>
                                </div>
                            ` : ''}
                        </div>
                        ${attends && attendeesList !== '-' ? `
                            <div class="details-full-list">
                                <span class="meta-label">Nombres de Asistentes:</span>
                                <p class="meta-val-paragraph">${attendeesList}</p>
                            </div>
                        ` : ''}
                        ${comments.trim() ? `
                            <div class="details-comments">
                                <span class="meta-label">Comentarios / Observaciones:</span>
                                <p class="meta-val-paragraph italic">"${comments}"</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        `;

        if (hasDetails) {
            card.addEventListener('click', (e) => {
                if (window.getSelection().toString()) return;

                const details = card.querySelector('.guest-card-details');
                const arrow = card.querySelector('.guest-card-arrow-icon');
                const isExpanded = card.classList.toggle('is-expanded');

                if (isExpanded) {
                    details.style.maxHeight = details.scrollHeight + 'px';
                    arrow.classList.add('rotate');
                } else {
                    details.style.maxHeight = '0';
                    arrow.classList.remove('rotate');
                }
            });
        }

        guestsListContainer.appendChild(card);
    });
}

// ==========================================================================
// DATOS SIMULADOS DE MOCK
// ==========================================================================
function getMockData() {
    return [
        {
            "Fecha y Hora": "11/6/2026, 09:12:05",
            "Nombre Principal": "Juan Manuel Pérez",
            "Familia": "Familia Pérez",
            "Asiste": "SÍ",
            "Cantidad de Adultos": 2,
            "Cantidad de Menores": 1,
            "Total Asistentes": 3,
            "Lista de Asistentes": "Juan Manuel Pérez, María Laura Pérez, Tobías Pérez",
            "Comentarios": "Tobías es intolerante a la lactosa, por las dudas."
        },
        {
            "Fecha y Hora": "11/6/2026, 09:30:11",
            "Nombre Principal": "Marta Hoffmann",
            "Familia": "Familia Hoffmann",
            "Asiste": "SÍ",
            "Cantidad de Adultos": 2,
            "Cantidad de Menores": 0,
            "Total Asistentes": 2,
            "Lista de Asistentes": "Marta Hoffmann, Hugo Hoffmann",
            "Comentarios": "Con muchas ganas de brindar."
        },
        {
            "Fecha y Hora": "11/6/2026, 09:45:00",
            "Nombre Principal": "Roberto Gómez",
            "Familia": "Amigos del Club",
            "Asiste": "SÍ",
            "Cantidad de Adultos": 1,
            "Cantidad de Menores": 0,
            "Total Asistentes": 1,
            "Lista de Asistentes": "Roberto Gómez",
            "Comentarios": "Llego un poquito tarde porque trabajo ese sábado. ¡Abrazo!"
        },
        {
            "Fecha y Hora": "11/6/2026, 10:02:40",
            "Nombre Principal": "Clara de la Vega",
            "Familia": "Vecinos de la Infancia",
            "Asiste": "NO",
            "Cantidad de Adultos": 0,
            "Cantidad de Menores": 0,
            "Total Asistentes": 0,
            "Lista de Asistentes": "",
            "Comentarios": "No voy a poder estar por un viaje planificado. Te mando un beso gigante."
        },
        {
            "Fecha y Hora": "11/6/2026, 10:15:33",
            "Nombre Principal": "Estela Rodríguez",
            "Familia": "Primos Rodríguez",
            "Asiste": "SÍ",
            "Cantidad de Adultos": 3,
            "Cantidad de Menores": 2,
            "Total Asistentes": 5,
            "Lista de Asistentes": "Estela Rodríguez, Carlos Rodríguez, Javier Rodríguez, Lucas Rodríguez, Sofía Rodríguez",
            "Comentarios": "Lucas es vegetariano."
        }
    ];
}
