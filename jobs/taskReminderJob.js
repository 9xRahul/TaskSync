// jobs/taskReminderJob.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");

// ✅ Parse dueDate + time as IST
function combineDateAndTime(dueDate, timeString) {
  if (!dueDate || !timeString) return null;

  let [year, month, day] = [0, 0, 0];

  if (typeof dueDate === "string") {
    // "YYYY-MM-DD"
    [year, month, day] = dueDate.split("-").map(Number);
  } else if (dueDate instanceof Date) {
    year = dueDate.getFullYear();
    month = dueDate.getMonth() + 1;
    day = dueDate.getDate();
  } else {
    return null;
  }

  let hours = 0,
    minutes = 0;

  if (
    timeString.toLowerCase().includes("am") ||
    timeString.toLowerCase().includes("pm")
  ) {
    const [time, modifier] = timeString.split(" ");
    [hours, minutes] = time.split(":").map(Number);

    if (modifier.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (modifier.toLowerCase() === "am" && hours === 12) hours = 0;
  } else {
    [hours, minutes] = timeString.split(":").map(Number);
  }

  // ✅ Create a UTC date, then shift to IST explicitly
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes || 0));
  return utcDate;
}

function startTaskReminderJob() {
  cron.schedule("* * * * *", async () => {
    const now = new Date();

    console.log(
      `⏰ Checking tasks at: ${now.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      })} (IST)`
    );

    const tasks = await Task.find({ status: "pending" }).populate("owner");

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const dueDateTime = combineDateAndTime(task.dueDate, task.time);
      if (!dueDateTime) continue;

      const diffMs = dueDateTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      console.log(
        `🔎 Task "${task.title}" | Due: ${dueDateTime.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} | Now: ${now.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })} | diff: ${diffMins} mins`
      );

      // 🔔 Notifications
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
      const response = await admin.messaging().sendMulticast(message);

      console.log(
        `🔔 FCM Response for task "${task.title}":`,
        JSON.stringify(response, null, 2)
      );

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
