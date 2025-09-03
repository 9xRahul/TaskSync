const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");

//
// ✅ Helper: Convert UTC date → IST (UTC+5:30)
//
function toIST(date) {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
}

//
// ✅ Helper: Combine dueDate (string/Date) + time string into IST Date
//
function combineDateAndTime(dueDate, timeString) {
  if (!dueDate || !timeString) return null;

  let year, month, day;

  if (typeof dueDate === "string") {
    // Assume format "YYYY-MM-DD"
    [year, month, day] = dueDate.split("-").map(Number);
  } else if (dueDate instanceof Date) {
    year = dueDate.getUTCFullYear();
    month = dueDate.getUTCMonth() + 1;
    day = dueDate.getUTCDate();
  } else {
    return null;
  }

  let hours = 0,
    minutes = 0;

  if (
    timeString.toLowerCase().includes("am") ||
    timeString.toLowerCase().includes("pm")
  ) {
    // "h:mm AM/PM"
    const [time, modifier] = timeString.split(" ");
    [hours, minutes] = time.split(":").map(Number);

    if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;
  } else {
    // "HH:mm" 24hr
    [hours, minutes] = timeString.split(":").map(Number);
  }

  // Build UTC date first
  const utcDate = new Date(
    Date.UTC(year, month - 1, day, hours, minutes || 0, 0)
  );

  // Convert UTC → IST
  return toIST(utcDate);
}

//
// ✅ Main cron job
//
function startTaskReminderJob() {
  // run every minute
  cron.schedule("* * * * *", async () => {
    console.log("⏰ Checking tasks for reminders...");

    const now = toIST(new Date()); // always IST

    // fetch all pending tasks with user info
    const tasks = await Task.find({ status: "pending" }).populate("owner");

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDateTime = combineDateAndTime(task.dueDate, task.time);
      if (!dueDateTime) continue;

      const diffMs = dueDateTime - now;
      const diffMins = Math.floor(diffMs / 60000);

      // Debug log
      console.log(
        `🔎 Task "${task.title}" | Due: ${dueDateTime.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} | Now: ${now.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} | diff: ${diffMins} mins`
      );

      // ✅ Send 2 hours before
      if (diffMins === 120) {
        await sendNotification(
          task,
          "⏰ Reminder",
          `Your task "${task.title}" is due in 2 hours at ${task.time}`
        );
      }

      // ✅ Send at exact due time
      if (diffMins === 0) {
        await sendNotification(
          task,
          "⚠️ Task Due",
          `Your task "${task.title}" is due now!`
        );
      }
    }
  });
}

//
// ✅ Send notification
//
async function sendNotification(task, title, body) {
  const user = task.owner;

  if (user && user.fcmTokens && user.fcmTokens.length > 0) {
    const message = {
      notification: { title, body },
      tokens: user.fcmTokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);

      console.log(
        `🔔 FCM Response for task "${task.title}":`,
        JSON.stringify(response, null, 2)
      );

      // remove invalid tokens
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) failedTokens.push(user.fcmTokens[idx]);
      });

      if (failedTokens.length > 0) {
        user.fcmTokens = user.fcmTokens.filter(
          (token) => !failedTokens.includes(token)
        );
        await user.save();
        console.log("🧹 Removed invalid tokens for user:", user._id);
      }
    } catch (err) {
      console.error("❌ Error sending notification", err);
    }
  } else {
    console.log(`⚠️ No FCM tokens for user of task "${task.title}"`);
  }
}

module.exports = startTaskReminderJob;
