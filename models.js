"use strict";

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const authorSchema = mongoose.Schema({
    firstName: "string",
    lastName: "string",
    userName: {
        type: "string",
        unique: true
    }
});

const blogPostSchema = mongoose.Schema({
    author: {type: mongoose.Schema.Types.ObjectId, ref: "Author"
    },
    title: {type: String, required: true},
    content: {type: String},
    created: {type: Date, default: Date.now}
});

blogPostSchema.pre("find", function(next) {
    this.populate("author");
    next();
});

blogPostSchema.pre('findOne', function (next) {
    this.populate('author');
    next();
});

blogPostSchema.virtual("authorName").get(function() {
    return `${this.author.firstName} ${this.author.lastName}`;
});


blogPostSchema.methods.serialize = function() {
    return {
        id: this._id,
        author: this.authorName,
        content: this.content,
        title: this.title,
        created: this.created
    };
};

var Author = mongoose.model("Author", authorSchema);
const BlogPost = mongoose.model("BlogPost", blogPostSchema);


module.exports = {Author, BlogPost};