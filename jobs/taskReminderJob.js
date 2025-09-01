// jobs/taskReminderJob.js
const cron = require("node-cron");
const admin = require("../utils/firebase");
const Task = require("../models/Task");

function startTaskReminderJob() {
  cron.schedule("0 */2 * * *", async () => {
    console.log("⏰ Running task reminder job...");

    const now = new Date();
    const upcoming = new Date(now.getTime() + 2 * 60 * 60 * 1000); // ✅ next 2 hours

    const tasks = await Task.find({
      dueDate: { $gte: now, $lte: upcoming },
      status: "pending",
    }).populate("userId");

    for (const task of tasks) {
      const user = task.userId;
      if (user && user.fcmTokens.length > 0) {
        const message = {
          notification: {
            title: "Task Reminder ⏰",
            body: `Your task "${
              task.title
            }" is due at ${task.dueDate.toLocaleTimeString()}`,
          },
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
        } catch (err) {
          console.error("Error sending notification", err);
        }
      }
    }
  });
}

module.exports = startTaskReminderJob;
