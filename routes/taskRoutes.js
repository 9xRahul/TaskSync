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
    validateTaskTitle(),
    validateTaskStatus(),
    validateTaskDueDate(),
    validateTaskTime(),
    validateTaskCategory(),
  ],
  updateTask
);
router.delete("/delete/:id", [validateMongoIdParam()], deleteTask);
router.get("/gettask/:id", validateMongoIdParam(), getTaskById);
router.get("/get-all-taks/:id", validateMongoIdParam(), getTasksByOwnerId);

module.exports = router;
