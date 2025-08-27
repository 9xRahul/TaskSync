const Task = require("../models/Task");
const jwt = require("jsonwebtoken");
exports.addTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      dueDate,
      time,
      category,
      categoryIndex,
    } = req.body;

    // Ensure the authenticated user's ID is linked to the task
    const task = await Task.create({
      title,
      description,
      status,
      dueDate,
      time,
      category,
      owner: req.user.id,
      categoryIndex,
      // Comes from authentication middleware
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

exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.find(id);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

//task bt owner id
exports.getTasksByOwnerId = async (req, res) => {
  try {
    // Get token from headers
    const authHeader = req.headers.authorization;

    const { status, category } = req.body;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    let token = authHeader.split(" ")[1];
    token = token.replace(/['"]+/g, ""); // remove quotes if accidentally added

    console.log("Raw Token:", token);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded payload:", decoded);
    } catch (err) {
      return res.status(401).json({ success: false, error: err.message });
    }

    // Take user id from token
    const ownerId = decoded.id;
    console.log("Owner ID from token:", ownerId);

    var tasks = [];

    // Find tasks belonging to logged-in user
    if (category.toLowerCase() === "all") {
      tasks = await Task.find({
        owner: ownerId,
        status: status,
      }).sort({ createdAt: -1 });
    } else {
      tasks = await Task.find({
        owner: ownerId,
        status: status,
        category: { $regex: `^${category}$`, $options: "i" },
      }).sort({ createdAt: -1 });
    }

    if (!tasks || tasks.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No tasks found for this owner" });
    }

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTasksByCategory = async (req, res) => {
  try {
    const { ownerId } = req.params; // get ownerId from URL params

    const { category } = req.body;

    console.log("Owner ID:", ownerId); // Log the ownerId for debugging
    const tasks = await Task.find({ owner: ownerId, category: category }); // find all tasks with ownerId

    if (!tasks || tasks.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: `No tasks  in ${category}` });
    }

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTasksByStatus = async (req, res) => {
  try {
    const { ownerId } = req.params; // get ownerId from URL params

    const { status } = req.body;

    console.log("Owner ID:", ownerId); // Log the ownerId for debugging
    const tasks = await Task.find({ owner: ownerId, status: status }); // find all tasks with ownerId

    if (!tasks || tasks.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: `No tasks  are ${status}` });
    }

    return res.status(200).json({ success: true, data: tasks });
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

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { $set: req.body }, // ensures only provided fields are updated
      { new: true, runValidators: false } // skip required validators
    );

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

exports.searchTasks = async (req, res) => {
  try {
    console.log(req.user);
    const query = req.query.q;
    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const tasks = await Task.find({
      owner: req.user.id,
      $or: [
        { title: { $regex: query, $options: "i" } }, // case-insensitive search
        { description: { $regex: query, $options: "i" } },
      ],
    });

    res.json({ success: true, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
