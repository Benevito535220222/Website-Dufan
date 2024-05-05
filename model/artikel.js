const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const articleSchema = new Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    comments: [commentSchema] 
}, { timestamps: true });

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
