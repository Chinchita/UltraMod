const reddit = require('./src/auth/reddit_auth');

async function fetchPosts() {
  const posts = await reddit.getSubreddit('learnprogramming').getNew();
  console.log(posts.map(post => post.title));
}

fetchPosts();
const path = require('path');
console.log(path.resolve(__dirname, './src/auth/reddit_auth.js'));
