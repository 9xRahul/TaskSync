// jobs/taskReminderJob.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");

// ✅ Helper: parse "HH:mm" (24h) OR "h:mm AM/PM" into Date object
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

    // ✅ Get all pending tasks & populate owner (user)
    const tasks = await Task.find({ status: "pending" }).populate("owner");

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDateTime = combineDateAndTime(task.dueDate, task.time);
      if (!dueDateTime) continue;

      const diffMs = dueDateTime - now;
      const diffMins = Math.floor(diffMs / 60000);

      // Debug log
      console.log(
        `🔎 Task "${
          task.title
        }" due at ${dueDateTime.toLocaleString()} | diff ${diffMins} mins`
      );

      // ✅ Notify 2 hours before
      if (diffMins === 120) {
        await sendNotification(
          task,
          "⏰ Reminder",
          `Your task "${task.title}" is due in 2 hours at ${task.time}`
        );
      }

      // ✅ Notify exactly at due time
      if (diffMins === 0) {
        await sendNotification(
          task,
          "⚠️ Task Due",
          `Your task "${task.title}" is due now!`
        );
      }

      // ✅ (Optional) If you want: notify when within 2 minutes (instead of exact match)
      if (diffMins >= 0 && diffMins <= 2) {
        await sendNotification(
          task,
          "⏰ Task Due Soon",
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

      console.log("🔔 FCM Response:", JSON.stringify(response, null, 2));

      // ✅ Check if *any* success
      const successCount = response.responses.filter((r) => r.success).length;
      const failCount = response.responses.filter((r) => !r.success).length;

      console.log(
        `📨 Task "${task.title}" → Success: ${successCount}, Failures: ${failCount}`
      );

      // ✅ Remove invalid tokens
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error("❌ Token failed:", user.fcmTokens[idx], resp.error);
          failedTokens.push(user.fcmTokens[idx]);
        }
      });

      if (failedTokens.length > 0) {
        user.fcmTokens = user.fcmTokens.filter(
          (token) => !failedTokens.includes(token)
        );
        await user.save();
        console.log("🧹 Cleaned invalid tokens for user:", user._id);
      }
    } catch (err) {
      console.error("❌ Error sending notification:", err);
    }
  } else {
    console.log(`⚠️ No FCM tokens for user of task "${task.title}"`);
  }
}

module.exports = startTaskReminderJob;
