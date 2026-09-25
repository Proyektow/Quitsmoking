// Gasto semanal configurable (por defecto 7€/semana = 1€/día)
let weeklySpend = parseFloat(localStorage.getItem('ch_weekly_spend')) || 7.00;

// Estado del usuario
let currentStreak = parseInt(localStorage.getItem('ch_streak')) || 0;
let totalCleanDays = parseInt(localStorage.getItem('ch_total_clean')) || 0;

// Historial: { "YYYY-MM-DD": { status: 'clean'|'relapse', smoked: 1 } }
let historyData = JSON.parse(localStorage.getItem('ch_history')) || {};

// Calendario
let viewDate = new Date();
let currentYear = viewDate.getFullYear();
let currentMonth = viewDate.getMonth();

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

let sosInterval = null;
let sosRemaining = 180;

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function init() {
  document.getElementById('weekly-spend').value = weeklySpend.toFixed(2);
  updateUI();
  renderCalendar();
}

function updateWeeklySpend() {
  weeklySpend = parseFloat(document.getElementById('weekly-spend').value) || 7.00;
  localStorage.setItem('ch_weekly_spend', weeklySpend);
  updateUI();
}

function updateUI() {
  const todayStr = formatDate(new Date());
  const todayEntry = historyData[todayStr] || { status: 'none', smoked: 0 };

  // Racha
  document.getElementById('streak-days').textContent = currentStreak;
  document.getElementById('streak-text').textContent = currentStreak === 1 ? 'Día limpio' : 'Días limpios';

  // Cigarros fumados hoy
  document.getElementById('cigs-smoked-today').textContent = todayEntry.smoked || 0;

  // Cálculo de ahorro: (Gasto semanal / 7) * Días limpios acumulados en total
  const dailyCost = weeklySpend / 7;
  const moneySaved = (totalCleanDays * dailyCost).toFixed(2);
  document.getElementById('money-saved').textContent = `${moneySaved} €`;
}

/* ================= ACCIONES ================= */

// BOTÓN +: Registrar día limpio
function markDayClean() {
  const todayStr = formatDate(new Date());

  if (!historyData[todayStr]) {
    historyData[todayStr] = { status: 'clean', smoked: 0 };
    currentStreak += 1;
    totalCleanDays += 1;
  } else if (historyData[todayStr].status !== 'clean') {
    // Corregir un día que estaba marcado como recaída
    historyData[todayStr].status = 'clean';
    historyData[todayStr].smoked = 0;
    currentStreak += 1;
    totalCleanDays += 1;
  } else {
    alert('Hoy ya está marcado como día limpio.');
    return;
  }

  saveData();
  updateUI();
  renderCalendar();
}

// BOTÓN -: Fumé un cigarro
function registerCigarette() {
  const todayStr = formatDate(new Date());

  if (!historyData[todayStr]) {
    historyData[todayStr] = { status: 'relapse', smoked: 1 };
  } else {
    // Si ya era día limpio hoy y ahora fuma, restamos el día del acumulado
    if (historyData[todayStr].status === 'clean' && totalCleanDays > 0) {
      totalCleanDays -= 1;
    }
    historyData[todayStr].status = 'relapse';
    historyData[todayStr].smoked = (historyData[todayStr].smoked || 0) + 1;
  }

  // Se resetea la racha consecutiva, pero se conserva totalCleanDays histórico
  currentStreak = 0;

  saveData();
  updateUI();
  renderCalendar();
}

function saveData() {
  localStorage.setItem('ch_streak', currentStreak);
  localStorage.setItem('ch_total_clean', totalCleanDays);
  localStorage.setItem('ch_history', JSON.stringify(historyData));
}

/* ================= CALENDARIO ================= */

function renderCalendar() {
  document.getElementById('cal-month-title').textContent = `${monthNames[currentMonth]} ${currentYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const todayStr = formatDate(new Date());
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    grid.appendChild(empty);
  }

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
        cell.innerHTML = `<span>${d}</span><span class="day-cell-count">${dayData.smoked}c</span>`;
      }
    } else {
      cell.innerHTML = `<span>${d}</span>`;
    }

    grid.appendChild(cell);
  }
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
}

/* ================= SOS / RESPIRACIÓN ================= */

function openSOS() {
  document.getElementById('sos-modal').style.display = 'flex';
  sosRemaining = 180;
  clearInterval(sosInterval);
  updateSOSTimer();

  sosInterval = setInterval(() => {
    sosRemaining--;
    updateSOSTimer();

    const phase = (sosRemaining % 6 >= 3) ? 'Exhala' : 'Inhala';
    document.getElementById('sos-phase').textContent = phase;

    if (sosRemaining <= 0) {
      clearInterval(sosInterval);
      document.getElementById('sos-phase').textContent = 'Pico superado';
    }
  }, 1000);
}

function updateSOSTimer() {
  const m = Math.floor(sosRemaining / 60);
  const s = sosRemaining % 60;
  document.getElementById('sos-timer').textContent = 
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function closeSOS() {
  clearInterval(sosInterval);
  document.getElementById('sos-modal').style.display = 'none';
}

init();