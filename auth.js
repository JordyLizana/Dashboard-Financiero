// ==================================================
// ARCHIVO: auth.js
// Lógica para login.html (SIMULADO - NO SEGURO)
// --- VALIDACIONES MEJORADAS ---
// ==================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Auth] DOM de la página de autenticación cargado.");

    // --- Selectores de Elementos DOM ---
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginErrorDiv = document.getElementById('login-error');
    const registerErrorDiv = document.getElementById('register-error');

    if (!loginSection || !registerSection || !loginForm || !registerForm || !showRegisterLink || !showLoginLink || !loginErrorDiv || !registerErrorDiv) {
        console.error("[Auth] Error crítico: No se encontraron todos los elementos necesarios en login.html. Verifica los IDs.");
        return;
    }
    console.log("[Auth] Elementos de autenticación encontrados.");

    // --- Regex para validación de email ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- Funcionalidad para cambiar entre formularios ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("[Auth] Cambiando a formulario de Registro.");
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
        clearErrors(loginForm); // Limpiar errores del form que se oculta
        clearErrors(registerForm);
        registerForm.reset(); // Limpiar campos al mostrar
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log("[Auth] Cambiando a formulario de Login.");
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        clearErrors(registerForm); // Limpiar errores del form que se oculta
        clearErrors(loginForm);
        loginForm.reset(); // Limpiar campos al mostrar
    });
    console.log("[Auth] Listeners para cambiar formularios añadidos.");


    // --- Funciones de Ayuda para Errores ---
    function clearErrors(formElement) {
        const errorDivId = formElement.id === 'login-form' ? 'login-error' : 'register-error';
        const errorDiv = document.getElementById(errorDivId);
        if (errorDiv) errorDiv.textContent = '';

        formElement.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));
        // No loguear aquí para evitar spam en consola
        // console.log(`[Auth] Errores limpiados para ${formElement.id}.`);
    }

    function displayError(formType, message) {
        const errorDiv = (formType === 'login') ? loginErrorDiv : registerErrorDiv;
        if (errorDiv) {
            // Añadir icono visualmente si se usa CSS ::before en el error-message
            // errorDiv.classList.add('has-icon'); // Si se quisiera diferenciar
            errorDiv.textContent = message;
            console.warn(`[Auth Error - ${formType}] ${message}`);
        } else {
            console.error(`[Auth] Div de error para '${formType}' no encontrado.`);
        }
    }

    function markInputError(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('error');
        } else {
            console.warn(`[Auth] No se pudo marcar error en input: #${inputId} no encontrado.`);
        }
    }


    // --- Manejador de Inicio de Sesión (Submit Login Form) ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors(loginForm);
        console.log("[Auth] Intento de Inicio de Sesión...");

        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const submitButton = loginForm.querySelector('.auth-button'); // Botón para estado loading

        if (!emailInput || !passwordInput || !submitButton) {
             console.error("[Auth] Inputs de login o botón no encontrados.");
             displayError('login', 'Error inesperado en el formulario.');
             return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validación Frontend Básica
        let isValid = true;
        if (!email) {
            displayError('login', 'El correo electrónico es obligatorio.');
            markInputError('login-email');
            isValid = false;
        } else if (!emailRegex.test(email)) { // *** VALIDACIÓN FORMATO EMAIL ***
             displayError('login', 'Por favor, ingresa un formato de correo válido.');
             markInputError('login-email');
             isValid = false;
         }

        if (!password) {
             // Si ya hay error de email, no mostrar este para no sobreescribir
            if(isValid) displayError('login', 'La contraseña es obligatoria.');
            markInputError('login-password');
            isValid = false;
        }

        if (!isValid) return; // Detener si hay errores de validación

        // --- INICIO DE SIMULACIÓN DE BACKEND ---
        console.warn("******************************************************");
        console.warn("* ADVERTENCIA: Iniciando SIMULACIÓN de login (INSEGURO) *");
        console.warn("******************************************************");

        // Estado de carga en el botón
        const originalButtonHTML = submitButton.innerHTML; // Guardar HTML completo (con icono)
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';


        setTimeout(() => {
            let loginSuccess = false;
            let storedUserData = null;
            try {
                const storedUserJSON = localStorage.getItem('simulatedUser');
                if (storedUserJSON) {
                    storedUserData = JSON.parse(storedUserJSON);
                    if (storedUserData && storedUserData.email === email && storedUserData.password === password) {
                        loginSuccess = true;
                    }
                }
            } catch (err) {
                console.error("[Auth Simulation] Error parseando usuario simulado:", err);
                displayError('login', 'Error al verificar usuario local.');
                 // Restaurar botón en caso de error temprano
                 submitButton.disabled = false;
                 submitButton.innerHTML = originalButtonHTML;
                return;
            }

             // Restaurar botón después de la simulación
             submitButton.disabled = false;
             submitButton.innerHTML = originalButtonHTML;

            if (loginSuccess) {
                console.log("[Auth Simulation] Login SIMULADO exitoso para:", email);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('loggedInUserEmail', email);
                console.log("[Auth Simulation] Redirigiendo al Dashboard...");
                // Añadir un pequeño delay visual antes de redirigir (opcional)
                // submitButton.innerHTML = '<i class="fas fa-check"></i> ¡Éxito!';
                // setTimeout(() => { window.location.href = 'index.html'; }, 500);
                window.location.href = 'index.html'; // Redirigir directamente
            } else {
                console.warn("[Auth Simulation] Login SIMULADO fallido para:", email);
                displayError('login', 'Correo o contraseña incorrectos.');
                markInputError('login-email');
                markInputError('login-password');
                // Opcional: Agitar el formulario para indicar error
                // loginForm.closest('.auth-container').classList.add('shake-error');
                // setTimeout(() => { loginForm.closest('.auth-container').classList.remove('shake-error'); }, 500);
            }
        }, 1200); // Simular 1.2 segundos
        // --- FIN DE SIMULACIÓN DE BACKEND ---
    });
    console.log("[Auth] Listener 'submit' añadido al formulario de Login.");


    // --- Manejador de Registro (Submit Register Form) ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearErrors(registerForm);
        console.log("[Auth] Intento de Registro...");

        const usernameInput = document.getElementById('register-username');
        const emailInput = document.getElementById('register-email');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-confirm-password');
        const submitButtonReg = registerForm.querySelector('.auth-button'); // Botón

        if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !submitButtonReg) {
             console.error("[Auth] Inputs de registro o botón no encontrados.");
             displayError('register', 'Error inesperado en el formulario.');
             return;
        }

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validación Frontend Mejorada
        let isValid = true;

        if (!username) {
            displayError('register', 'El nombre de usuario es obligatorio.');
            markInputError('register-username'); isValid = false;
        } else if (username.length < 5) { // *** VALIDACIÓN LARGO USERNAME ***
            displayError('register', 'El nombre de usuario debe tener al menos 5 caracteres.');
            markInputError('register-username'); isValid = false;
        }

        if (!email) {
            if (isValid) displayError('register', 'El correo electrónico es obligatorio.');
            markInputError('register-email'); isValid = false;
        } else if (!emailRegex.test(email)) { // *** VALIDACIÓN FORMATO EMAIL ***
            if (isValid) displayError('register', 'Por favor, ingresa un formato de correo válido.');
            markInputError('register-email'); isValid = false;
        }

        if (!password) {
            if (isValid) displayError('register', 'La contraseña es obligatoria.');
            markInputError('register-password'); isValid = false;
        } else if (password.length < 6) { // *** VALIDACIÓN LARGO PASSWORD (Existente) ***
            if (isValid) displayError('register', 'La contraseña debe tener al menos 6 caracteres.');
            markInputError('register-password'); isValid = false;
        }

        if (!confirmPassword) {
             if (isValid) displayError('register', 'Debes confirmar la contraseña.');
             markInputError('register-confirm-password'); isValid = false;
        } else if (password && password !== confirmPassword) { // Solo comparar si la pass original existe y es válida
             // No mostrar error de no coincidencia si la contraseña original ya tenía error
             if (isValid && password.length >= 6) {
                 displayError('register', 'Las contraseñas no coinciden.');
                 markInputError('register-confirm-password');
                 markInputError('register-password'); // Marcar ambas
                 isValid = false;
             } else if (isValid) {
                 // Si la contraseña original es inválida (<6), solo marcar el campo de confirmación
                  markInputError('register-confirm-password');
                  isValid = false;
             }
        }


        if (!isValid) {
            console.warn("[Auth] Validación de registro fallida.");
            return; // Detener si no es válido
        }

        // --- INICIO DE SIMULACIÓN DE BACKEND ---
        console.warn("*********************************************************");
        console.warn("* ADVERTENCIA: Iniciando SIMULACIÓN de registro (INSEGURO) *");
        console.warn("*********************************************************");

        // Estado de carga en el botón
        const originalButtonHTMLReg = submitButtonReg.innerHTML;
        submitButtonReg.disabled = true;
        submitButtonReg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';


        setTimeout(() => {
            let registrationSuccess = true;
            let errorMessage = '';

            try {
                const storedUserJSON = localStorage.getItem('simulatedUser');
                if (storedUserJSON) {
                    const existingUser = JSON.parse(storedUserJSON);
                    if (existingUser && existingUser.email === email) {
                        registrationSuccess = false;
                        errorMessage = 'Este correo electrónico ya está registrado.';
                        markInputError('register-email');
                    }
                }
            } catch(err) {
                 console.error("[Auth Simulation] Error parseando usuario simulado existente:", err);
                 registrationSuccess = false;
                 errorMessage = 'Error verificando datos locales.';
                 // Restaurar botón
                 submitButtonReg.disabled = false;
                 submitButtonReg.innerHTML = originalButtonHTMLReg;
                 return; // Salir si hay error
            }

            // Restaurar botón
             submitButtonReg.disabled = false;
             submitButtonReg.innerHTML = originalButtonHTMLReg;


            if (registrationSuccess) {
                console.log("[Auth Simulation] Registro SIMULADO exitoso para:", email);
                const newUser = { username, email, password };
                localStorage.setItem('simulatedUser', JSON.stringify(newUser));
                console.warn("[Auth Simulation] ¡Credenciales guardadas en localStorage (INSEGURO)!");

                alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
                // Cambiar a la vista de login automáticamente
                registerSection.classList.add('hidden');
                loginSection.classList.remove('hidden');
                clearErrors(registerForm);
                loginForm.reset(); // Limpiar login form para el usuario
                document.getElementById('login-email').value = email; // Pre-rellenar email en login
                document.getElementById('login-password').focus();    // Poner foco en contraseña

            } else {
                console.warn("[Auth Simulation] Registro SIMULADO fallido.");
                displayError('register', errorMessage || 'No se pudo completar el registro.');
                 // Opcional: Agitar el formulario
                 // registerForm.closest('.auth-container').classList.add('shake-error');
                 // setTimeout(() => { registerForm.closest('.auth-container').classList.remove('shake-error'); }, 500);
            }
        }, 1500);
        // --- FIN DE SIMULACIÓN DE BACKEND ---
    });
    console.log("[Auth] Listener 'submit' añadido al formulario de Registro.");

}); // Fin DOMContentLoaded
