const API_BASE_URL = ""; 

const serversTbody = document.getElementById("servers-tbody");
const totalServersEl = document.getElementById("total-servers");
const totalRequestsEl = document.getElementById("total-requests");
const statsContainer = document.getElementById("stats-container");
const systemMessages = document.getElementById("system-messages");

const btnRefreshServers = document.getElementById("btn-refresh-servers");
const btnSendRequest = document.getElementById("btn-send-request");

const requestResultBox = document.getElementById("request-result-box");
const resServerName = document.getElementById("res-server-name");
const resServerOutput = document.getElementById("res-server-output");

function mostrarMensaje(mensaje, tipo = "error") {
    systemMessages.textContent = mensaje;
    systemMessages.className = `message-panel message-${tipo}`;
}

function limpiarMensajes() {
    systemMessages.textContent = "";
    systemMessages.className = "message-panel hidden";
}

// 1. Consultar Servidores
async function consultarServidores() {
    try {
        const response = await fetch(`${API_BASE_URL}/servidores`);
        if (!response.ok) throw new Error("No se pudo obtener la respuesta de la API.");
        
        const servidores = await response.json();
        renderizarServidores(servidores);
        limpiarMensajes();
    } catch (error) {
        console.error("Error al consultar servidores:", error);
        mostrarMensaje("No se pudo conectar con la API o consultar los servidores.", "error");
        serversTbody.innerHTML = `<tr><td colspan="4" class="text-center">Error de conexión con la API</td></tr>`;
    }
}

function renderizarServidores(servidores) {
    serversTbody.innerHTML = "";
    totalServersEl.textContent = servidores.length;

    if (!servidores || servidores.length === 0) {
        serversTbody.innerHTML = `<tr><td colspan="4" class="text-center">No hay servidores configurados.</td></tr>`;
        return;
    }

    servidores.forEach(srv => {
        const row = document.createElement("tr");
        const esActivo = srv.estado === true;

        row.innerHTML = `
            <td><strong>${srv.nombre}</strong></td>
            <td>${srv.puerto}</td>
            <td>
                <span class="badge ${esActivo ? 'badge-active' : 'badge-inactive'}">
                    ${esActivo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button onclick="toggleServidor(${srv.puerto})" class="btn btn-small btn-toggle">
                    ${esActivo ? 'Detener (Apagar)' : 'Iniciar (Encender)'}
                </button>
            </td>
        `;
        serversTbody.appendChild(row);
    });
}

// Alternar estado de servidor para facilitar las pruebas funcionales
async function toggleServidor(puerto) {
    try {
        const response = await fetch(`${API_BASE_URL}/servidores/toggle/${puerto}`, { method: 'POST' });
        if (!response.ok) throw new Error("Error al modificar el estado del servidor.");
        
        await consultarServidores();
        await consultarEstadisticas();
    } catch (error) {
        mostrarMensaje("No se pudo cambiar el estado del servidor.", "error");
    }
}

// 2. Enviar Solicitud al Balanceador
async function enviarSolicitud() {
    btnSendRequest.disabled = true;
    try {
        const response = await fetch(`${API_BASE_URL}/solicitar`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "No hay servidores disponibles para procesar la petición.");
        }
        
        requestResultBox.classList.remove("hidden");
        resServerName.textContent = data.servidor;
        resServerOutput.textContent = data.mensaje;
        
        limpiarMensajes();
        await consultarEstadisticas();
    } catch (error) {
        console.error("Error al enviar solicitud:", error);
        mostrarMensaje(error.message, "error");
        requestResultBox.classList.add("hidden");
    } finally {
        btnSendRequest.disabled = false;
    }
}

// 3. Consultar Estadísticas
async function consultarEstadisticas() {
    try {
        const response = await fetch(`${API_BASE_URL}/estadisticas`);
        if (!response.ok) throw new Error("Error al consultar estadísticas.");

        const stats = await response.json();
        renderizarEstadisticas(stats);
    } catch (error) {
        console.error("Error en estadísticas:", error);
        mostrarMensaje("No se pudieron obtener las estadísticas.", "error");
    }
}

function renderizarEstadisticas(stats) {
    const total = stats.totalSolicitudes || 0;
    totalRequestsEl.textContent = total;
    statsContainer.innerHTML = "";

    const lista = stats.servidores || [];

    if (lista.length > 0) {
        lista.forEach(item => {
            const atendidas = item.solicitudes || 0;
            const porcentaje = total > 0 ? Math.round((atendidas / total) * 100) : 0;

            const card = document.createElement("div");
            card.className = "stat-card";
            card.innerHTML = `
                <div class="stat-card-title">${item.nombre}</div>
                <div>Atendidas: <strong>${atendidas}</strong> (${porcentaje}%)</div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${porcentaje}%;"></div>
                </div>
            `;
            statsContainer.appendChild(card);
        });
    } else {
        statsContainer.innerHTML = `<p class="text-center">Sin datos de estadísticas.</p>`;
    }
}

// Inicialización de la App
document.addEventListener("DOMContentLoaded", () => {
    consultarServidores();
    consultarEstadisticas();

    btnRefreshServers.addEventListener("click", () => {
        consultarServidores();
        consultarEstadisticas();
    });

    btnSendRequest.addEventListener("click", enviarSolicitud);
});