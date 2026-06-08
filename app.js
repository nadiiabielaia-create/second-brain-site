// Initialize Lucide icons
lucide.createIcons();

// Init Intl Tel Input
let iti;
let payIti;
document.addEventListener("DOMContentLoaded", () => {
    const phoneInput = document.querySelector("#b-phone");
    if(phoneInput && window.intlTelInput) {
        iti = window.intlTelInput(phoneInput, {
            initialCountry: "ua",
            strictMode: true,
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js",
        });
    }
    const payPhoneInput = document.querySelector("#p-phone");
    if(payPhoneInput && window.intlTelInput) {
        payIti = window.intlTelInput(payPhoneInput, {
            initialCountry: "ua",
            strictMode: true,
            utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js",
        });
    }
});

// --- STATE ---
let currentStep = 1;
let currentQuestionIndex = 0;

// Metrics
let scores = {
    load: 50,    // Навантаження (вище = краще впорається, хоча зазвичай навантаження це стрес. Будемо вважати, що це "Стійкість до навантаження")
    focus: 50,   // Фокус
    system: 50   // Системність
};

// --- QUIZ DATA ---
const questions = [
    {
        question: "Як ви зазвичай зберігаєте нові ідеї чи важливу інформацію?",
        options: [
            { text: "Намагаюсь тримати в голові (і часто забуваю).", load: -10, focus: -10, system: -20 },
            { text: "Записую в купу різних нотаток чи чатів.", load: -5, focus: 0, system: -10 },
            { text: "Маю єдину систему входу за вашим методом.", load: 10, focus: 10, system: 20 }
        ]
    },
    {
        question: "Скільки часу ви можете працювати над однією задачею без відволікання?",
        options: [
            { text: "Менше 10 хвилин — постійно тягнусь до телефону.", load: -10, focus: -20, system: -5 },
            { text: "Близько 30 хвилин, але з великим зусиллям.", load: -5, focus: 0, system: 0 },
            { text: "Маю чіткі блоки глибокої роботи без сповіщень.", load: 10, focus: 20, system: 10 }
        ]
    },
    {
        question: "Як ви почуваєтесь в кінці типового робочого дня?",
        options: [
            { text: "Виснажений хаосом, ніби нічого не встиг.", load: -20, focus: -10, system: -10 },
            { text: "Втомлений, але результати є.", load: 0, focus: 5, system: 5 },
            { text: "Спокійний, бо все йде за моїм планом.", load: 20, focus: 10, system: 20 }
        ]
    },
    {
        question: "Чи знаєте ви свої найпродуктивніші години доби?",
        options: [
            { text: "Ні, працюю коли доводиться.", load: -10, focus: -10, system: -10 },
            { text: "Приблизно розумію, але не завжди підлаштовуюсь.", load: 0, focus: 0, system: 5 },
            { text: "Так, і планую найважче саме на цей час.", load: 10, focus: 20, system: 15 }
        ]
    }
];

// --- NAVIGATION LOGIC ---
function goToStep(step) {
    // Hide all steps
    [1, 2, 3, 4, 5].forEach(s => {
        const el = document.getElementById(`step-${s}`);
        if (el) el.classList.add('hidden');
        if (el) el.classList.remove('flex');
    });

    // Show target step
    const targetEl = document.getElementById(`step-${step}`);
    if (targetEl) {
        targetEl.classList.remove('hidden');
        targetEl.classList.add('flex');
    }

    currentStep = step;
    updateHeaderProgress(step);

    // Specific logic per step
    if (step === 2) {
        currentQuestionIndex = 0;
        scores = { load: 50, focus: 50, system: 50 }; // reset
        renderQuestion();
    } else if (step === 3) {
        renderResults();
    } else if (step === 5) {
        initCalendar();
    }
}

function updateHeaderProgress(step) {
    const indicator = document.getElementById('progress-indicator');
    const steps = {
        1: "Крок 1: Вступ",
        2: "Крок 2: Аудит",
        3: "Крок 3: Ваш Профіль",
        4: "Крок 4: Формати",
        5: "Крок 5: Бронювання"
    };
    indicator.textContent = steps[step];
}

// --- QUIZ LOGIC ---
function renderQuestion() {
    const container = document.getElementById('quiz-container');
    const q = questions[currentQuestionIndex];
    
    // Update progress bar
    const progress = ((currentQuestionIndex) / questions.length) * 100;
    document.getElementById('quiz-progress').style.width = `${progress}%`;

    let html = `
        <div class="fade-in w-full">
            <p class="text-sm font-semibold text-emerald-green mb-4">Питання ${currentQuestionIndex + 1} з ${questions.length}</p>
            <h3 class="text-2xl font-bold mb-8 text-deep-slate">${q.question}</h3>
            <div class="space-y-4">
    `;

    q.options.forEach((opt, idx) => {
        html += `
            <button onclick="handleAnswer(${idx})" class="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-green hover:bg-emerald-50 transition-all font-medium text-slate-700">
                ${opt.text}
            </button>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function handleAnswer(optionIndex) {
    const q = questions[currentQuestionIndex];
    const opt = q.options[optionIndex];
    
    // Update scores
    scores.load += opt.load;
    scores.focus += opt.focus;
    scores.system += opt.system;

    // Constrain scores
    scores.load = Math.max(10, Math.min(100, scores.load));
    scores.focus = Math.max(10, Math.min(100, scores.focus));
    scores.system = Math.max(10, Math.min(100, scores.system));

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        // Finish quiz
        document.getElementById('quiz-progress').style.width = `100%`;
        setTimeout(() => goToStep(3), 500);
    }
}

// --- RESULTS LOGIC ---
let radarChartInstance = null;

function renderResults() {
    // Determine profile type
    const titleEl = document.getElementById('result-title');
    const descEl = document.getElementById('result-description');
    const badgeEl = document.getElementById('result-status-badge');

    const total = scores.load + scores.focus + scores.system;
    
    if (total > 200) {
        badgeEl.textContent = "Системний потенціал";
        badgeEl.className = "inline-block px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-sm mb-4 self-start";
        titleEl.textContent = "Ваша система майже готова до масштабування";
        descEl.textContent = "Ви вже маєте базову дисципліну та непоганий фокус. Тепер нам потрібно налаштувати її так, щоб вона працювала на автоматизмі за принципами 'Атомних звичок' та другого мозку.";
    } else if (total < 120) {
        badgeEl.textContent = "Когнітивне перевантаження";
        badgeEl.className = "inline-block px-4 py-2 rounded-full bg-red-100 text-red-800 font-semibold text-sm mb-4 self-start";
        titleEl.textContent = "Час зупинити хаос";
        descEl.textContent = "Ваш мозок витрачає надто багато енергії на утримання інформації та боротьбу з відволіканнями. Необхідно терміново розвантажити пам'ять та впровадити 'Зовнішній мозок'.";
    } else {
        badgeEl.textContent = "Дефіцит фокусу";
        badgeEl.className = "inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm mb-4 self-start";
        titleEl.textContent = "Потенціал втрачається в рутині";
        descEl.textContent = "Ви намагаєтесь все встигнути, але часто працюєте в режимі реакції. Нам потрібно вибудувати блоки глибокої роботи та синхронізувати графік з вашими циркадними ритмами.";
    }

    // Render Radar Chart
    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    if (radarChartInstance) {
        radarChartInstance.destroy();
    }

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Стійкість', 'Фокус', 'Системність'],
            datasets: [{
                label: 'Ваш поточний рівень',
                data: [scores.load, scores.focus, scores.system],
                backgroundColor: 'rgba(16, 185, 129, 0.2)', // Emerald green with opacity
                borderColor: '#10b981',
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#10b981',
                borderWidth: 2,
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    pointLabels: {
                        font: { family: 'Inter', size: 14, weight: '600' },
                        color: '#1e293b'
                    },
                    ticks: {
                        display: false,
                        min: 0,
                        max: 100
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// --- CALENDAR & BOOKING LOGIC ---
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzv1I6RiL9zB_enLZjyna96j88UqnoHpcqmVzTV-FpWpG2Mbj-uWI03P7bN2MNFSffHZQ/exec"; 
let currentWeekOffset = 0;
let selectedSlot = null; // { timeStart, timeEnd, date }
let busySlots = []; // from backend

function showSuccessPanel(bookingData) {
    document.getElementById('booking-container').classList.add('hidden');
    document.getElementById('booking-success').classList.remove('hidden');
    document.getElementById('booking-success').classList.add('flex');
    
    if(bookingData && bookingData.slot) {
        const d = new Date(bookingData.slot);
        const options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' };
        document.getElementById('success-booked-time').textContent = d.toLocaleDateString('uk-UA', options);
    }
}

function initCalendar() {
    currentWeekOffset = 0;
    
    // Перевірка чи вже є бронювання
    const existing = localStorage.getItem('levelup_booking');
    if (existing) {
        showSuccessPanel(JSON.parse(existing));
    } else {
        document.getElementById('booking-container').classList.remove('hidden');
        document.getElementById('booking-success').classList.add('hidden');
        document.getElementById('booking-success').classList.remove('flex');
    }

    // Оновлення заголовку відповідно до вибраного тарифу
    const chosenTariff = sessionStorage.getItem('user_intent_tariff');
    const calendarHeader = document.querySelector('#step-5 h2');
    if (calendarHeader) {
        if (chosenTariff) {
            calendarHeader.innerText = `Бронювання розбору під формат: ${chosenTariff}`;
        } else {
            calendarHeader.innerText = "Оберіть свій час";
        }
    }

    const calInst = document.getElementById('calendar-instruction');
    if (calInst) {
        if (chosenTariff === 'Аудит' || chosenTariff === 'Когнітивний Аудит' || chosenTariff === 'Архітектор Систем') {
            calInst.innerText = "Оберіть зручний час для нашої діагностичної сесії:";
        } else {
            calInst.innerText = "Миттєве бронювання стратегічного розбору";
        }
    }

    loadWeek();
}

function cancelBooking() {
    if(confirm("Ви впевнені, що хочете скасувати поточне бронювання?")) {
        // Локальне видалення
        localStorage.removeItem('levelup_booking');
        
        // Повернення форми
        document.getElementById('booking-container').classList.remove('hidden');
        document.getElementById('booking-success').classList.add('hidden');
        document.getElementById('booking-success').classList.remove('flex');
        
        selectedSlot = null;
        renderCalendarUI();
        
        showAtomicNotification("Бронювання скасовано. Виберіть новий час.");
        
        // Опціонально: тут можна відправити fetch-запит на бекенд для скасування
        // fetch(WEBHOOK_URL + "?action=cancel", { ... })
    }
}

function changeWeek(offset) {
    currentWeekOffset += offset;
    loadWeek();
}

async function loadWeek() {
    renderCalendarUI();
    
    // Візуальний індикатор завантаження
    document.getElementById('calendar-loader').style.display = 'flex';
    
    try {
        // Запит до Google Apps Script для отримання реальних подій
        if (WEBHOOK_URL.startsWith("http")) {
            // Використовуємо JSONP для обходу будь-яких блокувань CORS
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const callbackName = 'jsonpCallback_' + Math.round(100000 * Math.random());
                
                // Тайм-аут на випадок, якщо Google поверне сторінку авторизації (HTML), яку браузер не зможе виконати як скрипт
                const timeoutId = setTimeout(() => {
                    cleanup();
                    showAtomicNotification("Тайм-аут синхронізації. Перевірте доступ 'Усі' в Apps Script.", false);
                    resolve(); // Продовжуємо з порожнім масивом, щоб не блокувати інтерфейс
                }, 5000);

                window[callbackName] = function(data) {
                    clearTimeout(timeoutId);
                    if (data.status === "success") {
                        busySlots = data.busySlots || [];
                    } else {
                        showAtomicNotification("Помилка від календаря: " + data.message, false);
                    }
                    cleanup();
                    resolve();
                };
                
                const cleanup = () => {
                    delete window[callbackName];
                    if (document.body.contains(script)) {
                        document.body.removeChild(script);
                    }
                };
                
                script.src = `${WEBHOOK_URL}?action=getSlots&callback=${callbackName}&t=${new Date().getTime()}`;
                
                script.onerror = function() {
                    clearTimeout(timeoutId);
                    cleanup();
                    resolve(); // Продовжуємо з порожнім масивом
                };
                
                document.body.appendChild(script);
            });
        } else {
            await new Promise(r => setTimeout(r, 600));
            busySlots = [];
        }
    } catch (e) {
        console.error("Мережева помилка завантаження слотів:", e);
        showAtomicNotification("Не вдалося завантажити розклад з календаря. " + e.message, false);
    }

    document.getElementById('calendar-loader').style.display = 'none';
    renderCalendarUI(); // Перемальовуємо вже з урахуванням зайнятих слотів
}


function getWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0 = Mon
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (currentWeekOffset * 7));
    
    const dates = [];
    for(let i=0; i<5; i++) { // Mon - Fri (5 days)
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function renderCalendarUI() {
    const dates = getWeekDates();
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    document.getElementById('calendar-month').textContent = `${monthNames[dates[0].getMonth()]} ${dates[0].getFullYear()}`;

    const headersContainer = document.getElementById('calendar-days-header');
    const slotsContainer = document.getElementById('calendar-slots');
    
    headersContainer.innerHTML = '';
    slotsContainer.innerHTML = '';

    const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт"];
    
    dates.forEach((date, i) => {
        // Headers
        const isToday = new Date().toDateString() === date.toDateString();
        headersContainer.innerHTML += `
            <div class="flex flex-col p-2 ${isToday ? 'text-emerald-green bg-emerald-50 rounded-lg' : ''}">
                <span class="text-xs uppercase">${dayNames[i]}</span>
                <span class="text-lg">${date.getDate()}</span>
            </div>
        `;

        // Slots Column
        const col = document.createElement('div');
        col.className = "flex flex-col gap-2";

        const now = new Date();

        for (let h = 0; h < 24; h++) {
            ['00', '30'].forEach(min => {
                const slotTime = new Date(date);
                slotTime.setHours(h, parseInt(min), 0, 0);

                if (slotTime > now) {
                    // Валідація за таймзоною Europe/Paris
                    const parisTimeString = slotTime.toLocaleString("en-US", {timeZone: "Europe/Paris"});
                    const parisDate = new Date(parisTimeString);
                    
                    const dayOfWeek = parisDate.getDay(); // 0 = Неділя, 6 = Субота
                    const hours = parisDate.getHours();

                    // ФІЛЬТР: Якщо це Субота (6) або Неділя (0) за Парижем — пропускаємо слот
                    if (dayOfWeek === 0 || dayOfWeek === 6) {
                        return;
                    }

                    // ФІЛЬТР: Робочі години з 9 до 19 за Парижем
                    if (hours < 9 || hours >= 19) {
                        return;
                    }

                    // Форматуємо відображення у локальному часі користувача
                    const localHour = slotTime.getHours();
                    const localMin = slotTime.getMinutes() === 0 ? '00' : '30';
                    const timeStr = `${localHour}:${localMin}`;
                    
                    // Перевірка чи слот вже зайнятий у Google Календарі
                    const isBusy = busySlots.some(busy => {
                        const slotMs = slotTime.getTime();
                        return (slotMs >= busy.start - 60000) && (slotMs < busy.end - 60000);
                    });

                    // Якщо слот зайнятий — відображаємо його у стані disabled
                    if (isBusy) {
                        const disabledBtn = document.createElement('button');
                        disabledBtn.type = 'button';
                        disabledBtn.className = "w-full py-2 text-sm rounded-lg border border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed flex items-center justify-center gap-1 font-medium transition-all";
                        disabledBtn.disabled = true;
                        disabledBtn.innerHTML = `<i data-lucide="lock" class="w-3.5 h-3.5 text-slate-400"></i> ${timeStr}`;
                        col.appendChild(disabledBtn);
                        return;
                    }

                    const btn = document.createElement('button');
                    
                    // Check if selected
                    const isSelected = selectedSlot && selectedSlot.date.getTime() === slotTime.getTime();
                    
                    if (isSelected) {
                        btn.className = "w-full py-2 text-sm rounded-lg font-medium transition-all bg-emerald-green text-white shadow-md scale-105";
                        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4 inline"></i> ${timeStr}`;
                    } else {
                        btn.className = "w-full py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:border-emerald-green hover:text-emerald-green transition-all bg-white font-medium";
                        btn.textContent = timeStr;
                    }

                    btn.onclick = () => selectSlot(slotTime);
                    col.appendChild(btn);
                }
            });
        }
        slotsContainer.appendChild(col);
    });
    
    // Діагностична інформація
    let debugEl = document.getElementById('debug-info');
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'debug-info';
        debugEl.className = 'col-span-full text-xs text-slate-400 mt-4 text-center';
        slotsContainer.appendChild(debugEl);
    }
    debugEl.textContent = `Синхронізовано. Зайнятих подій знайдено у вашому календарі: ${busySlots.length}`;

    lucide.createIcons();
}

function selectSlot(dateObj) {
    // Un-click logic
    if (selectedSlot && selectedSlot.date.getTime() === dateObj.getTime()) {
        selectedSlot = null;
        document.getElementById('booking-form').classList.add('opacity-50', 'pointer-events-none');
        document.getElementById('selected-slot-info').classList.add('hidden');
    } else {
        selectedSlot = { date: dateObj };
        document.getElementById('booking-form').classList.remove('opacity-50', 'pointer-events-none');
        document.getElementById('selected-slot-info').classList.remove('hidden');
        
        const options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' };
        document.getElementById('selected-slot-text').textContent = dateObj.toLocaleDateString('uk-UA', options);
    }
    renderCalendarUI();
}

document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    // LocalStorage Check
    if (localStorage.getItem('levelup_booking')) {
        showAtomicNotification("У вас вже є заброньована сесія.", false);
        return;
    }

    const name = document.getElementById('b-name').value.trim();
    
    // Валідація імені
    if (!name || name.length < 2) {
        showAtomicNotification("Будь ласка, введіть коректне ім'я.", false);
        return;
    }

    // Строга валідація телефону за маскою країни
    if (iti && !iti.isValidNumber()) {
        showAtomicNotification("Будь ласка, введіть повністю коректний номер телефону.", false);
        return;
    }

    const phone = iti ? iti.getNumber() : document.getElementById('b-phone').value;
    const email = document.getElementById('b-email').value.trim();
    const tariff = sessionStorage.getItem('user_intent_tariff') || "Аудит";

    const payload = {
        name, phone, email, tariff,
        slot: selectedSlot.date.toISOString(),
        quizScores: scores
    };

    // Optimistic UI confirmation
    localStorage.setItem('levelup_booking', JSON.stringify(payload));
    showAtomicNotification(`Вітаю, ${name}! Твій час — ${selectedSlot.date.getHours()}:${selectedSlot.date.getMinutes() === 0 ? '00' : '30'}. Твій нейро-профіль уже чекає на розбір.`);
    
    document.getElementById('booking-form').reset();
    selectedSlot = null;
    renderCalendarUI();
    
    showSuccessPanel(payload);

    // Async push to backend
    if (WEBHOOK_URL.startsWith("http")) {
        try {
            fetch(WEBHOOK_URL, {
                method: "POST",
                mode: 'no-cors', // Because GAS might have cors issues from localhost
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Sync error", err);
        }
    }
});

function showAtomicNotification(text, success = true) {
    const notif = document.getElementById('atomic-notification');
    document.getElementById('atomic-text').textContent = text;
    
    notif.classList.remove('opacity-0', 'translate-y-24');
    notif.classList.add('opacity-100', 'translate-y-0');
    
    setTimeout(() => {
        notif.classList.add('opacity-0', 'translate-y-24');
        notif.classList.remove('opacity-100', 'translate-y-0');
    }, 5000);
}

/**
 * Функція обробки вибору тарифу
 * @param {string} tariffName - Назва обраного тарифного плану
 */
function selectTariffAndProceed(tariffName) {
    // 1. Маркетинговий трекінг: фіксуємо, який саме тариф зацікавив користувача
    sessionStorage.setItem('user_intent_tariff', tariffName);
    
    // 2. Якщо підключено Google Analytics / Facebook Pixel — відправляємо подію
    if (typeof gtag !== 'undefined') {
        gtag('event', 'select_content', {
            content_type: 'tariff',
            item_id: tariffName
        });
    }

    // 3. Динамічно змінюємо заголовок та підзаголовок на кроці 5
    const calendarHeader = document.querySelector('#step-5 h2');
    if (calendarHeader) {
        calendarHeader.innerText = `Бронювання розбору під формат: ${tariffName}`;
    }

    const calInst = document.getElementById('calendar-instruction');
    if (calInst) {
        if (tariffName === 'Аудит' || tariffName === 'Когнітивний Аудит' || tariffName === 'Архітектор Систем') {
            calInst.innerText = "Оберіть зручний час для нашої діагностичної сесії:";
        } else {
            calInst.innerText = "Миттєве бронювання стратегічного розбору";
        }
    }

    // 4. М'яко переводимо користувача на крок вибору часу (Step 5)
    goToStep(5);
}

/**
 * Перегляд форматів участі з відправкою GA події
 */
function clickViewFormats() {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'click_view_formats');
    }
    goToStep(4);
}

/**
 * Відкрити модальне вікно замовлення кастомізації
 */
function openSystemModal() {
    const modal = document.getElementById('system-modal');
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        const card = modal.querySelector('div');
        if (card) {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }
    }
}

/**
 * Закрити модальне вікно замовлення кастомізації
 */
function closeSystemModal() {
    const modal = document.getElementById('system-modal');
    if (modal) {
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
        const card = modal.querySelector('div');
        if (card) {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
        }
    }
}

/**
 * Відправка даних ліда з модального вікна
 */
async function submitSystemLead(event) {
    event.preventDefault();
    
    const contact = document.getElementById('lead-contact').value.trim();
    if (!contact) return;

    // Розрахунок профілю на основі балів
    const total = scores.load + scores.focus + scores.system;
    let profileName = "Дефіцит фокусу";
    let profileTag = "Профіль_Дистракція";
    
    if (total > 200) {
        profileName = "Системний потенціал";
        profileTag = "Профіль_Потенціал";
    } else if (total < 120) {
        profileName = "Когнітивне перевантаження";
        profileTag = "Профіль_Перевантаження";
    }

    const payload = {
        action: "lead",
        contact: contact,
        profile: profileName,
        tags: ["Замовлення_Системи_В_Розробці", profileTag]
    };

    // Закриваємо модалку та показуємо оптимістичне підтвердження
    closeSystemModal();
    document.getElementById('system-lead-form').reset();
    showAtomicNotification("Дякуємо! Вашу систему безкоштовно заброньовано. Ми надішлемо її після релізу.");

    // Відправляємо асинхронно на бекенд Google Apps Script
    if (WEBHOOK_URL.startsWith("http")) {
        try {
            fetch(WEBHOOK_URL, {
                method: "POST",
                mode: 'no-cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Помилка відправки ліда:", err);
        }
    }
}

// --- WAYFORPAY PAYMENT INTEGRATION ---
let currentPaymentTariff = "";
let currentPaymentAmount = 0;
let currentPaymentProductName = "";

function openPaymentModal(tariffName, amount, productName) {
    currentPaymentTariff = tariffName;
    currentPaymentAmount = amount;
    currentPaymentProductName = productName;

    document.getElementById('payment-product-title').textContent = productName;
    document.getElementById('payment-product-price').textContent = `${amount} UAH`;

    // Show note for Neuro-Sprint deposit
    const noteEl = document.getElementById('payment-product-note');
    if (noteEl) {
        if (tariffName === 'Нейро-Спринт') {
            noteEl.textContent = "Завдаток 700 UAH для бронювання місця. Решта (4500 UAH) сплачується після старту групи. Міні-курс ви отримаєте одразу після оплати.";
            noteEl.classList.remove('hidden');
        } else {
            noteEl.classList.add('hidden');
        }
    }

    // Clear form fields
    document.getElementById('p-name').value = "";
    document.getElementById('p-email').value = "";
    if (payIti) {
        payIti.setNumber("");
    } else {
        document.getElementById('p-phone').value = "";
    }
    document.getElementById('p-gdpr').checked = false;

    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.add('opacity-100', 'pointer-events-auto');
        const card = modal.querySelector('div');
        if (card) {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }
    }
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
        const card = modal.querySelector('div');
        if (card) {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
        }
    }
}

async function getPaymentSignature(ref, date, amount, currency, prodName) {
    if (!WEBHOOK_URL || !WEBHOOK_URL.startsWith("http")) {
        throw new Error("Google Apps Script URL is not configured.");
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'jsonpPaymentSig_' + Math.round(100000 * Math.random());
        
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error("Тайм-аут генерації підпису. Перевірте доступність Google Apps Script."));
        }, 8000);

        window[callbackName] = function(data) {
            clearTimeout(timeoutId);
            cleanup();
            if (data.status === "success" && data.signature) {
                resolve(data.signature);
            } else {
                reject(new Error(data.message || "Не вдалося отримати підпис від сервера."));
            }
        };
        
        const cleanup = () => {
            delete window[callbackName];
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };

        const encodedProdName = encodeURIComponent(prodName);
        script.src = `${WEBHOOK_URL}?action=getSignature&orderReference=${ref}&orderDate=${date}&amount=${amount}&currency=${currency}&productName=${encodedProdName}&callback=${callbackName}&t=${new Date().getTime()}`;
        
        script.onerror = function() {
            clearTimeout(timeoutId);
            cleanup();
            reject(new Error("Помилка підключення до сервера Google Apps Script."));
        };
        
        document.body.appendChild(script);
    });
}

async function submitPayment(event) {
    event.preventDefault();

    const name = document.getElementById('p-name').value.trim();
    const email = document.getElementById('p-email').value.trim();
    
    if (!name || name.length < 2) {
        showAtomicNotification("Будь ласка, введіть коректне ім'я.", false);
        return;
    }

    if (payIti && !payIti.isValidNumber()) {
        showAtomicNotification("Будь ласка, введіть коректний номер телефону.", false);
        return;
    }

    const phone = payIti ? payIti.getNumber() : document.getElementById('p-phone').value;
    const gdpr = document.getElementById('p-gdpr').checked;
    if (!gdpr) {
        showAtomicNotification("Ви повинні погодитися з Публічною офертою.", false);
        return;
    }

    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] || "Клієнт";
    const lastName = nameParts.slice(1).join(" ") || "Клієнт";

    const btnSubmit = document.getElementById('btn-submit-payment');
    const originalBtnText = btnSubmit.innerHTML;
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"></span> Обробка...`;

    const isInbox = currentPaymentTariff === "Цифровий Inbox";
    const refPrefix = isInbox ? "INBOX" : "AUDIT";
    const ref = `WFP_${refPrefix}_${Date.now()}`;
    const date = Math.floor(Date.now() / 1000);
    const amount = currentPaymentAmount.toString();

    // Зберегти результати аудиту та контакти клієнта у "Ліди" як ініційовану оплату
    const totalScore = scores.load + scores.focus + scores.system;
    let profileName = "Дефіцит фокусу";
    let profileTag = "Профіль_Дистракція";
    if (totalScore > 200) {
        profileName = "Системний потенціал";
        profileTag = "Профіль_Потенціал";
    } else if (totalScore < 120) {
        profileName = "Когнітивне перевантаження";
        profileTag = "Профіль_Перевантаження";
    }

    const leadPayload = {
        action: "lead",
        contact: `Ім'я: ${name}, Email: ${email}, Тел: ${phone}`,
        profile: `${profileName} (Стійкість: ${scores.load}, Фокус: ${scores.focus}, Системність: ${scores.system})`,
        tags: [`Ініційовано_Оплату_${refPrefix}`, profileTag]
    };

    if (WEBHOOK_URL.startsWith("http")) {
        try {
            fetch(WEBHOOK_URL, {
                method: "POST",
                mode: 'no-cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(leadPayload)
            });
        } catch (err) {
            console.error("Помилка запису ліда перед оплатою:", err);
        }
    }
    const currency = "UAH";
    const prodName = currentPaymentProductName;

    try {
        const signature = await getPaymentSignature(ref, date, amount, currency, prodName);

        closePaymentModal();

        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;

        const wayforpay = new Wayforpay();
        wayforpay.run({
            merchantAccount: "t_me_d09a8",
            merchantDomainName: "nadiabielaia-create.github.io",
            authorizationType: "SimpleSignature",
            merchantSignature: signature,
            orderReference: ref,
            orderDate: date,
            amount: amount,
            currency: currency,
            productName: [prodName],
            productPrice: [amount],
            productCount: [1],
            clientFirstName: firstName,
            clientLastName: lastName,
            clientEmail: email,
            clientPhone: phone
        },
        function (response) {
            if (isInbox || currentPaymentTariff === "Нейро-Спринт") {
                window.location.href = "https://nadiabielaia-create.github.io/second-brain-site/success.html";
            } else {
                sessionStorage.setItem('user_intent_tariff', 'Когнітивний Аудит');
                sessionStorage.setItem('payment_success_audit', 'true');
                
                setTimeout(() => {
                    const bNameInput = document.getElementById('b-name');
                    const bEmailInput = document.getElementById('b-email');
                    
                    if (bNameInput) bNameInput.value = name;
                    if (bEmailInput) bEmailInput.value = email;
                    if (iti && payIti) {
                        iti.setNumber(payIti.getNumber());
                    } else {
                        const bPhoneInput = document.getElementById('b-phone');
                        if (bPhoneInput) bPhoneInput.value = phone;
                    }
                    
                    const bForm = document.getElementById('booking-form');
                    if (bForm) {
                        bForm.classList.remove('opacity-50', 'pointer-events-none');
                    }
                }, 100);

                goToStep(5);
                showAtomicNotification("Оплата успішна! Будь ласка, оберіть час для вашої сесії в календарі.");
            }
        },
        function (response) {
            showAtomicNotification("Платіж відхилено. Спробуйте іншу картку або зверніться до банку.", false);
        },
        function (response) {
            showAtomicNotification("Оплата в обробці. Зачекайте завершення транзакції.");
        });

    } catch (err) {
        console.error(err);
        showAtomicNotification(err.message || "Помилка при ініціалізації платежу.", false);
        
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;
    }
}
