// Importaciones necesarias desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC8JDhWWp1jmqJvbu8s2Dsz0Yg2W0F61_s",
  authDomain: "reservas-universidad.firebaseapp.com",
  projectId: "reservas-universidad",
  storageBucket: "reservas-universidad.appspot.com", // Cambiado a .appspot.com
  messagingSenderId: "1020769094680",
  appId: "1:1020769094680:web:981ed8ea4a8b63be0b076d"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Referencias del DOM
const reservaForm = document.getElementById('formulario-reserva');
const tablaReservas = document.getElementById('tabla-reservas').getElementsByTagName('tbody')[0];
const contadorReservas = document.getElementById('contador-reservas');
const actualizarBtn = document.getElementById('actualizar-reservas');
const limpiarBtn = document.getElementById('limpiar-form');

// Estado de la aplicación
let reservasData = [];

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Autenticación anónima para Firestore
  signInAnonymously(auth)
    .then(() => {
      console.log("Autenticación anónima exitosa");
      initApp();
    })
    .catch((error) => {
      console.error("Error de autenticación:", error);
      showNotification("Error al conectar con la base de datos", "error");
    });
});

// Configuración inicial
function initApp() {
  setupEventListeners();
  cargarReservas();
}

// Configura los event listeners
function setupEventListeners() {
  reservaForm.addEventListener('submit', handleSubmit);
  actualizarBtn.addEventListener('click', cargarReservas);
  limpiarBtn.addEventListener('click', () => reservaForm.reset());
}

// Maneja el envío del formulario
async function handleSubmit(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('guardar-reserva');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-icon">⏳</span> Guardando...';

  try {
    const reserva = {
      salon: document.getElementById('salon').value.trim(),
      programa: document.getElementById('programa').value,
      semestre: parseInt(document.getElementById('semestre').value),
      fechaInicio: document.getElementById('fecha-inicio').value,
      semanaActual: parseInt(document.getElementById('semana-actual').value),
      temaActual: document.getElementById('tema-actual').value.trim(),
      horaInicio: document.getElementById('hora-inicio').value,
      horaFin: document.getElementById('hora-fin').value,
      responsable: document.getElementById('responsable').value.trim(),
      fechaRegistro: serverTimestamp()
    };

    // Validación básica
    if (reserva.horaInicio >= reserva.horaFin) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    // Guardar en Firestore
    await addDoc(collection(db, "reservas"), reserva);
    showNotification('Reserva guardada correctamente', 'success');
    reservaForm.reset();

  } catch (error) {
    console.error("Error al guardar:", error);
    showNotification(error.message || "Error al guardar la reserva", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span class="btn-icon">✓</span> Guardar Reserva';
  }
}

// Carga las reservas desde Firestore
function cargarReservas() {
  actualizarBtn.innerHTML = '<span class="btn-icon">⏳</span>';
  
  const q = query(collection(db, "reservas"), orderBy("fechaRegistro", "desc"));
  
  getDocs(q)
    .then((querySnapshot) => {
      reservasData = [];
      tablaReservas.innerHTML = '';
      
      if (querySnapshot.empty) {
        tablaReservas.innerHTML = '<tr class="empty-state"><td colspan="10">No hay reservas registradas</td></tr>';
        contadorReservas.textContent = 'Mostrando 0 reservas';
        return;
      }
      
      querySnapshot.forEach((doc) => {
        const reserva = doc.data();
        reservasData.push(reserva);
        
        const row = tablaReservas.insertRow();
        
        // Formatear fecha
        const fechaInicio = reserva.fechaInicio ? 
          new Date(reserva.fechaInicio).toLocaleDateString() : 'N/A';
        
        // Insertar datos
        row.insertCell(0).textContent = reserva.salon;
        row.insertCell(1).textContent = reserva.programa;
        row.insertCell(2).textContent = reserva.semestre;
        row.insertCell(3).textContent = fechaInicio;
        row.insertCell(4).textContent = reserva.semanaActual;
        row.insertCell(5).textContent = reserva.temaActual;
        row.insertCell(6).textContent = reserva.horaInicio;
        row.insertCell(7).textContent = reserva.horaFin;
        row.insertCell(8).textContent = reserva.responsable;
        
        // Botón de eliminar
        const actionsCell = row.insertCell(9);
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<span class="btn-icon">🗑️</span>';
        deleteBtn.className = 'btn-icon';
        deleteBtn.title = 'Eliminar reserva';
        deleteBtn.addEventListener('click', () => eliminarReserva(doc.id));
        actionsCell.appendChild(deleteBtn);
      });
      
      contadorReservas.textContent = `Mostrando ${reservasData.length} reservas`;
    })
    .catch((error) => {
      console.error("Error al cargar:", error);
      showNotification("Error al cargar las reservas", "error");
    })
    .finally(() => {
      actualizarBtn.innerHTML = '<span class="btn-icon">↻</span>';
    });
}

// Elimina una reserva
async function eliminarReserva(id) {
  if (!confirm('¿Estás seguro de eliminar esta reserva?')) return;
  
  try {
    await deleteDoc(doc(db, "reservas", id));
    showNotification('Reserva eliminada', 'success');
    cargarReservas();
  } catch (error) {
    console.error("Error al eliminar:", error);
    showNotification("Error al eliminar la reserva", "error");
  }
}

// Muestra notificaciones
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Estilos para notificaciones
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    transform: translateY(100px);
    opacity: 0;
    animation: slideIn 0.3s forwards;
  }
  .notification.success {
    background-color: #00b894;
  }
  .notification.error {
    background-color: #d63031;
  }
  .fade-out {
    animation: fadeOut 0.3s forwards;
  }
  @keyframes slideIn {
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes fadeOut {
    to { opacity: 0; transform: translateY(-50px); }
  }
`;
document.head.appendChild(notificationStyles);