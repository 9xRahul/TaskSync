const Task = require("../models/Task");

exports.addTask = async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body;

    // Ensure the authenticated user's ID is linked to the task
    const task = await Task.create({
      title,
      description,
      status,
      dueDate,
      owner: req.user.id, // Comes from authentication middleware
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all tasks
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (task.owner != req.user.id) {
      return res
        .status(401)
        .json({ success: false, error: "You canot update this task" });
    }

    const updatedTask = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedTask) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(req.user);

    const task = await Task.findById(id);

    if (task.owner != req.user.id) {
      return res
        .status(401)
        .json({ success: false, error: "You canot update this task" });
    }

    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
