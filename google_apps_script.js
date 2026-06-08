/**
 * LevelUp.Baddy - Google Apps Script Backend (ФІНАЛЬНА ВЕРСІЯ З СИНХРОНІЗАЦІЄЮ)
 */

const YOUR_EMAIL = "nadiia.bielaia@gmail.com"; // ВПИШІТЬ СВІЙ EMAIL ТУТ
const WORK_START_HOUR = 9;   // 09:00 за Парижем
const WORK_END_HOUR = 19;   // 19:00 за Парижем

// --- WAYFORPAY & AUTOMATION CONFIGURATION ---
const WAYFORPAY_SECRET_KEY = "YOUR_WAYFORPAY_SECRET_KEY"; // ВПИШІТЬ СВІЙ СЕКРЕТНИЙ КЛЮЧ ТУТ
const CRM_WEBHOOK_URL = ""; // (Опціонально) URL вашого CRM веб-хуку
const NOTION_MINICOURSE_LINK = "https://app.notion.com/p/Mimi-course-372dadbdbc9f80b392afe1346e699d3e?source=copy_link"; // Посилання на Notion мінікурс

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. Обробити Webhook від WayForPay
    if (data.transactionStatus && data.merchantAccount === "t_me_d09a8") {
      const secretKey = WAYFORPAY_SECRET_KEY || "YOUR_WAYFORPAY_SECRET_KEY";
      
      // Перевірка підпису від WayForPay
      const checkSigString = [
        data.merchantAccount,
        data.orderReference,
        data.amount,
        data.currency,
        data.authCode,
        data.cardPan,
        data.transactionStatus,
        data.reasonCode
      ].join(';');
      
      let verified = true;
      if (secretKey !== "YOUR_WAYFORPAY_SECRET_KEY") {
        const checkSigBytes = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_MD5, checkSigString, secretKey);
        const checkSignature = bytesToHex(checkSigBytes);
        
        if (checkSignature !== data.merchantSignature) {
          Logger.log("WayForPay Webhook signature mismatch!");
          verified = false;
        }
      }
      
      if (verified && data.transactionStatus === "Approved") {
        const email = data.email || "Не вказано";
        const phone = data.phone || "Не вказано";
        const name = (data.clientFirstName || "") + " " + (data.clientLastName || "");
        const productName = Array.isArray(data.productName) ? data.productName.join(", ") : (data.productName || "Міні-курс Цифровий Inbox (Notion)");
        const amount = data.amount;
        const currency = data.currency;
        
        // а) Запис у лист "Оплати"
        let paymentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Оплати") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Оплати");
        if (paymentSheet.getLastRow() === 0) {
          paymentSheet.appendRow(["Дата", "Замовлення", "Сума", "Валюта", "Статус", "ПІБ", "Email", "Телефон", "Товари"]);
        }
        paymentSheet.appendRow([
          new Date(),
          data.orderReference,
          amount,
          currency,
          data.transactionStatus,
          name.trim() || "Клієнт",
          email,
          phone,
          productName
        ]);
        
        // б) Передача в CRM
        if (CRM_WEBHOOK_URL) {
          try {
            UrlFetchApp.fetch(CRM_WEBHOOK_URL, {
              method: "POST",
              contentType: "application/json",
              payload: JSON.stringify({
                email: email,
                productName: productName,
                name: name,
                phone: phone,
                orderReference: data.orderReference,
                amount: amount,
                status: data.transactionStatus
              })
            });
          } catch (crmErr) {
            Logger.log("CRM error: " + crmErr.toString());
          }
        }
        
        // в) Автовідправка вітального листа з Notion-мінікурсом
        try {
          let subject = "Ваш доступ до Міні-курсу 'Цифровий Inbox'";
          let htmlBody = "";
          
          if (productName.indexOf("Цифровий Inbox") !== -1) {
            htmlBody = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #10b981; margin: 0;">LevelUp.Strategy</h2>
                  <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Цифровий розгін вашої продуктивності</p>
                </div>
                
                <p>Вітаємо, <strong>${data.clientFirstName || 'Друже'}</strong>!</p>
                
                <p>Дякуємо за успішне придбання нашого продукту: <strong>${productName}</strong>.</p>
                
                <p>Твій "Зовнішній мозок" готовий до розгортання! Для доступу до Notion-мінікурсу перейди за посиланням нижче:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${NOTION_MINICOURSE_LINK}" target="_blank" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                    👉 Отримати доступ в Notion
                  </a>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                
                <p style="font-size: 13px; color: #64748b;">
                  Якщо виникнуть запитання або проблеми з доступом, напишіть нам у підтримку Telegram.
                </p>
                <p style="font-size: 13px; color: #64748b; margin-top: 8px;">
                  З повагою,<br/>Команда LevelUp.Strategy
                </p>
              </div>
            `;
          } else if (productName.indexOf("Нейро-Спринт") !== -1) {
            subject = "Ваше місце заброньовано: Нейро-Спринт!";
            htmlBody = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #10b981; margin: 0;">LevelUp.Strategy</h2>
                  <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Групова практика та Нейро-Спринт</p>
                </div>
                
                <p>Вітаємо, <strong>${data.clientFirstName || 'Друже'}</strong>!</p>
                
                <p>Дякуємо за оплату завдатку для участі у спринті <strong>Нейро-Спринт</strong>.</p>
                
                <p>Ваше місце в групі успішно заброньовано! Решту суми (<strong>4500 грн</strong>) ви сплатите після офіційного старту групи (коли набереться мінімум 5 учасників).</p>
                
                <p>А поки що ви можете почати ознайомлення з <strong>Міні-курсом Цифровий Inbox (Notion)</strong>, який входить у ваш пакет та доступний вам уже зараз:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${NOTION_MINICOURSE_LINK}" target="_blank" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                    👉 Отримати доступ до Міні-курсу в Notion
                  </a>
                </div>
                
                <p style="font-size: 14px;">Ми зв'яжемося з вами в Telegram або поштою, щойно буде сформовано склад групи для узгодження дати старту першої сесії.</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                
                <p style="font-size: 13px; color: #64748b;">
                  З повагою,<br/>Команда LevelUp.Strategy
                </p>
              </div>
            `;
          } else {
            subject = "Оплата підтверджена: Когнітивний Аудит";
            htmlBody = `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="color: #10b981; margin: 0;">LevelUp.Strategy</h2>
                  <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Когнітивний Аудит та Нейро-Продуктивність</p>
                </div>
                
                <p>Вітаємо, <strong>${data.clientFirstName || 'Друже'}</strong>!</p>
                
                <p>Дякуємо за оплату послуги: <strong>${productName}</strong>.</p>
                
                <p>Оплата пройшла успішно. Якщо ти ще не встиг обрати час для нашої діагностичної сесії у нашому календарі, будь ласка, зроби це за посиланням нижче:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://nadiabielaia-create.github.io/second-brain-site/" target="_blank" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                    📅 Обрати час у Календарі
                  </a>
                </div>
                
                <p style="font-size: 14px;">Після бронювання на твою пошту надійде запрошення з Google Meet посиланням для нашої зустрічі.</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                
                <p style="font-size: 13px; color: #64748b;">
                  З повагою,<br/>Команда LevelUp.Strategy
                </p>
              </div>
            `;
          }
          
          MailApp.sendEmail({
            to: email,
            subject: subject,
            htmlBody: htmlBody
          });
        } catch (mailErr) {
          Logger.log("Email error: " + mailErr.toString());
        }
      }
      
      // Надсилаємо відповідь WayForPay для підтвердження
      const responseTime = Math.round(new Date().getTime() / 1000);
      const responseStatus = "accept";
      const responseSigString = data.orderReference + ";" + responseStatus + ";" + responseTime;
      
      let responseSignature = "dummy_signature";
      if (secretKey !== "YOUR_WAYFORPAY_SECRET_KEY") {
        const responseSigBytes = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_MD5, responseSigString, secretKey);
        responseSignature = bytesToHex(responseSigBytes);
      }
      
      const responsePayload = {
        orderReference: data.orderReference,
        status: responseStatus,
        time: responseTime,
        signature: responseSignature
      };
      
      return ContentService.createTextOutput(JSON.stringify(responsePayload))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Стандартна логіка для бронювань та лідів з фронтенду
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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
      sheet.appendRow(["Дата створення", "ПІБ", "Телефон", "Email", "Обраний Час", "Тариф/Послуга", "Стійкість", "Фокус", "Системність"]);
    }
    
    const tariff = data.tariff || "Не вказано";
    sheet.appendRow([
      new Date(), name, phone, email, slot, tariff, scores.load, scores.focus, scores.system
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
    const action = e.parameter.action;
    
    // Генерація підпису для WayForPay
    if (action === "getSignature") {
      const merchantAccount = "t_me_d09a8";
      const merchantDomainName = "nadiabielaia-create.github.io";
      const secretKey = WAYFORPAY_SECRET_KEY || "YOUR_WAYFORPAY_SECRET_KEY";
      
      const orderReference = e.parameter.orderReference;
      const orderDate = e.parameter.orderDate;
      const amount = e.parameter.amount;
      const currency = e.parameter.currency;
      const productName = e.parameter.productName;
      const productCount = e.parameter.productCount || "1";
      const productPrice = e.parameter.productPrice || amount;

      const signatureString = [
        merchantAccount,
        merchantDomainName,
        orderReference,
        orderDate,
        amount,
        currency,
        productName,
        productCount,
        productPrice
      ].join(';');

      let signature = "dummy_signature";
      if (secretKey !== "YOUR_WAYFORPAY_SECRET_KEY") {
        const signatureBytes = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_MD5, signatureString, secretKey);
        signature = bytesToHex(signatureBytes);
      }

      const result = {
        status: "success",
        signature: signature
      };

      const callback = e.parameter.callback;
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Стандартний календар
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

// Допоміжна функція перетворення байт-масиву в Hex-рядок (заміна .map для Java byte[])
function bytesToHex(bytes) {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    let b = bytes[i];
    if (b < 0) {
      b += 256;
    }
    let s = b.toString(16);
    if (s.length === 1) {
      s = "0" + s;
    }
    hex += s;
  }
  return hex;
}
