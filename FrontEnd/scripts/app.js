import { sendMessageToAPI } from "./api.js"; 

document.addEventListener('DOMContentLoaded', function() {

    // Referencias a elementos del DOM
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chat-messages');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const newChatBtn = document.getElementById('newChatBtn'); // Referencia al botón de Nuevo Chat

    // Constantes
    const MAX_HEIGHT = 200; // Altura máxima del textarea en píxeles

    // Estado de la barra lateral
    let sidebarVisible = false;

    // Función para alternar la barra lateral
    function toggleSidebar() {
        sidebarVisible = !sidebarVisible;
        sidebar.classList.toggle('active', sidebarVisible);

        // Guardar preferencia en localStorage
        localStorage.setItem('sidebarVisible', sidebarVisible);
    }

    // Cargar preferencia de la barra lateral
    function loadSidebarPreference() {
        const savedPreference = localStorage.getItem('sidebarVisible');
        if (savedPreference !== null) {
            sidebarVisible = savedPreference === 'true';
            sidebar.classList.toggle('active', sidebarVisible);
        } else {
            // Por defecto visible en escritorio, oculto en móviles
            sidebarVisible = window.innerWidth > 768;
            sidebar.classList.toggle('active', sidebarVisible);
        }
    }

    // Función para desplazarse al final del chat
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Función para obtener la hora actual formateada
    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // La hora '0' debe ser '12'
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    }

    // Función para crear un elemento de mensaje
    function createMessageElement(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const messageText = document.createElement('p');
        if (typeof marked !== 'undefined' && marked.parse) {
            messageText.innerHTML = marked.parse(text); 
        } else {
            messageText.textContent = text;
        }

        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = getCurrentTime();

        messageContent.appendChild(messageText);
        messageContent.appendChild(timestamp);
        messageDiv.appendChild(messageContent);

        return messageDiv;
    }

    // Función para mostrar el indicador de escritura
    function createTypingIndicator() {
        const typingIndicatorDiv = document.createElement('div');
        typingIndicatorDiv.className = 'message ai-message typing-indicator';
        typingIndicatorDiv.id = 'typingIndicator'; // Añade un ID para fácil eliminación

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        const typingAnimation = document.createElement('div');
        typingAnimation.className = 'typing';
        typingAnimation.innerHTML = '<span></span><span></span><span></span>';

        messageContent.appendChild(typingAnimation);
        typingIndicatorDiv.appendChild(messageContent);

        return typingIndicatorDiv;
    }

    // Función para limpiar el área de mensajes (excepto el mensaje inicial)
    function clearChatMessages() {
        while (chatMessages.children.length > 1) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        if (chatMessages.children.length === 0 || !chatMessages.children[0].classList.contains('welcome-message')) {
            const welcomeMessage = createMessageElement("¡Hola! ¿En qué puedo ayudarte hoy?", 'ai');
            welcomeMessage.classList.add('welcome-message');
            chatMessages.prepend(welcomeMessage); 
        }
        scrollToBottom();
    }

    // Función principal para enviar mensajes
    async function sendMessage(message, isUser = true) {
        if (!message.trim()) return;

        // Crear y añadir el mensaje del usuario
        if (isUser) {
            const userMessage = createMessageElement(message, 'user');
            chatMessages.appendChild(userMessage);
        }

        // Limpiar el campo de entrada y restablecer altura
        chatInput.value = '';
        chatInput.style.height = 'auto';

        scrollToBottom();

        const typingIndicator = createTypingIndicator();
        chatMessages.appendChild(typingIndicator);
        scrollToBottom();

        try {
            // Se envía 'default' como session_id si no hay otro definido
            const aiResponse = await sendMessageToAPI(message, 'default');

            typingIndicator.remove();

            const aiMessage = createMessageElement(aiResponse, 'ai');
            chatMessages.appendChild(aiMessage);
            scrollToBottom();
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            typingIndicator.remove();
            const errorMessage = createMessageElement("Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.", 'ai');
            chatMessages.appendChild(errorMessage);
            scrollToBottom();
        }
    }

    // Event Listeners
    sendBtn.addEventListener('click', function() {
        sendMessage(chatInput.value);
    });

    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(chatInput.value);
        }
    });

    // Ajuste automático de altura del textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, MAX_HEIGHT) + 'px';
    });

    menuToggle.addEventListener('click', toggleSidebar);

    // Event listener para el botón "Nuevo Chat"
    newChatBtn.addEventListener('click', function() {
        clearChatMessages(); 
        chatInput.focus();
    });

    // Inicialización al cargar la página
    loadSidebarPreference();
    clearChatMessages(); 
    scrollToBottom();
    chatInput.focus();

    // Estilos dinámicos para el indicador de escritura (mantenerlos aquí)
    const style = document.createElement('style');
    style.textContent = `
        .typing-indicator .message-content {
            background: var(--bg-surface-variant) !important;
        }
        .typing {
            display: flex;
            align-items: center;
            padding: 10px 0;
        }
        .typing span {
            height: 8px;
            width: 8px;
            background: var(--text-on-surface);
            border-radius: 50%;
            display: inline-block;
            margin: 0 2px;
            opacity: 0.6;
        }
        .typing span:nth-child(1) {
            animation: typing 1s infinite;
        }
        .typing span:nth-child(2) {
            animation: typing 1s infinite 0.2s;
        }
        .typing span:nth-child(3) {
            animation: typing 1s infinite 0.4s;
        }
        @keyframes typing {
            0% { transform: translateY(0); opacity: 0.6; }
            33% { transform: translateY(-4px); opacity: 1; }
            66% { transform: translateY(0); opacity: 0.6; }
            100% { transform: translateY(0); opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
});