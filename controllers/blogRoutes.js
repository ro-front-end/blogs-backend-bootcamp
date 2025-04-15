const blogRouter = require("express").Router();
const mongoose = require("mongoose");
const Blog = require("../models/blogSchema");
const User = require("../models/UserSchema");
const logger = require("../utils/logger");
const jwt = require("jsonwebtoken");

// const getTokenFrom = (request) => {
//   const authorization = request.get("authorization");
//   if (authorization && authorization.startsWith("Bearer ")) {
//     return authorization.replace("Bearer ", "");
//   }
//   return null;
// };

blogRouter.get("/", async (request, response) => {
  try {
    const blogs = await Blog.find({}).populate("user", {
      username: 1,
      name: 1,
    });
    response.json(blogs);
  } catch (error) {
    logger.error("Error retrieving blogs:", error);
    response.status(500).send("Error retrieving blogs.");
  }
});

blogRouter.get("/:id", async (request, response) => {
  try {
    const blog = await Blog.findById(request.params.id);
    if (blog) {
      response.json(blog);
    } else {
      response.status(404).send({ error: "Blog not found." });
    }
  } catch (error) {
    logger.error("Error retrieving blog:", error);
    response.status(500).send("Error retrieving blogs");
  }
});

blogRouter.post("/", async (request, response) => {
  const { title, author, url, likes } = request.body;

  if (!title || !author || !url) {
    return response
      .status(400)
      .send({ error: "title, author and url are required." });
  }

  const user = request.user;

  const blog = new Blog({
    title,
    author,
    url,
    likes: likes || 0,
    user: user._id,
  });

  try {
    const savedBlog = await blog.save();
    user.blogs = user.blogs.concat(savedBlog._id);
    await user.save();

    response.status(201).json(savedBlog);
  } catch (error) {
    logger.error("Error creating blog:", error);
    response.status(500).send("Error creating blog.");
  }
});

blogRouter.put("/:id", async (request, response) => {
  const { title, author, url, likes } = request.body;

  const updatedBlog = {
    title,
    author,
    url,
    likes,
  };

  try {
    const blog = await Blog.findByIdAndUpdate(request.params.id, updatedBlog, {
      new: true,
      runValidators: true,
      context: "query",
    });

    if (blog) {
      response.json(blog);
    } else {
      response.status(404).send({ error: "Blog not found." });
    }
  } catch (error) {
    logger.error("Error updating blog:", error);
    response.status(500).send("Error updating blog.");
  }
});

blogRouter.delete("/:id", async (request, response) => {
  try {
    const blog = await Blog.findById(request.params.id);
    if (!blog) {
      return response.status(404).send({ error: "Blog not found" });
    }

    if (blog.user.toString() !== request.user._id.toString()) {
      return response
        .status(403)
        .json({ error: "You do not have permission to delete this blog" });
    }

    await Blog.findByIdAndDelete(request.params.id);
    if (blog) {
      response.status(204).send();
    } else {
      response.status(404).send({ error: "Blog not found" });
    }
  } catch (error) {
    logger.error("Error deleting blog:", error);
    response.status(500).send("Error deleting blog.");
  }
});

blogRouter.patch("/:id/likes", async (request, response) => {
  try {
    const { likes } = request.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
      request.params.id,
      { likes },
      { new: true, runValidators: true, context: "query" }
    );

    if (!updatedBlog) {
      return response.status(404).send({ error: "Blog not found." });
    }

    response.json(updatedBlog);
  } catch (error) {
    logger.error("Error updating likes:", error);
    response.status(500).send("Error updating likes.");
  }
});

module.exports = blogRouter;
