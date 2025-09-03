// jobs/taskReminderJob.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");

// helper: parse "HH:mm" or "h:mm AM/PM" into Date object for the given date
function combineDateAndTime(date, timeString) {
  if (!timeString) return null;

  const [time, modifier] = timeString.split(" "); // e.g. ["3:45", "PM"]
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier) {
    if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;
  }

  const combined = new Date(date);
  combined.setHours(hours, minutes || 0, 0, 0);
  return combined;
}

function startTaskReminderJob() {
  // run every minute (you can change to "*/5 * * * *" = every 5 minutes)
  cron.schedule("* * * * *", async () => {
    console.log("⏰ Checking tasks for reminders...");

    const now = new Date();

    // ✅ Populate owner instead of userId
    const tasks = await Task.find({ status: "pending" }).populate("owner");

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDateTime = combineDateAndTime(task.dueDate, task.time);
      if (!dueDateTime) continue;

      const diffMs = dueDateTime - now;
      const diffMins = Math.floor(diffMs / 60000);

      // ✅ Notify 2 hours before
      if (diffMins === 120) {
        await sendNotification(
          task,
          `Reminder ⏰`,
          `Your task "${task.title}" is due in 2 hours at ${task.time}`
        );
      }

      // ✅ Notify at exact due time
      if (diffMins === 0) {
        await sendNotification(
          task,
          `Task Due ⚠️`,
          `Your task "${task.title}" is due now!`
        );
      }
    }
  });
}

async function sendNotification(task, title, body) {
  const user = task.owner; // ✅ use owner instead of userId
  if (user && user.fcmTokens && user.fcmTokens.length > 0) {
    const message = {
      notification: { title, body },
      tokens: user.fcmTokens,
    };

    try {
      const response = await admin.messaging().sendMulticast(message);

      // ✅ Clean invalid tokens
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
      console.log(`📨 Notification sent for task ${task.title}`);
    } catch (err) {
      console.error("❌ Error sending notification", err);
    }
  }
}

module.exports = startTaskReminderJob;
