/**
 * LevelUp.Baddy - Google Apps Script Backend (ФІНАЛЬНА ВЕРСІЯ З СИНХРОНІЗАЦІЄЮ)
 */

const YOUR_EMAIL = "nadiia.bielaia@gmail.com"; // ВПИШІТЬ СВІЙ EMAIL ТУТ
const WORK_START_HOUR = 9;   // 09:00 за Парижем
const WORK_END_HOUR = 19;   // 19:00 за Парижем

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    const calendar = CalendarApp.getCalendarById(YOUR_EMAIL) || CalendarApp.getDefaultCalendar();

    // СКАСУВАННЯ БРОНЮВАННЯ
    if (action === "cancel") {
      const now = new Date();
      const searchStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const endSearch = new Date(now.getTime() + (31 * 24 * 60 * 60 * 1000));
      const events = calendar.getEvents(searchStart, endSearch);
      
      let deletedCount = 0;
      events.forEach(event => {
        const desc = event.getDescription();
        if (desc && desc.indexOf(data.phone) !== -1) {
          event.deleteEvent();
          deletedCount++;
        }
      });
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", 
        message: "Скасовано подій: " + deletedCount 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ЗАПИС ЛІДА З МОДАЛЬНОГО ВІКНА
    if (action === "lead") {
      let leadSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Ліди") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Ліди");
      if (leadSheet.getLastRow() === 0) {
        leadSheet.appendRow(["Дата", "Контакт", "Профіль", "Теги"]);
      }
      leadSheet.appendRow([
        new Date(),
        data.contact,
        data.profile,
        data.tags.join(", ")
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // СТВОРЕННЯ БРОНЮВАННЯ
    const name = data.name;
    const phone = data.phone;
    const email = data.email || "Не вказано";
    const slot = new Date(data.slot);

    // Валідація: Робочі години (09:00 - 19:00) та вихідні дні за таймзоною Europe/Paris
    const parisTimeString = slot.toLocaleString("en-US", {timeZone: "Europe/Paris"});
    const parisDate = new Date(parisTimeString);
    const dayOfWeek = parisDate.getDay(); // 0 = Неділя, 6 = Субота
    const hours = parisDate.getHours();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Бронювання на вихідні дні неможливе." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (hours < WORK_START_HOUR || hours >= WORK_END_HOUR) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Бронювання можливе тільки в робочий час з 09:00 до 19:00 за Парижем." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const scores = data.quizScores;
    
    // Запис у Google Таблицю
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Дата створення", "ПІБ", "Телефон", "Email", "Обраний Час", "Стійкість", "Фокус", "Системність"]);
    }
    
    sheet.appendRow([
      new Date(), name, phone, email, slot, scores.load, scores.focus, scores.system
    ]);
    
    // Створення події
    const endTime = new Date(slot);
    endTime.setMinutes(endTime.getMinutes() + 30);
    
    const description = `Стратегічний розбір: ${name}
Телефон: ${phone}
Email: ${email}

📊 Нейро-профіль:
- Стійкість: ${scores.load}/100
- Фокус: ${scores.focus}/100
- Системність: ${scores.system}/100`;
    
    const event = calendar.createEvent(
      `Стратегічний розбір - ${name}`,
      slot,
      endTime,
      { description: description }
    );
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", eventId: event.getId() }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const calendar = CalendarApp.getCalendarById(YOUR_EMAIL) || CalendarApp.getDefaultCalendar();
    
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const events = calendar.getEvents(start, end);
    
    // Отримуємо таймстемпи (мілісекунди) зайнятих слотів
    const busySlots = events.map(ev => ({
      start: ev.getStartTime().getTime(),
      end: ev.getEndTime().getTime()
    }));
    
    const result = { 
      status: "success", 
      busySlots: busySlots,
      calendarName: calendar.getName(),
      calendarId: calendar.getId()
    };
    
    // JSONP для обходу CORS
    const callback = e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    const errorResult = { status: "error", message: error.toString() };
    const callback = e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(errorResult) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
