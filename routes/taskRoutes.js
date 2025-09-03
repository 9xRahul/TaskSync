const express = require("express");
const {
  validateTaskTitle,
  validateTaskStatus,
  validateTaskDueDate,
  validateMongoIdParam,
  validateTaskTime,
  validateTaskCategory,
} = require("../utils/validators");
const {
  addTask,
  getTasks,
  updateTask,
  deleteTask,
  getTaskById,
  getTasksByOwnerId,
  getTasksAllTasksByUserId,
  getTasksByStatus,
  searchTasks,
} = require("../controllers/taskController");
const { authMiddleware } = require("../middlewares/Auth");

const router = express.Router();
router.use(authMiddleware);

router.post(
  "/addtask",
  [
    validateTaskTitle(),
    validateTaskStatus(),
    validateTaskDueDate(),
    validateTaskTime(),
    validateTaskCategory(),
  ],
  addTask
);
router.get("/gettasks", getTasks);
router.put(
  "/update/:id",
  [
    validateMongoIdParam(),
    validateTaskStatus(),
    validateTaskDueDate(),
    validateTaskTime(),
    validateTaskCategory(),
  ],
  updateTask
);
router.delete("/delete/:id", [validateMongoIdParam()], deleteTask);
router.get("/gettask/:id", validateMongoIdParam(), getTaskById);
router.post("/get-all-taks", getTasksByOwnerId);

router.get("/get-all-tasks-by-user/", getTasksAllTasksByUserId);
router.get(
  "/get-all-taks-by-status/:ownerId",
  validateMongoIdParam(),
  getTasksByStatus
);

router.get("/search", searchTasks);

router.get("/", (req, res) => {
  console.log("Server is active");
  res.send("✅ Server is alive");
});

module.exports = router;
