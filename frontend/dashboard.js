import { authClient } from './authClient.js';
import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('dashboard');
    if (!container) return;

    // show loading
    container.innerHTML = `
        <div class="flex items-center justify-center py-12" id="dashboard-loading">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span class="ml-3 text-gray-600">Cargando tablero...</span>
        </div>
    `;

    try {
        const isAuth = await authClient.isAuthenticated();
        if (!isAuth) {
            // redirect to login
            window.location.href = '/login.html';
            return;
        }

        const rut = authClient.getCurrentUser();

        // fetch carreras
        const resp = await authClient.authenticatedFetch(`${API_BASE_URL}/carreras/${rut}`, { method: 'GET' });
        if (!resp.ok) {
            throw new Error('No se pudieron obtener las carreras');
        }
        const data = await resp.json();
        renderDashboard(container, data);

    } catch (err) {
        console.error('Error cargando dashboard:', err);
        container.innerHTML = `
            <div class="p-4 bg-red-100 border border-red-300 text-red-700 rounded">
                No se pudo cargar la información del tablero. Puedes ir a <a href="/frontend/carreras/carrerasUsuario.html" class="text-blue-600 underline">Consultar Carreras</a> o usar la demo.
            </div>
        `;
    }
});

function renderDashboard(container, data) {
    const carreras = data.carreras || [];
    const summary = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="col-span-1 md:col-span-2">
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-2xl font-semibold mb-2">Bienvenido</h2>
                    <p class="text-gray-600 mb-4">Aquí tienes un resumen rápido de tus carreras y atajos.</p>
                    <div class="flex gap-3">
                        <a href="/frontend/carreras/carrerasUsuario.html" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Consultar Carreras</a>
                        <a href="/frontend/auth-status.html" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">Estado de autenticación</a>
                        <a href="/frontend/malla/mallaCarrera.html" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Abrir Malla (manual)</a>
                    </div>
                </div>
            </div>
            <div class="col-span-1">
                <div class="bg-white rounded-lg shadow p-4">
                    <h3 class="font-semibold mb-2">Resumen</h3>
                    <p class="text-sm text-gray-600">Carreras registradas: <strong>${carreras.length}</strong></p>
                </div>
            </div>
        </div>
    `;

    const listHeader = `
        <div class="mt-6">
            <h3 class="text-xl font-semibold mb-3">Mis Carreras</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="carreras-list"></div>
        </div>
    `;

    container.innerHTML = summary + listHeader;

    const list = document.getElementById('carreras-list');
    if (carreras.length === 0) {
        list.innerHTML = `<div class="bg-yellow-50 border border-yellow-200 p-4 rounded">No tienes carreras registradas.</div>`;
        return;
    }

    for (const c of carreras) {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow p-4 flex flex-col';
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <div class="text-lg font-semibold">${c.nombre || 'Carrera'}</div>
                    <div class="text-sm text-gray-500">Código: ${c.codigo} · Catálogo: ${c.catalogo || 'N/A'}</div>
                </div>
                <div class="text-right">
                    <a href="/frontend/malla/mallaCarrera.html?rut=${encodeURIComponent((data.rut)||'')}&codigo=${encodeURIComponent(c.codigo)}&catalogo=${encodeURIComponent(c.catalogo||'')}&nombre=${encodeURIComponent(c.nombre||'')}" class="text-blue-600 hover:underline">Ver malla</a>
                </div>
            </div>
            <div class="mt-3">
                <a href="/frontend/carreras/carrerasUsuario.html" class="text-sm text-gray-600 hover:underline">Ver detalles</a>
            </div>
        `;
        list.appendChild(card);
    }
}
