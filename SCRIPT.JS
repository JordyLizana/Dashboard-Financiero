// ==================================================
// ARCHIVO: /FRONTEND/JS/SCRIPT.JS
// *** VERSIÓN COMPLETA Y ACTUALIZADA ***
// Incluye: Loader, Filtros, Persistencia PDF, etc.
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Cargado. Iniciando Finanzas App...");

    // --- 1. VERIFICACIÓN DE AUTENTICACIÓN (SIMULADA) ---
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userEmail = localStorage.getItem('loggedInUserEmail') || 'Usuario'; // Obtener email ANTES de redirigir

    // Seleccionar el loader TEMPRANO por si hay error antes de la inicialización completa
    const loader = document.getElementById('page-loader');

    if (!isLoggedIn) {
        console.warn("Usuario NO logueado. Redirigiendo a login.html...");
        if(loader) loader.remove(); // Ocultar rápido si no está logueado
        window.location.href = 'login.html'; // Ajusta ruta si es necesario
        return; // Detener ejecución si no está logueado
    }
    console.log(`Usuario logueado: ${userEmail}`);

    // --- 2. VARIABLES GLOBALES ---
    let transactions = [];
    let monthlyChart = null;
    let categoryChart = null;
    const momentIsLoaded = typeof moment !== 'undefined';
    if (momentIsLoaded) moment.locale('es'); // Set Moment.js locale to Spanish
    const categoryColors = ['#7F56D9', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#FF9F40', '#9966FF', '#FF6347'];
    let cssColors = { income: '#10b981', expense: '#ef4444', accent: '#6d28d9', textSecondary: '#6b7280', textMuted: '#9ca3af', surface: '#ffffff', border: '#e5e7eb', textPrimary: '#1f2937' };
    try {
        const rs = getComputedStyle(document.documentElement);
        // Helper para obtener color o fallback
        const getColor = (varName, fallback) => rs.getPropertyValue(varName).trim() || fallback;
        cssColors = {
            income: getColor('--color-income', cssColors.income),
            expense: getColor('--color-expense', cssColors.expense),
            accent: getColor('--color-accent', cssColors.accent),
            textPrimary: getColor('--color-text-primary', cssColors.textPrimary),
            textSecondary: getColor('--color-text-secondary', cssColors.textSecondary),
            textMuted: getColor('--color-text-muted', cssColors.textMuted),
            surface: getColor('--color-surface', cssColors.surface),
            border: getColor('--color-border', cssColors.border),
        };
    } catch(e){ console.warn("No se pudieron leer las variables de color CSS.", e)}
    const reportsStorageKey = `financeAppReports_${userEmail}`;

    // --- 3. SELECCIÓN DE ELEMENTOS DOM ---
    console.log("Seleccionando elementos DOM...");
    const welcomeMessageElement = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const transactionForm = document.getElementById('transaction-form');
    const typeIncomeRadio = transactionForm?.querySelector('input[name="type"][value="income"]');
    const typeExpenseRadio = transactionForm?.querySelector('input[name="type"][value="expense"]');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const categoryGroup = document.getElementById('category-group');
    const categorySelect = document.getElementById('category'); // Select del formulario
    const dateInput = document.getElementById('date');
    const descriptionError = document.getElementById('description-error');
    const amountError = document.getElementById('amount-error');
    const categoryError = document.getElementById('category-error');
    const dateError = document.getElementById('date-error');
    const currentBalanceEl = document.getElementById('current-balance');
    const monthlyIncomeEl = document.getElementById('monthly-income');
    const monthlyExpenseEl = document.getElementById('monthly-expense');
    const monthlyBalanceEl = document.getElementById('monthly-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const transactionList = document.getElementById('transaction-list');
    const emptyListMessage = transactionList?.querySelector('.empty-list'); // Mensaje original
    const transactionTemplate = transactionList?.querySelector('.transaction-item.template');
    const monthlyChartCtx = document.getElementById('monthly-summary-chart')?.getContext('2d');
    const categoryChartCtx = document.getElementById('expense-category-chart')?.getContext('2d');
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    const dashboardGrid = document.querySelector('.dashboard-grid');
    const spaSections = document.querySelectorAll('.content-section');
    const openChatbotBtn = document.getElementById('open-chatbot');
    const closeChatbotBtn = document.getElementById('close-chatbot');
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotMessages = document.querySelector('.chatbot-messages');
    const chatbotInput = document.getElementById('chatbot-message-input');
    const sendChatbotBtn = document.getElementById('send-chatbot-message');
    const downloadedReportsList = document.getElementById('downloaded-reports-list');
    const emptyDownloadListMessage = downloadedReportsList?.querySelector('.empty-download-list');
    const filterTypeRadios = document.querySelectorAll('input[name="filterType"]');
    const filterCategorySelect = document.getElementById('filter-category'); // Select del filtro
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const emptyFilteredListMessage = transactionList?.querySelector('.empty-list'); // Reutilizamos el mensaje li.empty-list

    // Verificar elementos clave
    if (!welcomeMessageElement || !transactionForm || !transactionList || !monthlyChartCtx || !filterTypeRadios.length || !filterCategorySelect || !resetFiltersBtn) {
        console.error("¡Error Crítico! No se encontraron algunos elementos DOM esenciales. Verifica tu HTML.");
        if(loader) loader.remove(); // Ocultar loader si hay error grave
        alert("Error al cargar la interfaz. Faltan elementos HTML.");
        return;
    }
    console.log("Selectores DOM principales OK.");

    // ==================================================
    // --- 4. FUNCIONES AUXILIARES (Datos, Formato, Fechas) ---
    // ==================================================
    /** Carga transacciones desde localStorage */
    function loadTransactions() {
        let loadedData = [];
        try {
            const storedString = localStorage.getItem('financeDashboardTransactions');
            if (storedString) {
                const parsedData = JSON.parse(storedString);
                if (Array.isArray(parsedData)) {
                    // Validar y mapear cada transacción
                    loadedData = parsedData.map(t => ({
                        id: t.id || Date.now() + Math.random().toString(16).slice(2, 8), // Generar ID si falta
                        type: ['income', 'expense'].includes(t.type) ? t.type : 'expense', // Default a gasto si inválido
                        description: String(t.description || 'Sin descripción').slice(0, 100), // Max 100 chars
                        amount: Math.abs(Number(t.amount)) || 0, // Asegurar número positivo
                        category: (t.type === 'expense' && t.category) ? String(t.category) : null, // Categoría solo para gastos
                        date: String(t.date || '').match(/^\d{4}-\d{2}-\d{2}$/) ? t.date : new Date().toISOString().slice(0, 10) // Validar formato fecha o usar hoy
                    })).filter(t => t.date && t.amount > 0); // Filtrar inválidos básicos
                }
            }
        } catch (e) {
            console.error("Error cargando o parseando transacciones desde localStorage:", e);
            localStorage.removeItem('financeDashboardTransactions'); // Limpiar si hay error
        }
        // Ordenar por fecha descendente (más nuevo primero)
        loadedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        return loadedData;
    }

    /** Guarda transacciones en localStorage */
    function saveTransactions() {
        try {
            localStorage.setItem('financeDashboardTransactions', JSON.stringify(transactions));
        } catch (e) {
            console.error("Error guardando transacciones en localStorage:", e);
            alert("Error: No se pudieron guardar las transacciones. Es posible que el almacenamiento esté lleno.");
        }
    }

    /** Formatea un número como moneda CLP */
    function formatCurrencyCLP(amount) {
        if (isNaN(amount)) return '$?';
        // Usar Intl.NumberFormat para mejor formato y opciones futuras
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
    }

    /** Formatea fecha (string YYYY-MM-DD o timestamp) a formato legible */
    function formatDate(dStrOrTs, format = 'DD MMM YYYY') {
        if (!dStrOrTs) return '';
        try {
            // Usar Moment.js si está disponible
            if (momentIsLoaded) {
                const dateMoment = typeof dStrOrTs === 'number' ? moment(dStrOrTs) : moment(dStrOrTs, 'YYYY-MM-DD');
                return dateMoment.isValid() ? dateMoment.format(format) : String(dStrOrTs);
            }
            // Fallback sin Moment.js
            else {
                const d = typeof dStrOrTs === 'number' ? new Date(dStrOrTs) : new Date(dStrOrTs + 'T00:00:00');
                if (isNaN(d.getTime())) return String(dStrOrTs);

                const options = { year: 'numeric', month: 'short', day: 'numeric' };
                if (format.includes('HH:mm')) {
                    options.hour = '2-digit';
                    options.minute = '2-digit';
                    options.hour12 = false;
                }
                return d.toLocaleDateString('es-CL', options);
            }
        } catch (e) {
            console.error("Error formateando fecha:", dStrOrTs, e);
            return String(dStrOrTs); // Devolver input original en caso de error
        }
    }

    /** Obtiene YYYY-MM de una fecha string */
    function getYearMonth(dStr) {
        try {
            if (!dStr || typeof dStr !== 'string' || !dStr.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
            if (momentIsLoaded) return moment(dStr).format('YYYY-MM');
            else return dStr.substring(0, 7); // YYYY-MM
        } catch (e) { return null; }
    }

    /** Obtiene objeto Date del primer día del mes de una fecha string */
    function getStartOfMonthDate(dStr) {
        try {
            if (!dStr || typeof dStr !== 'string' || !dStr.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
            if (momentIsLoaded) return moment(dStr).startOf('month').toDate();
            else { const d = new Date(dStr + 'T00:00:00'); return new Date(d.getFullYear(), d.getMonth(), 1); }
        } catch (e) { return null; }
    }

    /** Obtiene rango de fechas (inicio y fin) para el mes actual */
    function getCurrentMonthRange() {
        try {
            if (momentIsLoaded) return { start: moment().startOf('month').toDate(), end: moment().endOf('month').toDate() };
            else { const n = new Date(); const s = new Date(n.getFullYear(), n.getMonth(), 1); const e = new Date(n.getFullYear(), n.getMonth() + 1, 0); e.setHours(23, 59, 59, 999); return { start: s, end: e }; }
        } catch (e) { const n = new Date(); return { start: n, end: n }; }
    }

    /** Verifica si una fecha (string) está entre dos fechas (Date) */
    function isDateBetween(dCheckStr, dStart, dEnd) {
        if (!dCheckStr || !dStart || !dEnd) return false;
        try {
            if (momentIsLoaded) return moment(dCheckStr).isBetween(moment(dStart), moment(dEnd), 'day', '[]'); // Inclusive []
            else { const dc = new Date(dCheckStr + 'T00:00:00').getTime(); const s = dStart.getTime(); let eEnd = new Date(dEnd); eEnd.setHours(23, 59, 59, 999); const et = eEnd.getTime(); return !isNaN(dc) && !isNaN(s) && !isNaN(et) && dc >= s && dc <= et; }
        } catch (e) { return false; }
    }

    /** Establece la fecha actual en el input de fecha del formulario */
    function setDefaultDate() {
        if (dateInput) {
            try {
                const today = new Date();
                // Ajustar por zona horaria para obtener YYYY-MM-DD local correcto
                today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
                dateInput.value = today.toISOString().slice(0, 10);
            } catch (e) {
                console.error("Error setting default date:", e);
                // Fallback muy básico
                const y = new Date().getFullYear();
                const m = (new Date().getMonth() + 1).toString().padStart(2, '0');
                const d = new Date().getDate().toString().padStart(2, '0');
                dateInput.value = `${y}-${m}-${d}`;
            }
        }
    }

    /** Carga la lista de reportes guardados desde localStorage */
    function loadPersistedReports() {
        if (!downloadedReportsList || !emptyDownloadListMessage) return;
        console.log(`[Reports] Cargando reportes guardados para ${userEmail} desde ${reportsStorageKey}...`);
        downloadedReportsList.querySelectorAll('li:not(.empty-download-list)').forEach(li => li.remove());

        let storedReports = [];
        try {
            const data = localStorage.getItem(reportsStorageKey);
            if (data) { storedReports = JSON.parse(data); if (!Array.isArray(storedReports)) storedReports = []; }
        } catch (e) { console.error(`Error cargando/parseando reportes (${reportsStorageKey}):`, e); storedReports = []; }

        emptyDownloadListMessage.classList.toggle('hidden', storedReports.length > 0);

        if (storedReports.length > 0) {
            storedReports.sort((a, b) => b.timestamp - a.timestamp); // Ordenar por fecha de generación
            storedReports.forEach(reportData => {
                try {
                    if (!reportData || !reportData.filename || !reportData.timestamp || !reportData.transactionsSnapshot) {
                        console.warn("Skipping invalid report data found in storage:", reportData);
                        return; // Saltar este registro si es inválido
                    }
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = "#";
                    link.textContent = reportData.filename;

                    const timestampSpan = document.createElement('span');
                    timestampSpan.className = 'report-timestamp';
                    timestampSpan.textContent = `Generado: ${formatDate(reportData.timestamp, 'DD MMM YYYY, HH:mm')}`;

                    link.appendChild(timestampSpan);
                    link.dataset.reportData = JSON.stringify(reportData); // Guardar datos completos

                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log(`[Reports] Click para regenerar: ${reportData.filename}`);
                        try {
                            const dataToRegenerate = JSON.parse(e.currentTarget.dataset.reportData);
                            regenerateAndDownloadReport(dataToRegenerate); // Llamar directamente
                        } catch (parseError) {
                            console.error("Error al parsear datos del reporte para regeneración:", parseError);
                            alert("Error interno al intentar regenerar el reporte.");
                        }
                    });
                    li.appendChild(link);
                    downloadedReportsList.appendChild(li);
                } catch (renderError) { console.error("Error renderizando item de reporte guardado:", reportData, renderError); }
            });
        }
        console.log(`[Reports] ${storedReports.length} reportes cargados.`);
    }

    // ==================================================
    // --- 5. LÓGICA DEL FORMULARIO ---
    // ==================================================
    /** Limpia los mensajes de error y estilos inválidos del formulario */
    function clearErrors() {
        transactionForm?.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        transactionForm?.querySelectorAll('.error-message').forEach(el => { el.textContent = ''; });
    }

    /** Muestra un mensaje de error para un campo específico */
    function displayError(fieldId, message) {
        const inputElement = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (inputElement) inputElement.classList.add('is-invalid'); // Marcar input
        if (errorElement) errorElement.textContent = message; // Mostrar mensaje
        else console.warn(`Elemento de error no encontrado para ${fieldId}-error`);
    }

    /** Valida los campos del formulario de transacción */
    function validateForm() {
        clearErrors();
        let isValid = true;
        const type = transactionForm.elements.type.value;
        const description = descriptionInput.value.trim();
        const amountStr = amountInput.value;
        const date = dateInput.value;
        const category = categorySelect.value;

        if (!description) { displayError('description', 'La descripción es obligatoria.'); isValid = false; }
        if (!amountStr) { displayError('amount', 'El monto es obligatorio.'); isValid = false; }
        else { const amount = parseFloat(amountStr); if (isNaN(amount) || amount <= 0) { displayError('amount', 'El monto debe ser un número mayor a 0.'); isValid = false; } }
        if (!date) { displayError('date', 'La fecha es obligatoria.'); isValid = false; }
        else if (new Date(date) > new Date()) { displayError('date', 'La fecha no puede ser futura.'); isValid = false; } // Validación fecha futura
        if (type === 'expense' && !category) { displayError('category', 'La categoría es obligatoria para gastos.'); isValid = false; }

        return isValid;
    }

    /** Muestra u oculta el campo de categoría según el tipo seleccionado */
    function toggleCategory() {
        const isExpense = typeExpenseRadio?.checked;
        categoryGroup?.classList.toggle('hidden', !isExpense);
        if (categorySelect) {
            categorySelect.disabled = !isExpense;
            categorySelect.required = isExpense;
            if (!isExpense) {
                categorySelect.value = ""; // Limpiar si se cambia a ingreso
                if (categorySelect.classList.contains('is-invalid')) {
                    categorySelect.classList.remove('is-invalid');
                    categoryError.textContent = '';
                }
            }
        }
    }

    /** Añade una nueva transacción */
    function addTransaction(event) {
        event.preventDefault();
        if (!validateForm()) return;

        try {
            const type = transactionForm.elements.type.value;
            const description = descriptionInput.value.trim();
            const amount = parseFloat(amountInput.value);
            const category = type === 'expense' ? categorySelect.value : null;
            const date = dateInput.value;

            const newTransaction = {
                id: Date.now().toString(36) + Math.random().toString(16).slice(2), // ID más único
                type, description, amount, category, date
            };

            transactions.unshift(newTransaction); // Añadir al inicio
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date)); // Re-ordenar
            saveTransactions();

            updateUI(); // Actualizar resumen y gráficos
            applyFiltersAndUpdateList(); // Actualizar lista de transacciones (aplicando filtros)

            transactionForm.reset();
            setDefaultDate(); // Poner fecha actual de nuevo
            toggleCategory(); // Asegurar estado correcto del select
            descriptionInput.focus(); // Foco en descripción para siguiente entrada

            console.log("Transacción agregada:", newTransaction);
        } catch (e) {
            console.error("Error en addTransaction:", e);
            alert("Hubo un error al guardar la transacción.");
        }
    }

    // ==================================================
    // --- 6. LÓGICA DE ACTUALIZACIÓN DE UI ---
    // ==================================================

    /** Calcula métricas clave (totales, mes actual, balance) */
    function calculateMetrics(transactionsData) {
        let totalIncome = 0, totalExpense = 0, currentMonthIncome = 0, currentMonthExpense = 0;
        const monthRange = getCurrentMonthRange();
        if (!Array.isArray(transactionsData)) transactionsData = [];

        transactionsData.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;

            if (isDateBetween(t.date, monthRange.start, monthRange.end)) {
                if (t.type === 'income') currentMonthIncome += t.amount;
                else currentMonthExpense += t.amount;
            }
        });

        const currentBalance = totalIncome - totalExpense;
        const monthlyBalance = currentMonthIncome - currentMonthExpense;

        return {
            totalIncome, totalExpense, currentBalance,
            currentMonthIncome, currentMonthExpense, monthlyBalance
        };
    }

    /** Actualiza la sección de resumen en el DOM */
    function updateSummary(metrics) {
        if (!currentBalanceEl || !totalIncomeEl || !totalExpenseEl || !monthlyIncomeEl || !monthlyExpenseEl || !monthlyBalanceEl) {
             console.warn("Elementos del resumen no encontrados en el DOM."); return;
        }
        try {
            currentBalanceEl.textContent = formatCurrencyCLP(metrics.currentBalance);
            currentBalanceEl.style.color = metrics.currentBalance >= 0 ? cssColors.accent : cssColors.expense;
            totalIncomeEl.textContent = formatCurrencyCLP(metrics.totalIncome);
            totalExpenseEl.textContent = formatCurrencyCLP(metrics.totalExpense);
            monthlyIncomeEl.textContent = formatCurrencyCLP(metrics.currentMonthIncome);
            monthlyExpenseEl.textContent = formatCurrencyCLP(metrics.currentMonthExpense);
            monthlyBalanceEl.textContent = formatCurrencyCLP(metrics.monthlyBalance);
            monthlyBalanceEl.style.color = metrics.monthlyBalance >= 0 ? cssColors.income : cssColors.expense;
        } catch (e) { console.error("Error actualizando resumen:", e); }
    }

    /** Actualiza los gráficos */
    function updateCharts() {
        try {
            const monthlyData = groupTransactionsByMonth(transactions, 6); // Últimos 6 meses
            const categoryData = groupExpensesByCategoryCurrentMonth(transactions); // Mes actual
            renderMonthlySummaryChart(monthlyData);
            renderExpenseCategoryChart(categoryData);
        } catch (e) { console.error("Error actualizando gráficos:", e); }
    }

    /** Actualiza la lista de transacciones en el DOM aplicando filtros */
    function updateTransactionList() {
        if (!transactionList || !transactionTemplate || !filterTypeRadios || !filterCategorySelect || !emptyFilteredListMessage) {
            console.warn("Elementos necesarios para la lista de transacciones/filtros no encontrados.");
            return;
        }
        console.log('[UI] Actualizando lista de transacciones con filtros...');

        // 1. Obtener valores actuales de los filtros
        const selectedType = document.querySelector('input[name="filterType"]:checked')?.value || 'all';
        const selectedCategory = filterCategorySelect.value || 'all';
        console.log(` - Filtro Tipo: ${selectedType}, Filtro Categoría: ${selectedCategory}`);

        // 2. Filtrar transacciones
        const filteredTransactions = transactions.filter(t => {
            const typeMatch = selectedType === 'all' || t.type === selectedType;
            if (!typeMatch) return false;
            // Aplicar filtro de categoría solo si se seleccionó Gasto (o Todos) y una categoría específica
            if ((t.type === 'expense' && selectedType !== 'income') && selectedCategory !== 'all') {
                return t.category === selectedCategory;
            }
            return true; // Pasa si el tipo coincide (o es 'all') y no aplica filtro de categoría
        });

        // 3. Limpiar lista actual
        transactionList.querySelectorAll('.transaction-item:not(.template)').forEach(li => li.remove());

        // 4. Renderizar items filtrados
        const hasItems = filteredTransactions.length > 0;
        emptyFilteredListMessage.classList.toggle('hidden', hasItems);
        const isFiltered = selectedType !== 'all' || selectedCategory !== 'all';
        emptyFilteredListMessage.textContent = isFiltered ? "No hay transacciones que coincidan con los filtros." : "Aún no hay transacciones registradas.";

        if (hasItems) {
            filteredTransactions.forEach(t => {
                try {
                    const li = transactionTemplate.cloneNode(true);
                    li.classList.remove('template', 'hidden');
                    li.style.display = 'flex'; // Asegurar display correcto

                    const iconContainer = li.querySelector('.transaction-icon');
                    const icon = iconContainer?.querySelector('i');
                    const descriptionSpan = li.querySelector('.transaction-description');
                    const detailsSpan = li.querySelector('.transaction-details');
                    const amountSpan = li.querySelector('.transaction-amount');

                    // Validar que los elementos internos existen antes de usarlos
                    if (!iconContainer || !icon || !descriptionSpan || !detailsSpan || !amountSpan) {
                        console.warn("Plantilla de transacción incompleta, saltando item:", t.id);
                        return; // Saltar este item si la plantilla es inválida
                    }

                    const typeClass = t.type === 'income' ? 'income' : 'expense';
                    const sign = t.type === 'income' ? '+' : '-';

                    iconContainer.className = `transaction-icon ${typeClass}`;
                    icon.className = `fas fa-${t.type === 'income' ? 'arrow-down' : 'arrow-up'}`;
                    amountSpan.className = `transaction-amount ${typeClass}`;
                    amountSpan.textContent = `${sign}${formatCurrencyCLP(t.amount)}`;
                    descriptionSpan.textContent = t.description;
                    detailsSpan.textContent = `${formatDate(t.date)}${t.category ? ` - ${t.category}` : ''}`;
                    li.dataset.transactionId = t.id;

                    transactionList.appendChild(li);
                } catch (e) { console.error(`Error renderizando Tx ID ${t.id}:`, e); }
            });
        }
        console.log(`[UI] ${filteredTransactions.length} transacciones mostradas después de filtrar.`);
    }

    /** Habilita/deshabilita filtros y actualiza la lista */
    function applyFiltersAndUpdateList() {
        if (!filterCategorySelect || !filterTypeRadios) return;
        const selectedType = document.querySelector('input[name="filterType"]:checked')?.value || 'all';
        const isExpenseFilterActive = selectedType === 'expense';

        filterCategorySelect.disabled = !isExpenseFilterActive;
        // Opcional: resetear valor si se deshabilita
        // if (!isExpenseFilterActive) filterCategorySelect.value = 'all';

        updateTransactionList(); // Renderizar con los filtros actuales
    }

    /** Actualiza las partes principales de la UI (resumen, gráficos) */
    function updateUI() {
        console.log("[UI] Actualizando Resumen y Gráficos...");
        try {
            const metrics = calculateMetrics(transactions);
            updateSummary(metrics);
            updateCharts(); // Gráficos siempre muestran datos totales
        } catch (e) { console.error("[UI] Error en updateUI:", e); }
        console.log("[UI] Resumen y Gráficos Actualizados.");
    }

    // ==================================================
    // --- 7. LÓGICA DE GRÁFICOS ---
    // ==================================================

    /** Agrupa transacciones por mes para gráfico de barras */
    function groupTransactionsByMonth(data, numMonths = 6) {
        if (!Array.isArray(data)) return [];
        const monthlyData = {};
        const labels = [];
        try {
            const today = momentIsLoaded ? moment() : new Date();
            // Generar etiquetas para los últimos N meses
            for (let i = 0; i < numMonths; i++) {
                let monthDate;
                if (momentIsLoaded) monthDate = moment(today).subtract(i, 'months');
                else monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);

                const monthYear = getYearMonth(momentIsLoaded ? monthDate.format('YYYY-MM-DD') : monthDate.toISOString().slice(0,10));
                if (monthYear) {
                    labels.push(monthYear);
                    monthlyData[monthYear] = { income: 0, expense: 0, dateObj: getStartOfMonthDate(momentIsLoaded ? monthDate.format('YYYY-MM-DD') : monthDate.toISOString().slice(0,10)) };
                }
            }
            labels.reverse(); // Ordenar de más antiguo a más reciente

            // Fecha límite para incluir transacciones
            const startDateLimit = getStartOfMonthDate(momentIsLoaded ? moment(today).subtract(numMonths - 1, 'months').format('YYYY-MM-DD') : new Date(today.getFullYear(), today.getMonth() - (numMonths - 1), 1).toISOString().slice(0,10));

            // Sumar montos por mes
            data.forEach(tx => {
                const txDate = new Date(tx.date + 'T00:00:00');
                if (isNaN(txDate.getTime()) || txDate < startDateLimit) return; // Ignorar si inválida o muy antigua

                const monthYear = getYearMonth(tx.date);
                if (monthYear && monthlyData[monthYear]) {
                    if (tx.type === 'income') monthlyData[monthYear].income += tx.amount;
                    else if (tx.type === 'expense') monthlyData[monthYear].expense += tx.amount;
                }
            });
            // Mapear al formato esperado por el gráfico
            return labels.map(label => monthlyData[label] || { income: 0, expense: 0, dateObj: null });
        } catch (e) { console.error("Error agrupando transacciones por mes:", e); return []; }
    }

    /** Agrupa gastos del mes actual por categoría para gráfico de dona */
    function groupExpensesByCategoryCurrentMonth(data) {
        if (!Array.isArray(data)) return {};
        const categoryData = {};
        try {
            const range = getCurrentMonthRange();
            data.forEach(t => {
                if (t.type === 'expense' && isDateBetween(t.date, range.start, range.end)) {
                    const category = t.category || 'Sin Categoría';
                    categoryData[category] = (categoryData[category] || 0) + t.amount;
                }
            });
            // Ordenar por monto descendente (opcional)
            // return Object.fromEntries(Object.entries(categoryData).sort(([,a],[,b]) => b-a));
            return categoryData;
        } catch (e) { console.error("Error agrupando gastos por categoría:", e); return {}; }
    }

    /** Renderiza el gráfico de resumen mensual */
    function renderMonthlySummaryChart(data) {
        if (!monthlyChartCtx) return;
        if (monthlyChart) monthlyChart.destroy(); // Destruir gráfico anterior

        const chartLabels = data.map(item => formatDate(item.dateObj?.toISOString().slice(0, 10) || '', 'MMM YYYY'));
        const incomeData = data.map(item => item.income);
        const expenseData = data.map(item => item.expense);

        const chartConfig = {
            type: 'bar',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: 'Ingresos', data: incomeData, backgroundColor: cssColors.income + 'B3', borderColor: cssColors.income, borderWidth: 1 }, // B3 = 70% opacity
                    { label: 'Gastos', data: expenseData, backgroundColor: cssColors.expense + 'B3', borderColor: cssColors.expense, borderWidth: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: cssColors.textSecondary, callback: v => formatCurrencyCLP(v) } },
                    x: { ticks: { color: cssColors.textSecondary } }
                },
                plugins: {
                    legend: { position: 'top', align: 'end', labels:{ color: cssColors.textPrimary } },
                    tooltip: { callbacks: { label: c => `${c.dataset.label}: ${formatCurrencyCLP(c.parsed.y)}` } }
                }
            }
        };
        monthlyChart = new Chart(monthlyChartCtx, chartConfig);
    }

    /** Renderiza el gráfico de gastos por categoría */
    function renderExpenseCategoryChart(data) {
        if (!categoryChartCtx) return;
        if (categoryChart) categoryChart.destroy();

        const labels = Object.keys(data);
        const amounts = Object.values(data);

        // Si no hay datos, mostrar mensaje en el canvas
        if (labels.length === 0) {
            const ctx = categoryChartCtx;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = cssColors.textMuted; ctx.font = '14px ' + cssColors.fontFamilySans;
            ctx.fillText("Sin gastos este mes para mostrar.", ctx.canvas.width / 2, ctx.canvas.height / 2);
            ctx.restore();
            return;
        }

        const backgroundColors = labels.map((_, i) => categoryColors[i % categoryColors.length] + 'E6'); // E6 = 90% opacity
        const borderColors = labels.map((_, i) => categoryColors[i % categoryColors.length]);


        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: amounts,
                    backgroundColor: backgroundColors,
                    borderColor: cssColors.surface, // Borde blanco entre segmentos
                    borderWidth: 2,
                    hoverOffset: 8 // Efecto hover
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '70%', // Hacerlo más delgado
                plugins: {
                    legend: { position: 'bottom', labels: { color: cssColors.textPrimary, padding: 15 } },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                let label = context.label || '';
                                if (label) label += ': ';
                                const value = context.parsed || 0;
                                label += formatCurrencyCLP(value);
                                // Calcular porcentaje
                                const total = context.dataset.data.reduce((a, v) => a + v, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                label += ` (${percentage})`;
                                return label;
                            }
                        }
                    }
                }
            }
        };
        categoryChart = new Chart(categoryChartCtx, chartConfig);
    }

    // ==================================================
    // --- 8. NAVEGACIÓN SPA ---
    // ==================================================
    /** Muestra la sección solicitada y oculta las demás */
    function showSection(targetId) {
        const effectiveId = targetId || 'dashboard'; // Default a dashboard si no hay ID
        console.log(`[SPA] Navegando a: ${effectiveId}`);

        if (!dashboardGrid || !spaSections) return; // Seguridad

        // Ocultar todas las secciones principales (grid y páginas SPA)
        dashboardGrid.classList.add('hidden');
        spaSections.forEach(s => s.classList.add('hidden'));

        let sectionToShow = null;
        if (effectiveId === 'dashboard') {
            sectionToShow = dashboardGrid;
        } else {
            sectionToShow = document.getElementById(`${effectiveId}-page`);
        }

        // Mostrar la sección correcta o volver al dashboard si no se encuentra
        if (sectionToShow) {
            sectionToShow.classList.remove('hidden');
            // Si es la página de transacciones, asegurar que los filtros se apliquen
            if (effectiveId === 'transactions') {
                applyFiltersAndUpdateList();
            }
             // Si es la página de reportes, asegurar que la lista de PDF esté actualizada
             if (effectiveId === 'reports') {
                 loadPersistedReports();
             }
        } else {
            console.warn(`[SPA] Sección #${effectiveId}-page no encontrada, mostrando dashboard.`);
            dashboardGrid.classList.remove('hidden');
            effectiveId = 'dashboard'; // Corregir ID efectivo para el menú
        }

        // Actualizar estado activo en el menú lateral
        sidebarLinks.forEach(link => {
            const linkTarget = link.getAttribute('href')?.substring(1); // Obtener ID del href
            link.parentElement.classList.toggle('active', linkTarget === effectiveId);
        });

        // (Opcional) Actualizar historial del navegador
        try {
            // Evitar empujar el mismo estado repetidamente
            if (window.location.hash !== `#${effectiveId}`) {
                 history.pushState({ section: effectiveId }, '', `#${effectiveId}`);
            }
        } catch (e) { console.warn("Error actualizando historial del navegador:", e); }
    }

    // Listener para botones de retroceso/avance del navegador
    window.addEventListener('popstate', (event) => {
        let targetId = 'dashboard'; // Default
        if (event.state && event.state.section) {
            targetId = event.state.section;
        } else {
            // Intentar obtener del hash si no hay estado (ej. carga inicial con hash)
            const hash = window.location.hash.substring(1);
            if (hash) targetId = hash;
        }
        console.log("[SPA] Evento Popstate detectado, mostrando sección:", targetId);
        showSection(targetId);
    });

    // ==================================================
    // --- 9. CHATBOT y GENERACIÓN PDF ---
    // ==================================================
    /** Maneja el envío de mensajes del chatbot */
    function handleSendMessage() {
        if (!chatbotInput || !chatbotMessages) return;
        const messageText = chatbotInput.value.trim();
        if (messageText === '') return;

        addChatMessage('user', messageText);
        chatbotInput.value = ''; // Limpiar input
        processUserMessage(messageText); // Procesar mensaje
    }

    /** Añade un mensaje (user o bot) al historial del chat */
    function addChatMessage(sender, text) {
        if (!chatbotMessages) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        messageElement.textContent = text; // Usar textContent para seguridad
        chatbotMessages.appendChild(messageElement);
        // Scroll automático al último mensaje
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    /** Procesa el mensaje del usuario y genera respuesta del bot */
    function processUserMessage(message) {
        try {
            const lowerCaseMessage = message.toLowerCase();
            let botResponse = "No entendí tu consulta. Puedes preguntar por tu 'balance', 'gastos del mes' o pedir un 'reporte PDF'."; // Respuesta por defecto

            if (lowerCaseMessage.includes("hola") || lowerCaseMessage.includes("saludos")) {
                botResponse = "¡Hola! 👋 ¿Cómo puedo ayudarte con tus finanzas hoy?";
            } else if (lowerCaseMessage.includes("balance")) {
                const metrics = calculateMetrics(transactions);
                botResponse = `Tu balance actual es ${formatCurrencyCLP(metrics.currentBalance)}. Este mes, tu balance es ${formatCurrencyCLP(metrics.monthlyBalance)}.`;
            } else if (lowerCaseMessage.includes("gasto") && (lowerCaseMessage.includes("mes") || lowerCaseMessage.includes("actual"))) {
                const metrics = calculateMetrics(transactions);
                botResponse = `Este mes has gastado ${formatCurrencyCLP(metrics.currentMonthExpense)}. Tus ingresos del mes son ${formatCurrencyCLP(metrics.currentMonthIncome)}.`;
            } else if (lowerCaseMessage.includes("pdf") || lowerCaseMessage.includes("reporte")) {
                addChatMessage('bot', "Generando reporte PDF, un momento...");
                // Llamada asíncrona, la respuesta se maneja en .then() y .catch()
                generatePdfReport()
                    .then(() => { addChatMessage('bot', "✅ Reporte PDF generado y guardado. Lo puedes volver a descargar desde la sección 'Reportes'."); })
                    .catch((e) => { addChatMessage('bot', `❌ Hubo un error al generar el reporte: ${e.message}. Revisa la consola.`); });
                return; // Salir, la respuesta es asíncrona
            } else if (lowerCaseMessage.includes("gracias")) {
                 botResponse = "¡De nada! 😊 ¿Necesitas algo más?";
            }
             // ... (añadir más intents/respuestas aquí)

            // Simular un pequeño retraso antes de responder
            setTimeout(() => addChatMessage('bot', botResponse), 600);

        } catch (e) {
            console.error("Error en processUserMessage:", e);
            addChatMessage('bot', 'Lo siento, ocurrió un error interno al procesar tu mensaje.');
        }
    }

    /** Función interna para crear el documento jsPDF (no genera descarga) */
    function _createPdfDocument(transactionsData, filename) {
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') throw new Error("Librería jsPDF no cargada.");
        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        if (typeof doc.autoTable !== 'function') throw new Error("Plugin jsPDF AutoTable no cargado/funcional.");

        const generationDate = new Date();
        const todayFormatted = formatDate(generationDate, 'DD MMM YYYY, HH:mm');

        // --- Contenido del PDF ---
        doc.setFontSize(18); doc.setTextColor(cssColors.accent); doc.text("Reporte Financiero", 14, 22);
        doc.setFontSize(10); doc.setTextColor(cssColors.textSecondary); doc.text(`Generado para: ${userEmail}`, 14, 28); doc.text(`Fecha: ${todayFormatted}`, 14, 33);

        const metrics = calculateMetrics(transactionsData || []);
        doc.setFontSize(12); doc.setTextColor(cssColors.textPrimary); doc.text("Resumen General:", 14, 45);
        doc.setFontSize(10); doc.setTextColor(cssColors.textSecondary);
        const summaryContent = [ `Balance Total: ${formatCurrencyCLP(metrics.currentBalance)}`, `Ingresos Totales: ${formatCurrencyCLP(metrics.totalIncome)}`, `Gastos Totales: ${formatCurrencyCLP(metrics.totalExpense)}` ];
        doc.text(summaryContent, 14, 52);

        doc.setFontSize(12); doc.setTextColor(cssColors.textPrimary); doc.text("Historial de Transacciones:", 14, 70);

        const tableColumns = ["Fecha", "Descripción", "Tipo", "Cat.", "Monto"];
        const tableRows = (transactionsData || []).map(t => [ formatDate(t.date, 'DD/MM/YY'), t.description.length > 30 ? t.description.substring(0, 27) + '...' : t.description, t.type === 'income' ? 'Ing.' : 'Gasto', t.category || '-', formatCurrencyCLP(t.amount) ]);
        const headStyles = { fillColor: cssColors.accent ? [parseInt(cssColors.accent.slice(1, 3), 16), parseInt(cssColors.accent.slice(3, 5), 16), parseInt(cssColors.accent.slice(5, 7), 16)] : [109, 40, 217] };

        doc.autoTable({
            startY: 75, head: [tableColumns], body: tableRows, theme: 'striped',
            headStyles: { ...headStyles, textColor: '#ffffff' }, // Texto blanco en cabecera
            columnStyles: { 4: { halign: 'right' } }, // Columna Monto a la derecha (índice 4)
            didDrawPage: (data) => { // Footer de página
                 doc.setFontSize(8); doc.setTextColor(cssColors.textMuted);
                 doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
            }
        });
        console.log(`[PDF] Documento PDF '${filename}' creado internamente.`);
        return doc;
    }

    /** Genera un nuevo reporte PDF, lo guarda y actualiza la UI */
    async function generatePdfReport() {
        console.log("[Reports] Iniciando generación de NUEVO reporte PDF...");
        try {
            const timestamp = Date.now();
            const filename = `Reporte_${userEmail.split('@')[0]}_${formatDate(timestamp, 'YYYYMMDD_HHmm')}.pdf`;

            // Crear el documento usando las transacciones ACTUALES
            const doc = _createPdfDocument(transactions, filename);

            // Guardar Metadatos en localStorage (con snapshot)
            const reportMetadata = { filename, timestamp, transactionsSnapshot: JSON.parse(JSON.stringify(transactions)) };
            let userReports = [];
            try {
                const storedData = localStorage.getItem(reportsStorageKey);
                if (storedData) { userReports = JSON.parse(storedData); if (!Array.isArray(userReports)) userReports = []; }
            } catch (e) { console.error("Error leyendo reportes existentes:", e); userReports = []; }
            userReports.push(reportMetadata);
            localStorage.setItem(reportsStorageKey, JSON.stringify(userReports));
            console.log(`[Reports] Metadatos guardados en ${reportsStorageKey}`);

            // Descargar PDF
            doc.save(filename);
            console.log(`[Reports] Reporte ${filename} ofrecido para descarga.`);

            // Actualizar la lista de reportes en la UI
            loadPersistedReports();
            // No se necesita retornar nada explícitamente aquí para .then() vacío

        } catch (e) {
            console.error("Error fatal en generatePdfReport:", e);
            // Re-lanzar para que el .catch() del llamador (chatbot) lo reciba
            throw e;
        }
    }

    /** Regenera y descarga un PDF a partir de los datos guardados */
    async function regenerateAndDownloadReport(reportData) {
        console.log(`[Reports] Iniciando REGENERACIÓN del reporte: ${reportData?.filename}`);
        if (!reportData || !reportData.transactionsSnapshot || !reportData.filename) {
             console.error("Datos inválidos para regenerar el reporte:", reportData);
             alert("No se puede regenerar el reporte: faltan datos."); return;
        }
        try {
            // Crear el documento usando los datos del SNAPSHOT
            const doc = _createPdfDocument(reportData.transactionsSnapshot, reportData.filename);
            // Descargar usando el nombre de archivo ORIGINAL
            doc.save(reportData.filename);
            console.log(`[Reports] Reporte ${reportData.filename} regenerado y ofrecido para descarga.`);
        } catch (e) {
            console.error(`Error fatal en regenerateAndDownloadReport para ${reportData.filename}:`, e);
            alert(`Error al regenerar el reporte PDF: ${e.message}`);
        }
    }

    // ==================================================
    // --- 10. LOGOUT ---
    // ==================================================
    /** Cierra la sesión simulada del usuario */
    function logout() {
        console.log(`[Auth] Cerrando sesión para ${userEmail}.`);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loggedInUserEmail');
        // Considerar si borrar o no las transacciones/reportes del usuario al salir
        // localStorage.removeItem('financeDashboardTransactions');
        // localStorage.removeItem(reportsStorageKey);
        console.log("[Auth] Redirigiendo a login.html");
        window.location.href = 'login.html';
    }

    // ==================================================
    // --- 11. EVENT LISTENERS ---
    // ==================================================
    /** Configura todos los listeners de la aplicación */
    function setupEventListeners() {
        // Formulario de Transacción
        transactionForm?.addEventListener('submit', addTransaction);
        typeIncomeRadio?.addEventListener('change', toggleCategory);
        typeExpenseRadio?.addEventListener('change', toggleCategory);

        // Navegación Sidebar y Popstate (manejado en showSection y listener popstate)
        sidebarLinks.forEach(link => {
             const href = link.getAttribute('href');
             if (href && href.startsWith('#')) {
                 link.addEventListener('click', (e) => {
                     e.preventDefault();
                     const targetId = href.substring(1);
                     showSection(targetId);
                 });
             }
        });
         // Listener popstate ya está añadido fuera de esta función

        // Chatbot
        openChatbotBtn?.addEventListener('click', () => {
            chatbotContainer?.classList.remove('hidden');
            openChatbotBtn?.classList.add('hidden');
            chatbotInput?.focus();
        });
        closeChatbotBtn?.addEventListener('click', () => {
            chatbotContainer?.classList.add('hidden');
            openChatbotBtn?.classList.remove('hidden');
        });
        sendChatbotBtn?.addEventListener('click', handleSendMessage);
        chatbotInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSendMessage(); });

        // Logout
        logoutButton?.addEventListener('click', logout);

        // Filtros de Transacciones
        filterTypeRadios.forEach(radio => radio.addEventListener('change', applyFiltersAndUpdateList));
        filterCategorySelect?.addEventListener('change', applyFiltersAndUpdateList);
        resetFiltersBtn?.addEventListener('click', () => {
            console.log('[Filters] Limpiando filtros...');
            document.querySelector('input[name="filterType"][value="all"]').checked = true;
            if(filterCategorySelect) filterCategorySelect.value = 'all';
            applyFiltersAndUpdateList();
        });

        console.log("Event listeners configurados.");
    }

    // ==================================================
    // --- 12. INICIALIZACIÓN FINAL ---
    // ==================================================
    /** Inicializa la aplicación */
    function initializeApp() {
        try {
            console.log("Iniciando App...");
            if (welcomeMessageElement) welcomeMessageElement.textContent = `¡Bienvenido/a, ${userEmail}!`;

            transactions = loadTransactions();
            console.log(`[Data] ${transactions.length} transacciones cargadas.`);

            setDefaultDate();
            toggleCategory(); // Estado inicial del formulario
            loadPersistedReports(); // Cargar reportes guardados

            updateUI(); // Render inicial (resumen, gráficos)
            applyFiltersAndUpdateList(); // Aplicar estado inicial de filtros

            setupEventListeners(); // Configurar listeners DESPUÉS de cargar datos iniciales

            // Mostrar sección inicial basada en el hash o dashboard
            const initialHash = window.location.hash.substring(1);
            showSection(initialHash || 'dashboard');

            chatbotContainer?.classList.add('hidden');
            openChatbotBtn?.classList.remove('hidden');

            console.log("¡Aplicación Lista!");

            // Ocultar el loader al final
            if (loader) {
                loader.classList.add('fade-out');
                loader.addEventListener('transitionend', () => {
                    console.log("Loader oculto.");
                    loader.remove();
                }, { once: true });
            }

        } catch (initError) {
            console.error("ERROR CRÍTICO INICIALIZACIÓN:", initError);
            alert(`Error fatal al iniciar la aplicación: ${initError.message}. Revisa la consola.`);
            // Ocultar el loader también en caso de error
            if (loader) {
                console.log("Ocultando loader debido a error de inicialización.");
                loader.remove();
            }
        }
    }

    // Iniciar la aplicación
    initializeApp();

}); // <-- CIERRE DOMContentLoaded