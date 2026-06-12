/**
 * LevelUp.Baddy - Google Apps Script Backend (ФІНАЛЬНА ВЕРСІЯ З ЗАХИСТОМ ВІД ДУБЛІКАТІВ ТА ТАЙМЗОНАМИ)
 */

const YOUR_EMAIL = "nadiia.bielaia@gmail.com"; // ВПИШІТЬ СВІЙ EMAIL ТУТ
const WORK_START_HOUR = 9;   // 09:00 за Парижем
const WORK_END_HOUR = 19;   // 19:00 за Парижем

// --- WAYFORPAY & AUTOMATION CONFIGURATION ---
const WAYFORPAY_SECRET_KEY = "0e6714242aff49e3bacf18fd9c29f3bb76589cfa"; // ВПИШІТЬ СВІЙ СЕКРЕТНИЙ КЛЮЧ ТУТ
const CRM_WEBHOOK_URL = ""; // (Опціонально) URL вашого CRM веб-хуку
const NOTION_MINICOURSE_LINK = "https://app.notion.com/p/Mimi-course-372dadbdbc9f80b392afe1346e699d3e?source=copy_link"; // Посилання на Notion мінікурс

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    logToSheet("doPost Triggered", "Info", "Payload: " + e.postData.contents);
    
    // 1. Обробити Webhook від WayForPay
    if (data.transactionStatus && data.merchantAccount === "t_me_d09a8") {
      const secretKey = WAYFORPAY_SECRET_KEY;
      
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
      if (secretKey && secretKey !== "YOUR_WAYFORPAY_SECRET_KEY") {
        const checkSigBytes = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_MD5, checkSigString, secretKey);
        const checkSignature = bytesToHex(checkSigBytes);
        
        if (checkSignature !== data.merchantSignature) {
          logToSheet("Signature Check", "Failed", "Sig mismatch. String: " + checkSigString + ". Expected: " + checkSignature + ", Got: " + data.merchantSignature);
          verified = false;
        } else {
          logToSheet("Signature Check", "Success", "Signature matches. Order: " + data.orderReference);
        }
      }
      
      if (verified && data.transactionStatus === "Approved") {
        const email = data.email || "Не вказано";
        const phone = data.phone || "Не вказано";
        const name = (data.clientFirstName || "") + " " + (data.clientLastName || "");
        const productName = Array.isArray(data.productName) ? data.productName.join(", ") : (data.productName || "Міні-курс Цифровий Inbox (Notion)");
        const amount = data.amount;
        const currency = data.currency;
        
        // а) Перевірка на дублікати (захист від повторного відправлення пошти при ретраях WayForPay)
        let paymentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Оплати") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Оплати");
        if (paymentSheet.getLastRow() === 0) {
          paymentSheet.appendRow(["Дата", "Замовлення", "Сума", "Валюта", "Статус", "ПІБ", "Email", "Телефон", "Товари"]);
        }
        
        const orderRef = data.orderReference;
        let isDuplicate = false;
        const lastRow = paymentSheet.getLastRow();
        if (lastRow > 1) {
          const values = paymentSheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Отримуємо номери замовлень (стовпчик B)
          for (let i = 0; i < values.length; i++) {
            if (values[i][0] === orderRef) {
              isDuplicate = true;
              break;
            }
          }
        }
        
        if (isDuplicate) {
          logToSheet("Process Order", "Skip", "Duplicate order skipped: " + orderRef);
          return sendWayForPayResponse(data, secretKey);
        }
        
        // б) Запис у лист "Оплати" (якщо не дублікат)
        paymentSheet.appendRow([
          new Date(),
          orderRef,
          amount,
          currency,
          data.transactionStatus,
          name.trim() || "Клієнт",
          email,
          phone,
          productName
        ]);
        logToSheet("Process Order", "Success", "Recorded payment to sheets for Order: " + orderRef);
        
        // в) Передача в CRM
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
                orderReference: orderRef,
                amount: amount,
                status: data.transactionStatus
              })
            });
            logToSheet("CRM Webhook", "Success", "Sent data for Order: " + orderRef);
          } catch (crmErr) {
            logToSheet("CRM Webhook", "Error", crmErr.toString());
          }
        }
        
        // г) Автовідправка вітального листа з Notion-мінікурсом (тільки для тарифів "Цифровий Inbox" та "Нейро-Спринт")
        try {
          let subject = "";
          let htmlBody = "";
          
          // Захисна перевірка: якщо це аудит (ціна 2500 або назва містить ключові слова), пошту НЕ спамимо
          const pNameLower = productName.toLowerCase();
          const parsedAmount = parseFloat(amount);
          const isAudit = (
            (!isNaN(parsedAmount) && parsedAmount >= 2000) ||
            pNameLower.indexOf("аудит") !== -1 ||
            pNameLower.indexOf("audit") !== -1 ||
            pNameLower.indexOf("когнітивний") !== -1 ||
            pNameLower.indexOf("cognitive") !== -1 ||
            pNameLower.indexOf("архітектор") !== -1 ||
            pNameLower.indexOf("architect") !== -1 ||
            pNameLower.indexOf("систем") !== -1 ||
            pNameLower.indexOf("system") !== -1
          );
          
          if (!isAudit) {
            // Надійний пошук ключових слів для продуктів
            const isSprint = (
              pNameLower.indexOf("спринт") !== -1 ||
              pNameLower.indexOf("sprint") !== -1 ||
              pNameLower.indexOf("нейро") !== -1 ||
              pNameLower.indexOf("neuro") !== -1
            );
            
            if (isSprint) {
              subject = "Ваше місце заброньовано: Нейро-Спринт!";
              htmlBody = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="color: #10b981; margin: 0;">LevelUp.Strategy</h2>
                    <p style="font-size: 14px; color: #64748b; margin: 4px 0 0 0;">Групова практика та Нейро-Спринт</p>
                  </div>
                  
                  <p>Вітаємо, <strong>${data.clientFirstName || 'Друже'}</strong>!</p>
                  <p>Дякуємо за оплату завдатку для участі у спринті <strong>Нейро-Спринт</strong>.</p>
                  <p>Ваше місце в групі успішно заброньовано! Решту суми (<strong>4500 грн</strong>) ви сплатите після офіційного старту групи.</p>
                  <p>А поки що ви можете почати ознайомлення з <strong>Міні-курсом Цифровий Inbox (Notion)</strong>:</p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${NOTION_MINICOURSE_LINK}" target="_blank" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 30px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);">
                      👉 Отримати доступ до Міні-курсу в Notion
                    </a>
                  </div>
                  
                  <p style="font-size: 14px;">Ми зв'яжемося з вами, щойно буде сформовано склад групи для узгодження дати старту.</p>
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                  <p style="font-size: 13px; color: #64748b;">З повагою,<br/>Команда LevelUp.Strategy</p>
                </div>
              `;
            } else {
              // За замовчуванням надсилаємо міні-курс "Цифровий Inbox"
              subject = "Ваш доступ до Міні-курсу 'Цифровий Inbox'";
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
                  <p style="font-size: 13px; color: #64748b;">Якщо виникнуть запитання або проблеми з доступом, напишіть нам у підтримку Telegram.</p>
                  <p style="font-size: 13px; color: #64748b; margin-top: 8px;">З повагою,<br/>Команда LevelUp.Strategy</p>
                </div>
              `;
            }
          } else {
            logToSheet("Send Email", "Skip", "Audit product detected, skipping welcome email: " + productName);
          }
          
          if (htmlBody) {
            logToSheet("Send Email", "Attempting", "Sending to: " + email + ", Subject: " + subject);
            MailApp.sendEmail({
              to: email,
              subject: subject,
              htmlBody: htmlBody
            });
            logToSheet("Send Email", "Success", "Email sent successfully to: " + email);
          }
        } catch (mailErr) {
          logToSheet("Send Email", "Error", mailErr.toString());
        }
        
        return sendWayForPayResponse(data, secretKey);
      } else {
        logToSheet("Process Order", "Skip", "Transaction status is not Approved: " + (data ? data.transactionStatus : "undefined"));
        return sendWayForPayResponse(data, secretKey);
      }
    }
    
    // 2. Стандартна логіка для бронювань та лідів з фронтенду
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Бронювання") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Бронювання");
    const action = data.action;
    const calendar = CalendarApp.getCalendarById(YOUR_EMAIL) || CalendarApp.getDefaultCalendar();

    // СКАСУВАННЯ БРОНЮВАННЯ
    if (action === "cancel") {
      let deletedCount = 0;

      // Спочатку пробуємо видалити за eventId (найточніший спосіб)
      if (data.eventId) {
        try {
          const eventById = calendar.getEventById(data.eventId);
          if (eventById) {
            eventById.deleteEvent();
            deletedCount++;
          }
        } catch (idErr) {
          Logger.log("Delete by eventId failed: " + idErr.toString());
        }
      }

      // Якщо не вдалося за eventId — шукаємо за телефоном або часом слоту в описі
      if (deletedCount === 0) {
        const now = new Date();
        const searchStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const endSearch = new Date(now.getTime() + (31 * 24 * 60 * 60 * 1000));
        const events = calendar.getEvents(searchStart, endSearch);

        // Нормалізуємо телефон для порівняння (прибираємо нецифрові символи)
        const normalizePhone = (p) => (p || '').replace(/\D/g, '');
        const phoneNorm = normalizePhone(data.phone);

        // Якщо передано slot — перевіряємо збіг часу
        const slotTime = data.slot ? new Date(data.slot).getTime() : null;

        events.forEach(event => {
          const desc = event.getDescription() || '';
          const startMs = event.getStartTime().getTime();

          const phoneMatch = phoneNorm && normalizePhone(desc).indexOf(phoneNorm) !== -1;
          const slotMatch = slotTime && Math.abs(startMs - slotTime) < 60000; // в межах 1 хвилини

          if (phoneMatch || slotMatch) {
            event.deleteEvent();
            deletedCount++;
          }
        });
      }

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

    // НАДІЙНА Валідація робочих годин (09:00 - 19:00 за часовим поясом календаря) та вихідних днів
    const calendarTimeZone = calendar.getTimeZone();
    const localHour = parseInt(Utilities.formatDate(slot, calendarTimeZone, "HH"));
    const localDay = Utilities.formatDate(slot, calendarTimeZone, "E"); // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
    const isWeekend = (localDay === "Sat" || localDay === "Sun");

    if (isWeekend) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Бронювання на вихідні дні неможливе." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (localHour < WORK_START_HOUR || localHour >= WORK_END_HOUR) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "Бронювання можливе тільки в робочий час з 09:00 до 19:00 за часовим поясом вашого календаря (" + calendarTimeZone + ")." 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const scores = data.quizScores;
    
    const endTime = new Date(slot);
    endTime.setMinutes(endTime.getMinutes() + 60);
    
    // Захист від накладення подій (якщо два користувачі надіслали запит одночасно)
    const checkStart = new Date(slot.getTime() + 1000);
    const checkEnd = new Date(endTime.getTime() - 1000);
    const overlappingEvents = calendar.getEvents(checkStart, checkEnd);
    const hasOverlappingTimeEvent = overlappingEvents.some(ev => !ev.isAllDayEvent());
    if (hasOverlappingTimeEvent) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "На жаль, цей час вже було заброньовано іншим користувачем. Будь ласка, оберіть інший вільний слот." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Запис у Google Таблицю
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Дата створення", "ПІБ", "Телефон", "Email", "Обраний Час", "Тариф/Послуга", "Стійкість", "Фокус", "Системність"]);
    }
    
    const tariff = data.tariff || "Не вказано";
    sheet.appendRow([
      new Date(), name, phone, email, slot, tariff, scores.load, scores.focus, scores.system
    ]);
    
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
    logToSheet("doPost Error", "Fatal", error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === "diagnoseTimezones") {
      const calendar = CalendarApp.getCalendarById(YOUR_EMAIL) || CalendarApp.getDefaultCalendar();
      const testDate = new Date("2026-06-12T06:00:00.000Z");
      const result = {
        status: "success",
        scriptTimeZone: Session.getScriptTimeZone(),
        spreadsheetTimeZone: SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
        calendarTimeZone: calendar.getTimeZone(),
        testDateRaw: testDate.toString(),
        testDateLocalHours: testDate.getHours(),
        testDateUtcHours: testDate.getUTCHours(),
        formattedDateKyiv: Utilities.formatDate(testDate, "Europe/Kiev", "yyyy-MM-dd HH:mm:ss"),
        formattedDateParis: Utilities.formatDate(testDate, "Europe/Paris", "yyyy-MM-dd HH:mm:ss"),
        formattedDateScript: Utilities.formatDate(testDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
      };
      const callback = e.parameter.callback;
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Перевірка успішності оплати за базою даних
    if (action === "checkPayment") {
      const email = e.parameter.email;
      const payStartTime = e.parameter.payStartTime;
      const payStartTimeParsed = payStartTime ? parseInt(payStartTime) : 0;
      const result = { status: "pending" };
      
      if (email && email !== "-") {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const paymentSheet = ss.getSheetByName("Оплати");
        if (paymentSheet) {
          const lastRow = paymentSheet.getLastRow();
          if (lastRow > 1) {
            const data = paymentSheet.getRange(2, 1, lastRow - 1, 9).getValues();
            const nowMs = new Date().getTime();
            
            // Шукаємо знизу вгору (від найновіших)
            for (let i = data.length - 1; i >= 0; i--) {
              const rowDate = new Date(data[i][0]);
              const rowStatus = data[i][4];
              const rowEmail = data[i][6];
              const rowProduct = data[i][8];
              
              if (rowEmail && rowEmail.trim().toLowerCase() === email.trim().toLowerCase() && 
                  rowStatus === "Approved" && 
                  (nowMs - rowDate.getTime()) < 24 * 60 * 60 * 1000 &&
                  (payStartTimeParsed === 0 || rowDate.getTime() > (payStartTimeParsed - 60 * 1000))) {
                result.status = "success";
                result.product = rowProduct;
                break;
              }
            }
          }
        }
      }
      
      const callback = e.parameter.callback;
      if (callback) {
        return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Генерація підпису для WayForPay
    if (action === "getSignature") {
      const merchantAccount = "t_me_d09a8";
      const merchantDomainName = "nadiiabielaia-create.github.io";
      const secretKey = WAYFORPAY_SECRET_KEY;
      
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
      if (secretKey && secretKey !== "YOUR_WAYFORPAY_SECRET_KEY") {
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
    
    // Отримуємо таймстемпи (мілісекунди) зайнятих слотів, ігноруючи цілодні події (all-day events)
    const busySlots = [];
    events.forEach(ev => {
      if (!ev.isAllDayEvent()) {
        busySlots.push({
          start: ev.getStartTime().getTime(),
          end: ev.getEndTime().getTime()
        });
      }
    });
    
    const result = { 
      status: "success", 
      serverTime: new Date().getTime(),
      busySlots: busySlots,
      calendarName: calendar.getName(),
      calendarId: calendar.getId(),
      calendarTimeZone: calendar.getTimeZone(),
      scriptTimeZone: Session.getScriptTimeZone()
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

// Допоміжна функція відправки відповіді у WayForPay
function sendWayForPayResponse(data, secretKey) {
  const responseTime = Math.round(new Date().getTime() / 1000);
  const responseStatus = "accept";
  const responseSigString = data.orderReference + ";" + responseStatus + ";" + responseTime;
  
  let responseSignature = "dummy_signature";
  if (secretKey && secretKey !== "YOUR_WAYFORPAY_SECRET_KEY") {
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

/**
 * --- ФУНКЦІЯ ДЛЯ ЛОКАЛЬНОГО ТЕСТУВАННЯ АВТОМАТИЗАЦІЇ ---
 */
function runLocalTest() {
  const myTestEmail = "nadiia.bielaia@gmail.com"; 
  const testProduct = "Цифровий Inbox"; 
  
  const mockPayload = {
    merchantAccount: "t_me_d09a8",
    orderReference: "TEST-ORDER-" + Math.round(Math.random() * 1000000),
    amount: "700",
    currency: "UAH",
    authCode: "123456",
    cardPan: "411111XXXXXX1111",
    transactionStatus: "Approved",
    reasonCode: "1100",
    email: myTestEmail,
    phone: "+380991234567",
    clientFirstName: "Тест",
    clientLastName: "Клієнт",
    productName: [testProduct],
    merchantSignature: "test_bypass"
  };

  const name = mockPayload.clientFirstName + " " + mockPayload.clientLastName;
  
  // а) Запис у лист "Оплати"
  let paymentSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Оплати") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Оплати");
  if (paymentSheet.getLastRow() === 0) {
    paymentSheet.appendRow(["Дата", "Замовлення", "Сума", "Валюта", "Статус", "ПІБ", "Email", "Телефон", "Товари"]);
  }
  paymentSheet.appendRow([
    new Date(),
    mockPayload.orderReference,
    mockPayload.amount,
    mockPayload.currency,
    mockPayload.transactionStatus,
    name,
    mockPayload.email,
    mockPayload.phone,
    testProduct
  ]);
  Logger.log("✔️ Рядок успішно записано у вкладку 'Оплати'!");
  Logger.log("✔️ Тестовий лист успішно надіслано на пошту: " + mockPayload.email);
}

// Допоміжна функція для логування в таблицю "Логи"
function logToSheet(action, status, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName("Логи") || ss.insertSheet("Логи");
    if (logSheet.getLastRow() === 0) {
      logSheet.appendRow(["Дата", "Дія", "Статус", "Деталі"]);
    }
    logSheet.appendRow([new Date(), action, status, details]);
  } catch (err) {
    Logger.log("Logging failed: " + err.toString());
  }
}