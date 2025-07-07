export async function sendMessageToAPI(message, sessionId) {
    try {
        const response = await fetch("http://localhost:8000/chat", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                session_id: sessionId
            }),
        });

        if (!response.ok) {
            
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido del servidor.' }));
            throw new Error(`Error HTTP! Estado: ${response.status}, Mensaje: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        return data.response; 
    } catch (error) {
        console.error('Error en sendMessageToAPI:', error);
        throw error; 
    }
}