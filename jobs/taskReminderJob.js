// jobs/taskReminderJob.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");

// ✅ Helper: parse "HH:mm" (24h) OR "h:mm AM/PM" into a Date object
function combineDateAndTime(date, timeString) {
  if (!timeString) return null;

  let hours, minutes;

  if (
    timeString.toLowerCase().includes("am") ||
    timeString.toLowerCase().includes("pm")
  ) {
    // 12-hour format with AM/PM
    const [time, modifier] = timeString.split(" ");
    [hours, minutes] = time.split(":").map(Number);

    if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;
  } else {
    // 24-hour format
    [hours, minutes] = timeString.split(":").map(Number);
  }

  const combined = new Date(date);
  combined.setHours(hours, minutes || 0, 0, 0);
  return combined;
}

function startTaskReminderJob() {
  // run every minute
  cron.schedule("* * * * *", async () => {
    console.log("⏰ Checking tasks for reminders...");

    const now = new Date();

    // ✅ Get all pending tasks & populate owner
    const tasks = await Task.find({ status: "pending" }).populate("owner");

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDateTime = combineDateAndTime(task.dueDate, task.time);
      if (!dueDateTime) continue;

      const diffMs = dueDateTime - now;
      const diffMins = Math.floor(diffMs / 60000);

      console.log(task);

      // ✅ Send notification if task is within 2 minutes from now
      if (diffMins >= 0 && diffMins <= 2) {
        await sendNotification(
          task,
          `⏰ Task Due Soon`,
          `Your task "${task.title}" is due at ${
            task.time
          } (${dueDateTime.toLocaleString()})`
        );
      }
    }
  });
}

async function sendNotification(task, title, body) {
  const user = task.owner;
  if (user && user.fcmTokens && user.fcmTokens.length > 0) {
    const message = {
      notification: { title, body },
      tokens: user.fcmTokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);

      // ✅ Remove invalid tokens
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) failedTokens.push(user.fcmTokens[idx]);
      });
      if (failedTokens.length > 0) {
        user.fcmTokens = user.fcmTokens.filter(
          (token) => !failedTokens.includes(token)
        );
        await user.save();
      }
      console.log(`📨 Notification sent for task "${task.title}"`);
    } catch (err) {
      console.error("❌ Error sending notification", err);
    }
  }
}

module.exports = startTaskReminderJob;
