//jshint esversion:6

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const date = require(__dirname + '/date.js');
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
const day = date.getDate();

const dbUrl = process.env.MONGO_DB;
mongoose.connect(
  dbUrl,
  { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }
);

//Create the task and list schemas
const taskSchema = new mongoose.Schema({
  name: String,
});
const Task = mongoose.model("Task", taskSchema);

const listSchema = {
  name: String,
  items: [taskSchema],
};
const List = mongoose.model("List", listSchema);

//Create some instructions in the list by an array of default tasks
const default1 = new Task({
  name: "Type your task name in the 'New Item' field below",
});
const default2 = new Task({
  name: "Hit the + button to add the new task",
});
const default3 = new Task({
  name: "<-- Hit this button to mark as completed.",
});
const defaultItems = [default1, default2, default3];

//Set up the root to accept new tasks
app.get("/", function (req, res) {
  const listHeading = "All Tasks";
  const slug = "";

  //Find the array of tasks and render
  Task.find({}, function (err, tasks) {
    if (err) {
      console.log(err);
    } else if (tasks.length === 0) {
      //If array is empty, show the default array with instructions
      res.render("list", {
        listDate: day,
        id: tasks._id,
        listName: listHeading,
        tasks: defaultItems,
        slug: slug,
        _: _,
      });
    } else {
      //If not empty, display the array of tasks
      res.render("list", {
        listDate: day,
        id: tasks._id,
        listName: listHeading,
        tasks: tasks,
        slug: slug,
        _: _,
      });
    }
  });
});

//Set up the dynamic page for list names and items
app.get("/:listName", function (req, res) {
  const listHeading = _.startCase(req.params.listName);
  const slug = _.kebabCase(listHeading);

  //Define an empty list
  const list = new List({
    name: listHeading,
    items: [],
  });
  //Look for the list that matches the slug.
  List.findOne({ name: listHeading }, function (err, found) {
    if (err) {
      console.log(err);
    } else if (!found) {
      //If it's not found, render the default instructions items and create the list
      res.render("list", {
        listDate: day,
        id: null,
        listName: listHeading,
        tasks: defaultItems,
        slug: slug,
        _: _,
      });
      list.save();
    } else if (found) {
      //render the list items if there is a list but it's empty
      const arrayItems = found.items;
      if (arrayItems.length === 0) {
        res.render("list", {
          listDate: day,
          id: found._id,
          listName: listHeading,
          tasks: defaultItems,
          slug: slug,
          _: _,
        });
      } else {
        //or just render the populated list
        res.render("list", {
          listDate: day,
          id: found._id,
          listName: found.name,
          tasks: found.items,
          slug: slug,
          _: _,
        });
      }
    }
  });
});

//Create the path for posting new tasks or items
app.post("/", function (req, res) {
  const taskAdded = req.body.newItem;
  const listName = req.body.list;
  const slug = req.body.slug;

  //Define the new task
  const newTask = new Task({
    name: taskAdded,
  });

  //if on the home page then create a new task
  if (listName === "All Tasks") {
    newTask.save();
    res.redirect("/");
  } else {
    //if in a custom list then create a new list item
    List.findOne({ name: listName }, function (err, found) {
      if (err) {
        console.log(err);
      } else {
        found.items.push(newTask);
        found.save();
        res.redirect("back");
        console.log("List item added.");
      }
    });
  }
});

//Create the path for deleting items
app.post("/delete", function (req, res) {
  const deletedTaskId = req.body.deleteTask;
  const deletedListName = req.body.listName;
  const slug = req.body.slug;
  const listId = req.body.listId;

  //use object id to remove home page tasks
  if (deletedListName === "All Tasks") {
    Task.findByIdAndRemove(deletedTaskId, function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Successfully deleted item ID: " + deletedTaskId);
        res.redirect("/");
      }
    });
  } else {
    //or find the list name and pull the item
    List.findOneAndUpdate(
      { name: deletedListName },
      { $pull: { items: { _id: deletedTaskId } } },
      function (err, foundList) {
        if (err) {
          console.log(err);
        } else if (foundList.tasks === 0) {
          //if there are no items left, re-render the default instructions
          List.findOneAndRemove({ _id: listId }, function (err, didDelete) {
            if (err) {
              console.log(err);
            } else {
              console.log(
                "List ID " + didDelete._id + " List Deleted successfully!"
              );
              res.redirect("/" + slug);
            }
          });
        } else {
          res.redirect("/" + slug);
        }
      }
    );
  }
});

//Define the server listening port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function () {
  console.log("Server started successfully");
});
