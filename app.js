// Gasto semanal configurable (por defecto 7€/semana = 1€/día)
let weeklySpend = parseFloat(localStorage.getItem('ch_weekly_spend')) || 7.00;

// Estado del usuario
let currentStreak = parseInt(localStorage.getItem('ch_streak')) || 0;
let totalCleanDays = parseInt(localStorage.getItem('ch_total_clean')) || 0;

// Historial de días
let historyData = {};
try {
  const saved = localStorage.getItem('ch_history');
  if (saved) {
    historyData = JSON.parse(saved);
  }
} catch (e) {
  historyData = {};
}

// Configuración inicial del calendario
let viewDate = new Date();
let currentYear = viewDate.getFullYear();
let currentMonth = viewDate.getMonth();

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

let sosInterval = null;
let sosRemaining = 180;

// Función para obtener la fecha local en formato YYYY-MM-DD
function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Inicialización de la aplicación
function init() {
  const spendInput = document.getElementById('weekly-spend');
  if (spendInput) {
    spendInput.value = weeklySpend.toFixed(2);
  }
  updateUI();
  renderCalendar();
}

// Actualizar gasto semanal desde el input
function updateWeeklySpend() {
  const spendInput = document.getElementById('weekly-spend');
  if (spendInput) {
    weeklySpend = parseFloat(spendInput.value) || 7.00;
    localStorage.setItem('ch_weekly_spend', weeklySpend);
    updateUI();
  }
}

// Refrescar todos los contadores de la interfaz
function updateUI() {
  const todayStr = formatDate(new Date());
  const todayEntry = historyData[todayStr] || { status: 'none', smoked: 0 };

  // Contador de racha consecutiva
  const streakEl = document.getElementById('streak-days');
  const streakTextEl = document.getElementById('streak-text');
  if (streakEl) streakEl.textContent = currentStreak;
  if (streakTextEl) streakTextEl.textContent = currentStreak === 1 ? 'Día limpio' : 'Días limpios';

  // Cigarros fumados en el día de hoy
  const smokedTodayEl = document.getElementById('cigs-smoked-today');
  if (smokedTodayEl) {
    smokedTodayEl.textContent = parseInt(todayEntry.smoked) || 0;
  }

  // Dinero ahorrado (gasto semanal / 7 * total de días limpios históricos acumulados)
  const dailyCost = weeklySpend / 7;
  const moneySaved = (Math.max(0, totalCleanDays) * dailyCost).toFixed(2);
  const moneySavedEl = document.getElementById('money-saved');
  if (moneySavedEl) {
    moneySavedEl.textContent = `${moneySaved} €`;
  }
}

/* ================= ACCIONES PRINCIPALES ================= */

// BOTÓN +: Registrar día limpio
function markDayClean() {
  const todayStr = formatDate(new Date());

  if (!historyData[todayStr]) {
    historyData[todayStr] = { status: 'clean', smoked: 0 };
    currentStreak += 1;
    totalCleanDays += 1;
  } else if (historyData[todayStr].status !== 'clean') {
    historyData[todayStr].status = 'clean';
    historyData[todayStr].smoked = 0;
    currentStreak += 1;
    totalCleanDays += 1;
  } else {
    alert('Hoy ya está registrado como día limpio.');
    return;
  }

  saveData();
  updateUI();
  renderCalendar();
}

// BOTÓN -: Fumé un cigarro (+1 cigarro hoy y reinicio de racha consecutiva)
function registerCigarette() {
  const todayStr = formatDate(new Date());

  if (!historyData[todayStr]) {
    historyData[todayStr] = { status: 'relapse', smoked: 1 };
  } else {
    // Si hoy estaba marcado como limpio y ahora fuma, se descuenta ese día limpio
    if (historyData[todayStr].status === 'clean' && totalCleanDays > 0) {
      totalCleanDays -= 1;
    }
    const currentSmoked = parseInt(historyData[todayStr].smoked) || 0;
    historyData[todayStr].smoked = currentSmoked + 1;
    historyData[todayStr].status = 'relapse';
  }

  // La racha consecutiva se pone a 0, pero el dinero ahorrado acumulado se conserva
  currentStreak = 0;

  saveData();
  updateUI();
  renderCalendar();
}

// Guardar en el almacenamiento local del navegador
function saveData() {
  localStorage.setItem('ch_streak', currentStreak);
  localStorage.setItem('ch_total_clean', totalCleanDays);
  localStorage.setItem('ch_history', JSON.stringify(historyData));
}

/* ================= CALENDARIO ================= */

function renderCalendar() {
  const monthTitleEl = document.getElementById('cal-month-title');
  if (monthTitleEl) {
    monthTitleEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  }

  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const todayStr = formatDate(new Date());
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Rellenar espacios vacíos al inicio del mes
  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    grid.appendChild(empty);
  }

  // Renderizar cada día del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';

    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = historyData[dayStr];

    if (dayStr === todayStr) cell.classList.add('today');

    if (dayData) {
      if (dayData.status === 'clean') {
        cell.classList.add('clean');
        cell.innerHTML = `<span>${d}</span>`;
      } else if (dayData.status === 'relapse') {
        cell.classList.add('relapse');
        const numSmoked = parseInt(dayData.smoked) || 1;
        cell.innerHTML = `<span>${d}</span><span class="day-cell-count">${numSmoked}c</span>`;
      }
    } else {
      cell.innerHTML = `<span>${d}</span>`;
    }

    grid.appendChild(cell);
  }
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

/* ================= SOS / RESPIRACIÓN ================= */

function openSOS() {
  const modal = document.getElementById('sos-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  sosRemaining = 180;
  clearInterval(sosInterval);
  updateSOSTimer();

  sosInterval = setInterval(() => {
    sosRemaining--;
    updateSOSTimer();

    const phaseEl = document.getElementById('sos-phase');
    if (phaseEl) {
      phaseEl.textContent = (sosRemaining % 6 >= 3) ? 'Exhala' : 'Inhala';
    }

    if (sosRemaining <= 0) {
      clearInterval(sosInterval);
      if (phaseEl) phaseEl.textContent = 'Pico superado';
    }
  }, 1000);
}

function updateSOSTimer() {
  const m = Math.floor(sosRemaining / 60);
  const s = sosRemaining % 60;
  const timerEl = document.getElementById('sos-timer');
  if (timerEl) {
    timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

function closeSOS() {
  clearInterval(sosInterval);
  const modal = document.getElementById('sos-modal');
  if (modal) modal.style.display = 'none';
}

// Iniciar aplicación
init();
