// jobs/taskReminderJob.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");
const moment = require("moment-timezone");

// ✅ Combine dueDate (date) + time (string) in IST
function combineDateAndTime(dueDate, timeString) {
  if (!dueDate || !timeString) return null;

  const datePart = moment(dueDate).format("YYYY-MM-DD"); // force to date only
  const dateTimeStr = `${datePart} ${timeString}`;

  // Try parse "YYYY-MM-DD HH:mm" or "YYYY-MM-DD h:mm A"
  let m;
  if (
    timeString.toLowerCase().includes("am") ||
    timeString.toLowerCase().includes("pm")
  ) {
    m = moment.tz(dateTimeStr, "YYYY-MM-DD h:mm A", "Asia/Kolkata");
  } else {
    m = moment.tz(dateTimeStr, "YYYY-MM-DD HH:mm", "Asia/Kolkata");
  }

  return m.isValid() ? m : null;
}

function startTaskReminderJob() {
  cron.schedule("* * * * *", async () => {
    const now = moment.tz("Asia/Kolkata");

    console.log(`⏰ Checking at IST: ${now.format("YYYY-MM-DD HH:mm:ss")}`);

    const tasks = await Task.find({ status: "pending" }).populate("owner");

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDateTime = combineDateAndTime(task.dueDate, task.time);
      if (!dueDateTime) continue;

      const diffMins = dueDateTime.diff(now, "minutes");

      console.log(
        `🔎 Task "${task.title}" | Due: ${dueDateTime.format(
          "YYYY-MM-DD hh:mm A"
        )} | Now: ${now.format("YYYY-MM-DD hh:mm A")} | diff: ${diffMins} mins`
      );

      if (diffMins === 120) {
        await sendNotification(
          task,
          "⏰ Reminder",
          `Your task "${task.title}" is due in 2 hours at ${task.time}`
        );
      }

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
async function sendNotification(task, title, body) {
  const user = task.owner;

  if (user && user.fcmTokens && user.fcmTokens.length > 0) {
    const message = {
      notification: { title, body },
      tokens: user.fcmTokens,
    };

    try {
      // ✅ Use sendEachForMulticast for firebase-admin >= v11
      const response = await admin.messaging().sendEachForMulticast(message);

      console.log(
        `🔔 FCM Response for "${task.title}":`,
        JSON.stringify(response, null, 2)
      );

      // ❌ Do NOT remove failed tokens here
      // Just log failures for debugging/monitoring
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.warn(
            `⚠️ Failed to send to token: ${user.fcmTokens[idx]} - ${resp.error?.message}`
          );
        }
      });
    } catch (err) {
      console.error("❌ Error sending notification", err);
    }
  } else {
    console.log(`⚠️ No FCM tokens for "${task.title}"`);
  }
}

module.exports = startTaskReminderJob;
