// Initialize Lucide icons
lucide.createIcons();

// Init Intl Tel Input
let iti;
let payIti;

// --- DOM CONTENT LOADED (Маски телефонів, Редірект після оплати, Ініціалізація мови) ---
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

    // Перевірка параметрів URL для повернення після успішної оплати аудиту
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success' && urlParams.get('product') === 'audit') {
        sessionStorage.setItem('user_intent_tariff', 'Когнітивний Аудит');
        sessionStorage.setItem('levelup_paid_audit', 'true');
        
        // Видаляємо query-параметри з адресного рядка без перезавантаження сторінки
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Переходимо на крок 5 (Календар)
        goToStep(5);
        
        // Розблоковуємо форму бронювання
        const bForm = document.getElementById('booking-form');
        if (bForm) {
            bForm.classList.remove('opacity-50', 'pointer-events-none');
        }
        
        // Попередньо заповнюємо дані клієнта з sessionStorage, якщо вони збереглися перед оплатою
        setTimeout(() => {
            const savedName = sessionStorage.getItem('pay_client_name');
            const savedEmail = sessionStorage.getItem('pay_client_email');
            const savedPhone = sessionStorage.getItem('pay_client_phone');
            if (savedName) {
                const bNameInput = document.getElementById('b-name');
                if (bNameInput) bNameInput.value = savedName;
            }
            if (savedEmail) {
                const bEmailInput = document.getElementById('b-email');
                if (bEmailInput) bEmailInput.value = savedEmail;
            }
            if (savedPhone && iti) {
                iti.setNumber(savedPhone);
            }
            
            const successAlerts = {
                ua: "Оплата успішна! Будь ласка, оберіть час для вашої сесії в календарі.",
                en: "Payment successful! Please choose a time for your session in the calendar.",
                fr: "Paiement réussi ! Veuillez choisir un horaire pour votre séance dans le calendrier."
            };
            showAtomicNotification(successAlerts[currentLanguage] || successAlerts['ua']);
        }, 800);
    }

    // Запуск дефолтної мови на старті
    changeLanguage(currentLanguage);
});

// --- STATE ---
let currentStep = 1;
let currentQuestionIndex = 0;
let currentLanguage = localStorage.getItem('levelup_lang') || 'ua';

// Metrics
let scores = {
    load: 50,    // Стійкість до навантаження
    focus: 50,   // Фокус
    system: 50   // Системність
};

// --- TRANSLATIONS DICTIONARY ---
const TRANSLATIONS = {
    ua: {
        hero_title: "Перестаньте боротися з хаосом<br/> <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-emerald-green to-teal-500\">Почніть керувати мозком</span>",
        hero_desc: "Ваша продуктивність залежить не від сили волі, а від налаштування вашої біологічної та цифрової систем. Пройдіть швидкий аудит, щоб побачити свої «дірки» в системі",
        hero_btn: "Почати аудит",
        card1_title: "Звільніть свій розум",
        card1_desc: "Ми створимо ваш \"Зовнішній мозок\". Простір, де ідеї не губляться, а префронтальна кора відпочиває від запам'ятовування.",
        card2_title: "Від мрій до кліків",
        card2_desc: "Розбиваємо global цілі на мікро-кроки. Ваш мозок перестане вмикати опір і почне діяти автоматично.",
        card3_title: "Стан потоку",
        card3_desc: "Налаштуємо графік за циркадними ритмами. Робіть важливе на піку енергії, а не коли доведеться.",
        card4_title: "Розумна дисципліна",
        card4_desc: "Система зворотного зв'язку. Аналізуємо те, що заважає рости, і перетворюємо помилки на стратегію.",
        result_heading: "Ваш Нейро-Профіль",
        result_subheading: "Ось як ваш мозок взаємодіє з навантаженням зараз",
        result_list_title: "На стратегічному розборі ми:",
        result_bullet1: "Визначимо індивідуальні \"дірки\" у вашій продуктивності",
        result_bullet2: "Підберемо ваш тип трекера (цифровий чи аналоговий)",
        result_bullet3: "Побудуємо план захисту вашої енергії",
        result_btn_formats: "Переглянути та обрати формат участі ➔",
        result_btn_customize: "Підібрати систему під мій результат",
        pricing_back: "Назад до мого нейро-профілю",
        pricing_title: "ТАРИФИ ТА ФОРМАТИ НАВЧАННЯ",
        pricing_subtitle: "Оберіть шлях до своєї продуктивності",
        t1_badge: "Самостійно",
        t1_bullet1: "4 базові уроки системи CODE",
        t1_bullet2: "Практичні гайди та завдання",
        t1_bullet3: "Доступ до шаблонів та баз даних",
        t1_btn: "Отримати доступ",
        t2_group: "Групова практика",
        t2_badge: "3 тижні щільного фокусу",
        t2_bullet1: "Все, що у Тарифі 1",
        t2_bullet2: "Формат: 1 урок-інструкція + 1 жива сесія-розбір на тиждень",
        t2_bullet3: "Робота в групі (3-10 людей)",
        t2_bullet4: "Перевірка домашніх завдань",
        t2_btn: "Забронювати місце в групі",
        t3_badge: "Індивідуально під ключ",
        t3_price: "За запитом",
        t3_bullet1: "Повна кастомізація під ваші бізнес- та життєві процеси",
        t3_bullet2: "Інтеграція AI-агентів для рутинних завдань",
        t3_bullet3: "Особистий супровід та менторинг",
        t3_bullet4: "Адаптація під РДУГ та навантаження",
        t3_btn: "Подати заявку",
        audit_badge: "ПОТРЕБУЄТЕ ШВИДКОГО РІШЕННЯ БЕЗ ПРОХОДЖЕННЯ КУРСІВ?",
        audit_title: "Персональний когнітивний аудит",
        audit_desc: "60-хвилинна глибока діагностика з автором системи. Ми знайдемо головні «петлі», які спалюють до 40% вашої енергії, і складемо покроковий план виходу з хаосу.",
        audit_note: "* Якщо ви перейдете в індивідуальний супровід, вартість аудиту враховується в ціну",
        audit_btn: "👉 Забронювати сесію в календарі",
        cal_back: "Повернутися до тарифів та форматів",
        cal_title: "Оберіть свій час",
        cal_form_pib: "ПІБ",
        cal_form_phone: "Телефон",
        cal_form_email: "Email",
        cal_form_btn: "Підтвердити бронювання",
        cal_sync_label: "Синхронізація розкладу...",
        succ_header: "Заброньовано!",
        succ_time_prefix: "Ваш обраний час:",
        succ_next_question: "Куди бажаєте перейти далі?",
        succ_btn_profile: "Мій Нейро-Профіль",
        succ_btn_tariffs: "Тарифи",
        succ_btn_main: "На головну",
        succ_btn_cancel: "Скасувати або змінити час",
        modal_custom_title: "🧠 Функціонал кастомізації систем — у розробці!",
        modal_custom_desc1: "Наша нейромережа зараз навчається автоматично збирати персональний стек інструментів під індивідуальні дефіцити вашої префронтальної кори.",
        modal_custom_desc2: "Бажаєте отримати вашу систему першими безкоштовно після релізу?",
        modal_custom_desc3: "Залиште ваш Telegram або Email, і ми автоматично надішлемо систему, щойно вона пройде бета-тест.",
        modal_custom_gdpr: "Я згоден на обробку персональних даних згідно з <a href=\"oferta.pdf\" target=\"_blank\" class=\"underline hover:text-teal-600\">Політикою Конфіденційності</a>.",
        modal_custom_btn: "Забронювати мою систему безкоштовно",
        modal_pay_title: "Оформлення замовлення",
        modal_pay_gdpr: "Я згоден на обробку персональних даних та погоджуюсь з умовами <a href=\"oferta.pdf\" target=\"_blank\" class=\"underline hover:text-emerald-green\">Публічної оферти</a>.",
        modal_pay_btn: "Перейти до оплати",
        foot_tg: "Telegram Канал",
        foot_oferta: "ДОГОВІР ПУБЛІЧНОЇ ОФЕРТИ",
        foot_copy: "Всі права захищено."
    },
    en: {
        hero_title: "Stop fighting the chaos<br/> <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-emerald-green to-teal-500\">Start managing your brain</span>",
        hero_desc: "Your productivity does not depend on willpower, but on fine-tuning your biological and digital systems. Take a quick audit to see the \"leaks\" in your system.",
        hero_btn: "Start audit",
        card1_title: "Free your mind",
        card1_desc: "We will build your \"Second Brain\" — a space where ideas never get lost, giving your prefrontal cortex a break from memorization.",
        card2_title: "From dreams to clicks",
        card2_desc: "We break down global goals into micro-steps. Your brain will stop resisting and start acting automatically.",
        card3_title: "Flow state",
        card3_desc: "We align your schedule with your circadian rhythms. Work on what matters at your peak energy level, not just whenever.",
        card4_title: "Smart discipline",
        card4_desc: "Feedback loop system. We analyze what holds you back and turn mistakes into a clear growth strategy.",
        result_heading: "Your Neuro-Profile",
        result_subheading: "Here is how your brain interacts with workload currently",
        result_list_title: "During our strategic review, we will:",
        result_bullet1: "Identify individual leaks in your productivity",
        result_bullet2: "Choose your tracker type (digital or analog)",
        result_bullet3: "Build a personalized energy protection plan",
        result_btn_formats: "View and choose formats ➔",
        result_btn_customize: "Tailor a system to my results",
        pricing_back: "Back to my neuro-profile",
        pricing_title: "TARIFFS & STUDY FORMATS",
        pricing_subtitle: "Choose your path to productivity",
        t1_badge: "Self-paced",
        t1_bullet1: "4 basic lessons of the CODE system",
        t1_bullet2: "Practical guides and tasks",
        t1_bullet3: "Access to templates and databases",
        t1_btn: "Get access",
        t2_group: "Group practice",
        t2_badge: "3 weeks of deep focus",
        t2_bullet1: "Everything in Tariff 1",
        t2_bullet2: "Format: 1 instruction lesson + 1 live review session per week",
        t2_bullet3: "Group work (3-10 people)",
        t2_bullet4: "Homework reviews",
        t2_btn: "Book a spot in the group",
        t3_badge: "1-on-1 turn-key",
        t3_price: "On request",
        t3_bullet1: "Full customization for your business and life processes",
        t3_bullet2: "AI agents integration for routine tasks",
        t3_bullet3: "Personal guidance and mentoring",
        t3_bullet4: "Adaptation for ADHD and high workloads",
        t3_btn: "Apply now",
        audit_badge: "NEED A QUICK SOLUTION WITHOUT TAKING COURSES?",
        audit_title: "Personal cognitive audit",
        audit_desc: "A 60-minute deep diagnostic session with the system author. We will locate the main leaks burning up to 40% of your energy and build a step-by-step escape route from chaos.",
        audit_note: "* If you upgrade to 1-on-1 guidance, the cost of this audit will be credited towards the price",
        audit_btn: "👉 Book a session in the calendar",
        cal_back: "Return to tariffs and formats",
        cal_title: "Choose your time",
        cal_form_pib: "Full Name",
        cal_form_phone: "Phone",
        cal_form_email: "Email",
        cal_form_btn: "Confirm Booking",
        cal_sync_label: "Synchronizing schedule...",
        succ_header: "Booked!",
        succ_time_prefix: "Your chosen time:",
        succ_next_question: "Where would you like to go next?",
        succ_btn_profile: "My Neuro-Profile",
        succ_btn_tariffs: "Tariffs",
        succ_btn_main: "To Homepage",
        succ_btn_cancel: "Cancel or reschedule booking",
        modal_custom_title: "🧠 System customization feature is in development!",
        modal_custom_desc1: "Our neural network is currently learning to automatically compile a personal stack of tools tailored to the individual deficits of your prefrontal cortex.",
        modal_custom_desc2: "Would you like to be the first to receive your system for free after release?",
        modal_custom_desc3: "Leave your Telegram or Email, and we will automatically send you the system as soon as it passes beta testing.",
        modal_custom_gdpr: "I agree to the processing of my personal data under the <a href=\"oferta.pdf\" target=\"_blank\" class=\"underline hover:text-teal-600\">Privacy Policy</a>.",
        modal_custom_btn: "Book my system for free",
        modal_pay_title: "Checkout",
        modal_pay_gdpr: "I consent to the processing of personal data and agree to the <a href=\"oferta.pdf\" target=\"_blank\" class=\"underline hover:text-emerald-green\">Public Offer</a>.",
        modal_pay_btn: "Proceed to payment",
        foot_tg: "Telegram Channel",
        foot_oferta: "PUBLIC OFFER CONTRACT",
        foot_copy: "All rights reserved."
    },
    fr: {
        hero_title: "Arrêtez de lutter contre le chaos<br/> <span class=\"text-transparent bg-clip-text bg-gradient-to-r from-emerald-green to-teal-500\">Gérez votre cerveau</span>",
        hero_desc: "Votre productivité ne dépend pas de votre volonté, mais du réglage de vos systèmes biologiques et numériques. Faites un audit rapide pour voir les « failles » de votre système.",
        hero_btn: "Démarrer l'audit",
        card1_title: "Libérez votre esprit",
        card1_desc: "Nous allons créer votre « Second Cerveau » — un espace où les idées ne se perdent jamais, permettant à votre cortex préfrontal de se reposer.",
        card2_title: "Des rêves aux clics",
        card2_desc: "Nous divisons les objectifs globaux en micro-étapes. Votre cerveau cessera de résister et commencera à agir automatiquement.",
        card3_title: "État de flow",
        card3_desc: "Nous ajustons votre emploi du temps en fonction de vos rythmes circadiens. Faites l'essentiel au pic de votre énergie, pas par hasard.",
        card4_title: "Discipline intelligente",
        card4_desc: "Système de feedback. Nous analysons ce qui bloque votre croissance et transformons les erreurs en stratégie.",
        result_heading: "Votre Profil Neuro",
        result_subheading: "Voici comment votre cerveau gère la charge actuellement",
        result_list_title: "Lors de la séance de diagnostic, nous allons :",
        result_bullet1: "Identifier les failles individuelles de votre productivité",
        result_bullet2: "Choisir votre type de tracker (numérique ou analogique)",
        result_bullet3: "Construire un plan de protection de votre énergie",
        result_btn_formats: "Voir et choisir les formats d'accès ➔",
        result_btn_customize: "Adapter un système à mon résultat",
        pricing_back: "Retour à mon profil neuro",
        pricing_title: "TARIFS & FORMATS D'APPRENTISSAGE",
        pricing_subtitle: "Choisissez votre chemin vers la productivité",
        t1_badge: "En autonomie",
        t1_bullet1: "4 leçons de base du système CODE",
        t1_bullet2: "Guides pratiques et exercices",
        t1_bullet3: "Accès aux templates et bases de données",
        t1_btn: "Obtenir l'accès",
        t2_group: "Pratique en groupe",
        t2_badge: "3 semaines de focus intensif",
        t2_bullet1: "Tout ce qui est inclus dans le Tarif 1",
        t2_bullet2: "Format : 1 leçon d'instructions + 1 session de débriefing en direct par semaine",
        t2_bullet3: "Travail en groupe (3 à 10 personnes)",
        t2_bullet4: "Correction des devoirs",
        t2_btn: "Réserver une place dans le groupe",
        t3_badge: "Individuel clé en main",
        t3_price: "Sur demande",
        t3_bullet1: "Personnalisation complète de vos processus pro et perso",
        t3_bullet2: "Intégration d'agents IA pour les tâches routinières",
        t3_bullet3: "Accompagnement personnel et mentorat",
        t3_bullet4: "Adaptation au TDAH et à la charge mentale",
        t3_btn: "Soumettre une demande",
        audit_badge: "BESOIN D'UNE SOLUTION RAPIDE SANS SUIVRE DE COURS ?",
        audit_title: "Audit cognitif personnel",
        audit_desc: "Un diagnostic approfondi de 60 minutes avec l'auteur du système. Nous trouverons les principales failles qui brûlent jusqu'à 40 % de votre énergie et établirons un plan de sortie du chaos.",
        audit_note: "* Si vous passez à un accompagnement individuel, le coût de l'audit sera déduit du prix",
        audit_btn: "👉 Réserver une session dans l'agenda",
        cal_back: "Retour aux tarifs et formats",
        cal_title: "Choisissez votre horaire",
        cal_form_pib: "Nom complet",
        cal_form_phone: "Téléphone",
        cal_form_email: "E-mail",
        cal_form_btn: "Confirmer la réservation",
        cal_sync_label: "Synchronisation du calendrier...",
        succ_header: "Réservé !",
        succ_time_prefix: "Votre horaire choisi :",
        succ_next_question: "Que souhaitez-vous faire ensuite ?",
        succ_btn_profile: "Mon Profil Neuro",
        succ_btn_tariffs: "Tarifs",
        succ_btn_main: "Retour à l'accueil",
        succ_btn_cancel: "Annuler ou modifier l'horaire",
        modal_custom_title: "🧠 La personnalisation du système est en cours de développement !",
        modal_custom_desc1: "Notre réseau de neurones apprend à composer automatiquement une boîte à outils personnalisée pour combler les failles de votre cortex préfrontal.",
        modal_custom_desc2: "Souhaitez-vous être le premier à recevoir votre système gratuitement dès sa sortie ?",
        modal_custom_desc3: "Laissez votre Telegram ou E-mail, et nous vous enverrons le système dès la fin des tests bêta.",
        modal_custom_gdpr: "J'accepte le traitement de mes données conformément à la <a href=\"oferta.pdf\" target=\"_blank\" class=\"underline hover:text-teal-600\">Politique de confidentialité</a>.",
        modal_custom_btn: "Réserver mon système gratuitement",
        modal_pay_title: "Paiement",
        modal_pay_gdpr: "J'accepte le traitement de mes données et les conditions de l'<a href=\"oferta.pdf\" target=\"_blank\" class=\"underline hover:text-emerald-green\">Offre publique</a>.",
        modal_pay_btn: "Passer au paiement",
        foot_tg: "Canal Telegram",
        foot_oferta: "CONTRAT D'OFFRE PUBLIQUE",
        foot_copy: "Tous droits réservés."
    }
};

const STEPS_TRANSLATIONS = {
    ua: {
        1: "Крок 1: Вступ",
        2: "Крок 2: Аудит",
        3: "Крок 3: Ваш Профіль",
        4: "Крок 4: Формати",
        5: "Крок 5: Бронювання"
    },
    en: {
        1: "Step 1: Intro",
        2: "Step 2: Audit",
        3: "Step 3: Your Profile",
        4: "Step 4: Formats",
        5: "Step 5: Booking"
    },
    fr: {
        1: "Étape 1: Intro",
        2: "Étape 2: Audit",
        3: "Étape 3: Votre Profil",
        4: "Étape 4: Formats",
        5: "Étape 5: Réservation"
    }
};

const QUIZ_TRANSLATIONS = {
    ua: [
        {
            question: "Як ви зазвичай зберігаєте нові ідеї чи важливу інформацію?",
            options: [
                "Намагаюсь тримати в голові (і часто забуваю).",
                "Записую в купу різних нотаток чи чатів.",
                "Маю єдину систему входу за вашим методом."
            ]
        },
        {
            question: "Скільки часу ви можете працювати над однією задачею без відволікання?",
            options: [
                "Менше 10 хвилин — постійно тягнусь до телефону.",
                "Близько 30 хвилин, але з великим зусиллям.",
                "Маю чіткі блоки глибокої роботи без сповіщень."
            ]
        },
        {
            question: "Як ви почуваєтесь в кінці типового робочого дня?",
            options: [
                "Виснажений хаосом, ніби нічого не встиг.",
                "Втомлений, але результати є.",
                "Спокійний, бо все йде за моїм планом."
            ]
        },
        {
            question: "Чи знаєте ви свої найпродуктивніші години доби?",
            options: [
                "Ні, працюю коли доводиться.",
                "Приблизно розумію, але не завжди підлаштовуюсь.",
                "Так, і планую найважче саме на цей час."
            ]
        }
    ],
    en: [
        {
            question: "How do you usually store new ideas or important information?",
            options: [
                "I try to keep them in my head (and often forget them).",
                "I write them down in a bunch of different notes or chats.",
                "I have a single capture system according to your method."
            ]
        },
        {
            question: "How long can you work on a single task without distraction?",
            options: [
                "Less than 10 minutes — I constantly reach for my phone.",
                "About 30 minutes, but with great effort.",
                "I have clear deep work blocks without notifications."
            ]
        },
        {
            question: "How do you feel at the end of a typical workday?",
            options: [
                "Exhausted by chaos, as if I achieved nothing.",
                "Tired, but seeing results.",
                "Calm, because everything is going according to plan."
            ]
        },
        {
            question: "Do you know your most productive hours of the day?",
            options: [
                "No, I work whenever I have to.",
                "I have a rough idea, but don't always adapt to it.",
                "Yes, and I schedule the hardest tasks for this time."
            ]
        }
    ],
    fr: [
        {
            question: "Comment stockez-vous généralement les nouvelles idées ou informations importantes ?",
            options: [
                "J'essaie de les garder en tête (et je les oublie souvent).",
                "Je les note dans plein de carnets, d'applications ou de chats différents.",
                "J'ai un système de capture unique selon votre méthode."
            ]
        },
        {
            question: "Combien de temps pouvez-vous travailler sur une tâche sans vous déconcentrer ?",
            options: [
                "Moins de 10 minutes — je prends constamment mon téléphone.",
                "Environ 30 minutes, mais avec beaucoup d'efforts.",
                "J'ai des blocs de travail profond bien définis et sans notifications."
            ]
        },
        {
            question: "Comment vous sentez-vous à la fin d'une journée de travail typique ?",
            options: [
                "Épuisé par le chaos, comme si je n'avais rien accompli.",
                "Fatigué, mais il y a des résultats.",
                "Serein, car tout se déroule selon mon plan."
            ]
        },
        {
            question: "Connaissez-vous vos heures les plus productives de la journée ?",
            options: [
                "Non, je travaille quand je n'ai pas le choix.",
                "Je le sais à peu près, mais je ne m'y adapte pas toujours.",
                "Oui, et je planifie le plus difficile à ce moment-là."
            ]
        }
    ]
};

const PROFILES_TRANSLATIONS = {
    ua: {
        potential_badge: "Системний потенціал",
        potential_title: "Ваша система майже готова до масштабування",
        potential_desc: "Ви вже маєте базову дисципліну та непоганий фокус. Тепер нам потрібно налаштувати її так, щоб вона працювала на автоматизмі за принципами 'Атомних звичок' та другого мозку.",
        overload_badge: "Когнітивне перевантаження",
        overload_title: "Час зупинити хаос",
        overload_desc: "Ваш мозок витрачає надто багато енергії на утримання інформації та боротьбу з відволіканнями. Необхідно терміново розвантажити пам'ять та впровадити 'Зовнішній мозок'.",
        distraction_badge: "Дефіцит фокусу",
        distraction_title: "Потенціал втрачається в рутині",
        distraction_desc: "Ви намагаєтесь все встигнути, але часто працюєте в режимі реакції. Нам потрібно вибудувати блоки глибокої роботи та синхронізувати графік з вашими циркадними ритмами.",
        chart_label: "Ваш поточний рівень",
        chart_labels: ['Стійкість', 'Фокус', 'Системність']
    },
    en: {
        potential_badge: "Systemic Potential",
        potential_title: "Your system is almost ready for scaling",
        potential_desc: "You already have basic discipline and decent focus. Now we need to set it up so it works automatically, based on 'Atomic Habits' and second brain principles.",
        overload_badge: "Cognitive Overload",
        overload_title: "Time to stop the chaos",
        overload_desc: "Your brain spends too much energy holding information and fighting distractions. You urgently need to offload your memory and implement a 'Second Brain'.",
        distraction_badge: "Focus Deficit",
        distraction_title: "Potential is lost in routine",
        distraction_desc: "You try to do everything, but often work in reaction mode. We need to build deep work blocks and sync your schedule with your circadian rhythms.",
        chart_label: "Your current level",
        chart_labels: ['Resilience', 'Focus', 'Consistency']
    },
    fr: {
        potential_badge: "Potentiel Systémique",
        potential_title: "Votre système est presque prêt à passer à l'échelle",
        potential_desc: "Vous avez déjà une discipline de base et un bon focus. Il s'agit maintenant de la configurer pour qu'elle fonctionne en pilote automatique selon les principes des « Habitudes Atomiques » et du second cerveau.",
        overload_badge: "Surcharge Cognitive",
        overload_title: "Il est temps d'arrêter le chaos",
        overload_desc: "Votre cerveau dépense trop d'énergie à stocker des informations et à lutter contre les distractions. Il faut d'urgence décharger votre mémoire et adopter un « Second Cerveau ».",
        distraction_badge: "Déficit de Focus",
        distraction_title: "Le potentiel se perd dans la routine",
        distraction_desc: "Vous essayez de tout faire, mais travaillez souvent en mode réactif. Nous devons mettre en place des blocs de travail profond et synchroniser votre emploi du temps avec vos rythmes circadiens.",
        chart_label: "Votre niveau actuel",
        chart_labels: ['Résilience', 'Focus', 'Système']
    }
};

const CALENDAR_TRANSLATIONS = {
    ua: {
        time_selected: "Бронювання розбору під формат: ",
        choose_time: "Оберіть свій час",
        instructions_audit: "Оберіть зручний час для нашої діагностичної сесії:",
        instructions_default: "Миттєве бронювання стратегічного розбору",
        months: ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"],
        days: ["Пн", "Вт", "Ср", "Чт", "Пт"],
        booked_success_notif: "Вітаю, {name}! Твій час заброньовано.",
        busy_sync_label: "Синхронізація розкладу...",
        busy_slots_debug: "Синхронізовано. Зайнятих подій знайдено у вашому календарі: ",
        error_name: "Будь ласка, введіть коректне ім'я.",
        error_email_invalid: "Будь ласка, введіть коректну електронну пошту.",
        error_phone: "Будь ласка, введіть повністю коректний номер телефону.",
        error_booking_exists: "У вас вже є заброньована сесія.",
        cancel_booking_confirm: "Ви впевнені, що хочете скасувати поточне бронювання?",
        cancel_booking_notif: "Бронювання скасовано. Виберіть новий час.",
        payment_error_name: "Будь ласка, введіть коректне ім'я.",
        payment_error_email: "Будь ласка, введіть коректну електронну пошту.",
        payment_error_phone: "Будь ласка, введіть повністю коректний номер телефону.",
        payment_error_gdpr: "Необхідно погодитися з умовами публічної оферти.",
        payment_success_notif: "Оплата успішна! Будь ласка, оберіть час для вашої сесії в календарі.",
        payment_error_not_configured: "Помилка: Посилання на оплату для цього тарифу ще не налаштоване."
    },
    en: {
        time_selected: "Booking review for format: ",
        choose_time: "Choose your time",
        instructions_audit: "Choose a convenient time for our diagnostic session:",
        instructions_default: "Instant booking of strategic review",
        months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        booked_success_notif: "Congratulations, {name}! Your slot is booked.",
        busy_sync_label: "Synchronizing schedule...",
        busy_slots_debug: "Synchronized. Busy events found in your calendar: ",
        error_name: "Please enter a valid name.",
        error_email_invalid: "Please enter a valid email address.",
        error_phone: "Please enter a fully correct phone number.",
        error_booking_exists: "You already have a booked session.",
        cancel_booking_confirm: "Are you sure you want to cancel your current booking?",
        cancel_booking_notif: "Booking cancelled. Please choose a new time.",
        payment_error_name: "Please enter a valid name.",
        payment_error_email: "Please enter a valid email address.",
        payment_error_phone: "Please enter a fully correct phone number.",
        payment_error_gdpr: "You must agree to the terms of the public offer.",
        payment_success_notif: "Payment successful! Please choose a time for your session in the calendar.",
        payment_error_not_configured: "Error: Payment link for this tariff is not configured yet."
    },
    fr: {
        time_selected: "Réservation du débriefing pour le format : ",
        choose_time: "Choisissez votre horaire",
        instructions_audit: "Choisissez un horaire pratique pour notre séance de diagnostic :",
        instructions_default: "Réservation instantanée du débriefing stratégique",
        months: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
        days: ["Lun", "Mar", "Mer", "Jeu", "Ven"],
        booked_success_notif: "Félicitations, {name} ! Votre créneau est réservé.",
        busy_sync_label: "Synchronisation de l'agenda...",
        busy_slots_debug: "Synchronisé. Événements occupés trouvés dans votre agenda : ",
        error_name: "Veuillez entrer un nom valide.",
        error_phone: "Veuillez entrer un numéro de téléphone entièrement correct.",
        error_booking_exists: "Vous avez déjà une session réservée.",
        cancel_booking_confirm: "Êtes-vous sûr de vouloir annuler votre réservation actuelle ?",
        cancel_booking_notif: "Réservation annulée. Veuillez choisir un nouvel horaire.",
        payment_error_name: "Veuillez entrer un nom valide.",
        payment_error_email: "Veuillez entrer une adresse e-mail valide.",
        payment_error_phone: "Veuillez entrer un numéro de téléphone entièrement correct.",
        payment_error_gdpr: "Vous devez accepter les conditions de l'offre publique.",
        payment_success_notif: "Paiement réussi ! Veuillez choisir un horaire pour votre séance dans le calendrier.",
        payment_error_not_configured: "Erreur : Le lien de paiement pour ce tarif n'est pas encore configuré."
    }
};

// --- HELPER FUNCTIONS ---
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// --- LANGUAGE SWITCHER LOGIC ---
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('levelup_lang', lang);
    
    updatePageLanguage(lang);
    
    if (currentStep === 2) {
        renderQuestion();
    } else if (currentStep === 3) {
        renderResults();
    } else if (currentStep === 5) {
        initCalendar();
    }
    
    updateHeaderProgress(currentStep);
}

function updatePageLanguage(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
            el.innerHTML = TRANSLATIONS[lang][key];
        }
    });

    const placeholders = {
        "b-name": { ua: "Ваше ім'я", en: "Your name", fr: "Votre nom" },
        "p-name": { ua: "Ваше ім'я", en: "Your name", fr: "Votre nom" },
        "lead-contact": { ua: "Telegram @username або Email", en: "Telegram @username or Email", fr: "Telegram @username ou E-mail" }
    };
    for (let id in placeholders) {
        const el = document.getElementById(id);
        if (el && placeholders[id][lang]) {
            el.placeholder = placeholders[id][lang];
        }
    }

    ['ua', 'en', 'fr'].forEach(l => {
        const btn = document.getElementById(`lang-btn-${l}`);
        if (btn) {
            if (l === lang) {
                btn.className = "px-2 sm:px-2.5 py-1 rounded-full transition-all duration-200 bg-emerald-green text-white";
            } else {
                btn.className = "px-2 sm:px-2.5 py-1 rounded-full transition-all duration-200 text-slate-600 hover:text-deep-slate";
            }
        }
    });
}

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

// --- QUIZ LOGIC ---
function renderQuestion() {
    const container = document.getElementById('quiz-container');
    const localQuestions = QUIZ_TRANSLATIONS[currentLanguage] || QUIZ_TRANSLATIONS['ua'];
    const q = localQuestions[currentQuestionIndex];
    const totalQuestions = localQuestions.length;
    
    const progress = ((currentQuestionIndex) / totalQuestions) * 100;
    document.getElementById('quiz-progress').style.width = `${progress}%`;

    const labelIdx = { ua: `Питання ${currentQuestionIndex + 1} з ${totalQuestions}`, en: `Question ${currentQuestionIndex + 1} of ${totalQuestions}`, fr: `Question ${currentQuestionIndex + 1} sur ${totalQuestions}` };

    let html = `
        <div class="fade-in w-full">
            <p class="text-sm font-semibold text-emerald-green mb-4">${labelIdx[currentLanguage] || labelIdx['ua']}</p>
            <h3 class="text-2xl font-bold mb-8 text-deep-slate">${q.question}</h3>
            <div class="space-y-4">
    `;

    q.options.forEach((opt, idx) => {
        html += `
            <button onclick="handleAnswer(${idx})" class="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-green hover:bg-emerald-50 transition-all font-medium text-slate-700">
                ${opt}
            </button>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}

function handleAnswer(optionIndex) {
    const localQuestions = QUIZ_TRANSLATIONS[currentLanguage] || QUIZ_TRANSLATIONS['ua'];
    const totalQuestions = localQuestions.length;
    
    const scoreRules = [
        [
            { load: -10, focus: -10, system: -20 },
            { load: -5, focus: 0, system: -10 },
            { load: 10, focus: 10, system: 20 }
        ],
        [
            { load: -10, focus: -20, system: -5 },
            { load: -5, focus: 0, system: 0 },
            { load: 10, focus: 20, system: 10 }
        ],
        [
            { load: -20, focus: -10, system: -10 },
            { load: 0, focus: 5, system: 5 },
            { load: 20, focus: 10, system: 20 }
        ],
        [
            { load: -10, focus: -10, system: -10 },
            { load: 0, focus: 0, system: 5 },
            { load: 10, focus: 20, system: 15 }
        ]
    ];

    const rule = scoreRules[currentQuestionIndex][optionIndex];
    scores.load += rule.load;
    scores.focus += rule.focus;
    scores.system += rule.system;

    scores.load = Math.max(10, Math.min(100, scores.load));
    scores.focus = Math.max(10, Math.min(100, scores.focus));
    scores.system = Math.max(10, Math.min(100, scores.system));

    if (currentQuestionIndex < totalQuestions - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        document.getElementById('quiz-progress').style.width = `100%`;
        setTimeout(() => goToStep(3), 500);
    }
}

// --- RESULTS LOGIC ---
let radarChartInstance = null;

function renderResults() {
    const titleEl = document.getElementById('result-title');
    const descEl = document.getElementById('result-description');
    const badgeEl = document.getElementById('result-status-badge');

    const total = scores.load + scores.focus + scores.system;
    const t = PROFILES_TRANSLATIONS[currentLanguage] || PROFILES_TRANSLATIONS['ua'];
    
    if (total > 200) {
        badgeEl.textContent = t.potential_badge;
        badgeEl.className = "inline-block px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-sm mb-4 self-start";
        titleEl.textContent = t.potential_title;
        descEl.textContent = t.potential_desc;
    } else if (total < 120) {
        badgeEl.textContent = t.overload_badge;
        badgeEl.className = "inline-block px-4 py-2 rounded-full bg-red-100 text-red-800 font-semibold text-sm mb-4 self-start";
        titleEl.textContent = t.overload_title;
        descEl.textContent = t.overload_desc;
    } else {
        badgeEl.textContent = t.distraction_badge;
        badgeEl.className = "inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-800 font-semibold text-sm mb-4 self-start";
        titleEl.textContent = t.distraction_title;
        descEl.textContent = t.distraction_desc;
    }

    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    if (radarChartInstance) {
        radarChartInstance.destroy();
    }

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: t.chart_labels,
            datasets: [{
                label: t.chart_label,
                data: [scores.load, scores.focus, scores.system],
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
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
let selectedSlot = null;
let busySlots = [];

function showSuccessPanel(bookingData) {
    document.getElementById('booking-container').classList.add('hidden');
    document.getElementById('booking-success').classList.remove('hidden');
    document.getElementById('booking-success').classList.add('flex');
    
    if(bookingData && bookingData.slot) {
        const d = new Date(bookingData.slot);
        const options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' };
        const localeMap = { ua: 'uk-UA', en: 'en-US', fr: 'fr-FR' };
        document.getElementById('success-booked-time').textContent = d.toLocaleDateString(localeMap[currentLanguage] || 'uk-UA', options);
    }
}

function initCalendar() {
    currentWeekOffset = 0;
    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];
    
    const existing = localStorage.getItem('levelup_booking');
    if (existing) {
        showSuccessPanel(JSON.parse(existing));
    } else {
        document.getElementById('booking-container').classList.remove('hidden');
        document.getElementById('booking-success').classList.add('hidden');
        document.getElementById('booking-success').classList.remove('flex');
    }

    const chosenTariff = sessionStorage.getItem('user_intent_tariff');
    const calendarHeader = document.querySelector('#step-5 h2');
    if (calendarHeader) {
        if (chosenTariff) {
            calendarHeader.innerText = `${t.time_selected}${chosenTariff}`;
        } else {
            calendarHeader.innerText = t.choose_time;
        }
    }

    const calInst = document.getElementById('calendar-instruction');
    if (calInst) {
        if (chosenTariff === 'Аудит' || chosenTariff === 'Когнітивний Аудит' || chosenTariff === 'Архітектор Систем') {
            calInst.innerText = t.instructions_audit;
        } else {
            calInst.innerText = t.instructions_default;
        }
    }

    loadWeek();
}

function cancelBooking() {
    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];
    if(confirm(t.cancel_booking_confirm)) {
        localStorage.removeItem('levelup_booking');
        
        document.getElementById('booking-container').classList.remove('hidden');
        document.getElementById('booking-success').classList.add('hidden');
        document.getElementById('booking-success').classList.remove('flex');
        
        selectedSlot = null;
        renderCalendarUI();
        
        showAtomicNotification(t.cancel_booking_notif);
    }
}

function changeWeek(offset) {
    currentWeekOffset += offset;
    loadWeek();
}

async function loadWeek() {
    renderCalendarUI();
    document.getElementById('calendar-loader').style.display = 'flex';
    
    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];
    
    try {
        if (WEBHOOK_URL.startsWith("http")) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const callbackName = 'jsonpCallback_' + Math.round(100000 * Math.random());
                
                const timeoutId = setTimeout(() => {
                    cleanup();
                    showAtomicNotification("Timeout. Offline mode...", false);
                    resolve(); 
                }, 5000);

                window[callbackName] = function(data) {
                    clearTimeout(timeoutId);
                    if (data.status === "success") {
                        busySlots = data.busySlots || [];
                    } else {
                        showAtomicNotification("Error: " + data.message, false);
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
                    resolve(); 
                };
                
                document.body.appendChild(script);
            });
        } else {
            await new Promise(r => setTimeout(r, 600));
            busySlots = [];
        }
    } catch (e) {
        console.error(e);
    }

    document.getElementById('calendar-loader').style.display = 'none';
    renderCalendarUI();
}

function getWeekDates() {
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + (currentWeekOffset * 7));
    
    const dates = [];
    for(let i=0; i<5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function renderCalendarUI() {
    const dates = getWeekDates();
    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];
    document.getElementById('calendar-month').textContent = `${t.months[dates[0].getMonth()]} ${dates[0].getFullYear()}`;

    const headersContainer = document.getElementById('calendar-days-header');
    const slotsContainer = document.getElementById('calendar-slots');
    
    headersContainer.innerHTML = '';
    slotsContainer.innerHTML = '';
    
    dates.forEach((date, i) => {
        const isToday = new Date().toDateString() === date.toDateString();
        headersContainer.innerHTML += `
            <div class="flex flex-col p-2 ${isToday ? 'text-emerald-green bg-emerald-50 rounded-lg' : ''}">
                <span class="text-xs uppercase">${t.days[i]}</span>
                <span class="text-lg">${date.getDate()}</span>
            </div>
        `;

        const col = document.createElement('div');
        col.className = "flex flex-col gap-2";
        const now = new Date();

        for (let h = 0; h < 24; h++) {
            ['00', '30'].forEach(min => {
                const slotTime = new Date(date);
                slotTime.setHours(h, parseInt(min), 0, 0);

                if (slotTime > now) {
                    const parisTimeString = slotTime.toLocaleString("en-US", {timeZone: "Europe/Paris"});
                    const parisDate = new Date(parisTimeString);
                    
                    const dayOfWeek = parisDate.getDay();
                    const hours = parisDate.getHours();

                    if (dayOfWeek === 0 || dayOfWeek === 6) return;
                    if (hours < 9 || hours >= 19) return;

                    const localHour = slotTime.getHours();
                    const localMin = slotTime.getMinutes() === 0 ? '00' : '30';
                    const timeStr = `${localHour}:${localMin}`;
                    
                    const isBusy = busySlots.some(busy => {
                        const slotMs = slotTime.getTime();
                        return (slotMs >= busy.start - 60000) && (slotMs < busy.end - 60000);
                    });

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
    
    let debugEl = document.getElementById('debug-info');
    if (!debugEl) {
        debugEl = document.createElement('div');
        debugEl.id = 'debug-info';
        debugEl.className = 'col-span-full text-xs text-slate-400 mt-4 text-center';
        slotsContainer.appendChild(debugEl);
    }
    debugEl.textContent = `${t.busy_slots_debug}${busySlots.length}`;

    lucide.createIcons();
}

function selectSlot(dateObj) {
    if (selectedSlot && selectedSlot.date.getTime() === dateObj.getTime()) {
        selectedSlot = null;
        document.getElementById('booking-form').classList.add('opacity-50', 'pointer-events-none');
        document.getElementById('selected-slot-info').classList.add('hidden');
    } else {
        selectedSlot = { date: dateObj };
        document.getElementById('booking-form').classList.remove('opacity-50', 'pointer-events-none');
        document.getElementById('selected-slot-info').classList.remove('hidden');
        
        const options = { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' };
        const localeMap = { ua: 'uk-UA', en: 'en-US', fr: 'fr-FR' };
        document.getElementById('selected-slot-text').textContent = dateObj.toLocaleDateString(localeMap[currentLanguage] || 'uk-UA', options);
    }
    renderCalendarUI();
}

document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];

    if (localStorage.getItem('levelup_booking')) {
        showAtomicNotification(t.error_booking_exists, false);
        return;
    }

    const name = document.getElementById('b-name').value.trim();
    if (!name || name.length < 2) {
        showAtomicNotification(t.error_name, false);
        return;
    }

    const email = document.getElementById('b-email').value.trim();
    if (!email || !isValidEmail(email)) {
        showAtomicNotification(t.error_email_invalid, false);
        return;
    }

    if (iti && !iti.isValidNumber()) {
        showAtomicNotification(t.error_phone, false);
        return;
    }

    const phone = iti ? iti.getNumber() : document.getElementById('b-phone').value;
    const tariff = sessionStorage.getItem('user_intent_tariff') || "Аудит";

    const payload = {
        name, phone, email, tariff,
        slot: selectedSlot.date.toISOString(),
        quizScores: scores
    };

    localStorage.setItem('levelup_booking', JSON.stringify(payload));
    showAtomicNotification(t.booked_success_notif.replace('{name}', name));
    
    document.getElementById('booking-form').reset();
    selectedSlot = null;
    renderCalendarUI();
    showSuccessPanel(payload);

    if (WEBHOOK_URL.startsWith("http")) {
        try {
            fetch(WEBHOOK_URL, {
                method: "POST",
                mode: 'no-cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Sync error", err);
        }
    }
});

function updateHeaderProgress(step) {
    const indicator = document.getElementById('progress-indicator');
    const steps = STEPS_TRANSLATIONS[currentLanguage] || STEPS_TRANSLATIONS['ua'];
    indicator.textContent = steps[step];
}

// --- WAYFORPAY PAYMENT PROCESSING ---
function selectTariffAndProceed(tariffName) {
    sessionStorage.setItem('user_intent_tariff', tariffName);
    
    if (typeof gtag !== 'undefined') {
        gtag('event', 'select_content', {
            content_type: 'tariff',
            item_id: tariffName
        });
    }

    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];
    const calendarHeader = document.querySelector('#step-5 h2');
    if (calendarHeader) {
        calendarHeader.innerText = `${t.time_selected}${tariffName}`;
    }

    const calInst = document.getElementById('calendar-instruction');
    if (calInst) {
        if (tariffName === 'Аудит' || tariffName === 'Когнітивний Аудит' || tariffName === 'Архітектор Систем') {
            calInst.innerText = t.instructions_audit;
        } else {
            calInst.innerText = t.instructions_default;
        }
    }

    goToStep(5);
}

function clickViewFormats() {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'click_view_formats');
    }
    goToStep(4);
}

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

async function submitSystemLead(event) {
    event.preventDefault();
    
    const contact = document.getElementById('lead-contact').value.trim();
    if (!contact) return;

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

    closeSystemModal();
    document.getElementById('system-lead-form').reset();
    
    const confirmMsg = { ua: "Дякуємо! Вашу систему безкоштовно заброньовано.", en: "Thank you! Your system has been booked for free.", fr: "Merci ! Votre système a été réservé gratuitement." };
    showAtomicNotification(confirmMsg[currentLanguage] || confirmMsg['ua']);

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

// --- WAYFORPAY PAYMENT DIRECT LINKS ---
const WAYFORPAY_LINKS = {
    "Цифровий Inbox": "https://secure.wayforpay.com/button/bdfa3c1a22b11",
    "Нейро-Спринт": "https://secure.wayforpay.com/button/b570a972c4f44",
    "Когнітивний Аудит": "https://secure.wayforpay.com/button/bffd9b033be03",
    "Архітектор Систем": "https://secure.wayforpay.com/button/bffd9b033be03"
};

let currentPaymentTariff = "";
let currentPaymentAmount = 0;
let currentPaymentProductName = "";

function openPaymentModal(tariffName, amount, productName) {
    currentPaymentTariff = tariffName;
    currentPaymentAmount = amount;
    currentPaymentProductName = productName;

    document.getElementById('payment-product-title').textContent = productName;
    document.getElementById('payment-product-price').textContent = `${amount} UAH`;

    // Dynamic note for payment modal
    const noteEl = document.getElementById('payment-product-note');
    if (noteEl) {
        if (tariffName === "Нейро-Спринт") {
            const descGroup = {
                ua: `💡 <strong>Зверніть увагу:</strong> Ви сплачуєте завдаток 700 грн для бронювання місця в групі. Щойно набереться мінімальний склад, ми узгодимо спільну дату й час старту та проведемо доплату. Доступ до Міні-курсу <em>"Цифровий Inbox"</em> ви отримуєте <strong>одразу після оплати завдатку</strong> на вказану пошту. Готуємось до старту!`,
                en: `💡 <strong>Please note:</strong> You are paying a 700 UAH deposit to book a group spot. As soon as the minimum group is formed, we will agree on the start date/time and process the remaining payment. You will receive access to the <em>"Digital Inbox"</em> Mini-course <strong>immediately after paying the deposit</strong> to the email provided. Preparing for start!`,
                fr: `💡 <strong>Attention :</strong> Vous réglez un acompte de 700 UAH pour réserver votre place. Dès que le groupe minimal sera constitué, nous conviendrons d'une date de début et effectuerons le solde. Vous recevrez l'accès au Mini-cours <em>« Digital Inbox »</em> <strong>immédiatement après le paiement de l'acompte</strong> sur l'adresse e-mail fournie. On se prépare pour le départ !`
            };
            noteEl.innerHTML = descGroup[currentLanguage] || descGroup['ua'];
            noteEl.className = "text-xs text-slate-600 mt-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 leading-relaxed text-left block animate-fade-in";
        } else if (tariffName === "Когнітивний Аудит") {
            const descAudit = {
                ua: `📅 <strong>Наступний крок:</strong> Після оплати система автоматично перенаправить вас назад на сайт, де ви зможете обрати зручний день та час нашої сесії в календарі.`,
                en: `📅 <strong>Next step:</strong> Immediately after payment, the system will redirect you back here, allowing you to choose a convenient day and time in our calendar.`,
                fr: `📅 <strong>Étape suivante :</strong> Dès le paiement validé, vous serez redirigé vers notre site pour choisir le jour et l'heure de votre séance dans le calendrier.`
            };
            noteEl.innerHTML = descAudit[currentLanguage] || descAudit['ua'];
            noteEl.className = "text-xs text-slate-600 mt-4 bg-teal-50/50 p-3.5 rounded-2xl border border-teal-100 leading-relaxed text-left block animate-fade-in";
        } else if (tariffName === "Цифровий Inbox") {
            const descInbox = {
                ua: `📧 <strong>Доступ до матеріалів:</strong> Посилання на уроки міні-курсу буде надіслано на вашу електронну адресу відразу після підтвердження оплати.`,
                en: `📧 <strong>Access to materials:</strong> The link to the mini-course lessons will be sent to your email address immediately after payment confirmation.`,
                fr: `📧 <strong>Accès aux cours :</strong> Le lien vers les leçons du mini-cours sera envoyé sur votre adresse e-mail dès confirmation du paiement.`
            };
            noteEl.innerHTML = descInbox[currentLanguage] || descInbox['ua'];
            noteEl.className = "text-xs text-slate-600 mt-4 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 leading-relaxed text-left block animate-fade-in";
        } else if (tariffName === "Архітектор Систем") {
            const descArchitect = {
                ua: `💡 <strong>Зверніть увагу:</strong> Створення індивідуальної системи "під ключ" потребує обов'язкової попередньої діагностики. Спочатку ви сплачуєте та бронюєте <strong>Когнітивний Аудит</strong> (2500 грн). Після сесії ми сформуємо фінальну ціну вашого проєкту, а вартість цього аудиту буде <strong>повністю вирахована</strong> з кінцевого платежу!`,
                en: `💡 <strong>Please note:</strong> Building a custom "turn-key" system requires a mandatory preliminary diagnostic. First, you pay and book a <strong>Cognitive Audit</strong> (2500 UAH). After the session, we will define the final price of your project, and the cost of this audit will be <strong>fully deducted</strong> from the final payment!`,
                fr: `💡 <strong>Attention :</strong> La création d'un système individuel clé en main nécessite un diagnostic préalable obligatoire. Vous réglez d'abord un <strong>Audit Cognitif</strong> (2500 UAH). Après la séance, nous établirons le prix final de votre projet, et le coût de cet audit sera <strong>entièrement déduit</strong> du paiement final !`
            };
            noteEl.innerHTML = descArchitect[currentLanguage] || descArchitect['ua'];
            noteEl.className = "text-xs text-slate-600 mt-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 leading-relaxed text-left block animate-fade-in";
        } else {
            noteEl.className = "hidden";
        }
    }

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

async function submitPayment(event) {
    event.preventDefault();
    const t = CALENDAR_TRANSLATIONS[currentLanguage] || CALENDAR_TRANSLATIONS['ua'];

    const name = document.getElementById('p-name').value.trim();
    const email = document.getElementById('p-email').value.trim();
    
    if (!name || name.length < 2) {
        showAtomicNotification(t.payment_error_name, false);
        return;
    }

    if (!email || !isValidEmail(email)) {
        showAtomicNotification(t.payment_error_email, false);
        return;
    }

    if (payIti && !payIti.isValidNumber()) {
        showAtomicNotification(t.payment_error_phone, false);
        return;
    }

    const phone = payIti ? payIti.getNumber() : document.getElementById('p-phone').value;
    
    const gdprChecked = document.getElementById('p-gdpr').checked;
    if (!gdprChecked) {
        showAtomicNotification(t.payment_error_gdpr, false);
        return;
    }

    const btnSubmit = document.getElementById('btn-submit-payment');
    const originalBtnText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i data-lucide="loader-2" class="animate-spin w-4 h-4 inline-block mr-2"></i> ...`;
    lucide.createIcons();

    sessionStorage.setItem('pay_client_name', name);
    sessionStorage.setItem('pay_client_email', email);
    sessionStorage.setItem('pay_client_phone', phone);
    sessionStorage.setItem('user_intent_tariff', currentPaymentTariff);

    const payload = {
        action: "lead",
        contact: `${name} | ${phone} | ${email}`,
        profile: `Client checkout redirection: ${currentPaymentTariff}`,
        tags: ["Спроба_Оплати", `Tariff_${currentPaymentTariff}`, `Lang_${currentLanguage.toUpperCase()}`]
    };

    try {
        if (WEBHOOK_URL.startsWith("http")) {
            await fetch(WEBHOOK_URL, {
                method: "POST",
                mode: 'no-cors',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
    } catch (err) {
        console.error(err);
    }

    closePaymentModal();
    
    const paymentUrl = WAYFORPAY_LINKS[currentPaymentTariff];
    if (paymentUrl && paymentUrl.startsWith("http")) {
        window.location.href = paymentUrl;
    } else {
        showAtomicNotification(t.payment_error_not_configured, false);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;
        lucide.createIcons();
    }
}