from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Dict
import os

app = FastAPI(
    title="API Balanceador de Carga - Taller Redes",
    description="Backend en Python para la gestión y simulación de redes de servidores"
)

# Permitir peticiones CORS desde cualquier origen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado global de la red de servidores
servidores_db: List[Dict] = [
    {"nombre": "Servidor Alfa", "puerto": 8001, "estado": True},
    {"nombre": "Servidor Beta", "puerto": 8002, "estado": True},
    {"nombre": "Servidor Gamma", "puerto": 8003, "estado": True},
    {"nombre": "Servidor Delta", "puerto": 8004, "estado": False}
]

# Estado de estadísticas
estadisticas_db = {
    "totalSolicitudes": 0,
    "conteo_por_puerto": {srv["puerto"]: 0 for srv in servidores_db}
}

# Índice para el algoritmo Round Robin de balanceo de carga
current_rr_index = 0

# --- ENDPOINTS REQUERIDOS EN EL TALLER ---

@app.get("/servidores")
def get_servidores():
    """Consulta la lista de servidores registrados y su estado actual."""
    return servidores_db

@app.get("/solicitar")
def atender_solicitud():
    """Recibe la solicitud en el balanceador y la asigna a un servidor activo mediante Round Robin."""
    global current_rr_index
    
    # Filtrar solo los servidores que se encuentran activos
    activos = [s for s in servidores_db if s["estado"]]
    
    if not activos:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No hay servidores disponibles para atender la solicitud."
        )
    
    # Selección de servidor por Round Robin
    servidor_seleccionado = activos[current_rr_index % len(activos)]
    current_rr_index = (current_rr_index + 1) % len(activos)
    
    puerto = servidor_seleccionado["puerto"]
    nombre = servidor_seleccionado["nombre"]
    
    # Actualizar métricas globales
    estadisticas_db["totalSolicitudes"] += 1
    estadisticas_db["conteo_por_puerto"][puerto] += 1
    
    return {
        "servidor": f"{nombre} (Puerto {puerto})",
        "puerto": puerto,
        "mensaje": f"Petición procesada exitosamente por {nombre} en el puerto {puerto}.",
        "estado_http": 200
    }

@app.get("/estadisticas")
def get_estadisticas():
    """Devuelve las estadísticas acumuladas de peticiones procesadas."""
    detalle = []
    for srv in servidores_db:
        puerto = srv["puerto"]
        detalle.append({
            "nombre": f"{srv['nombre']} ({puerto})",
            "puerto": puerto,
            "solicitudes": estadisticas_db["conteo_por_puerto"].get(puerto, 0),
            "estado": srv["estado"]
        })
        
    return {
        "totalSolicitudes": estadisticas_db["totalSolicitudes"],
        "servidores": detalle
    }

# --- ENDPOINTS ADICIONALES PARA SIMULACIÓN DE PRUEBAS ---

@app.post("/servidores/toggle/{puerto}")
def alternar_estado_servidor(puerto: int):
    """Permite encender o apagar un servidor para ejecutar las pruebas funcionales del taller."""
    for srv in servidores_db:
        if srv["puerto"] == puerto:
            srv["estado"] = not srv["estado"]
            estado_txt = "Activo" if srv["estado"] else "Inactivo"
            return {"mensaje": f"{srv['nombre']} ahora está {estado_txt}", "servidor": srv}
    raise HTTPException(status_code=404, detail="Servidor no encontrado")

# --- SERVIDORES DE ARCHIVOS ESTÁTICOS (FRONTEND) ---

script_dir = os.path.dirname(os.path.realpath(__file__))
static_dir = os.path.join(script_dir, "static")

if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    """Sirve la interfaz de usuario directamente desde el backend."""
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"mensaje": "Backend Python activo. Coloque los archivos HTML/CSS/JS en la carpeta static/"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)