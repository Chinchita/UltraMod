const Snoowrap = require('snoowrap');
require('dotenv').config();

class RedditAuth {
    constructor() {
        this.reddit = new Snoowrap({
            userAgent: 'UltraModBot/1.0.0 by /u/UltraModBot',
            clientId: process.env.REDDIT_CLIENT_ID,
            clientSecret: process.env.REDDIT_CLIENT_SECRET,
            username: process.env.REDDIT_USERNAME,
            password: process.env.REDDIT_PASSWORD
        });
    }

    getRedditInstance() {
        return this.reddit;
    }

    async validateModerator(username, subredditName) {
        try {
            const subreddit = await this.reddit.getSubreddit(subredditName);
            const moderators = await subreddit.getModerators();
            
            return moderators.some(mod => 
                mod.name.toLowerCase() === username.toLowerCase()
            );
        } catch (error) {
            console.error('Error validating moderator:', error);
            return false;
        }
    }

    async getSubredditPermissions(username, subredditName) {
        try {
            const subreddit = await this.reddit.getSubreddit(subredditName);
            const moderators = await subreddit.getModerators();
            
            const moderator = moderators.find(mod => 
                mod.name.toLowerCase() === username.toLowerCase()
            );
            
            return moderator ? moderator.mod_permissions : [];
        } catch (error) {
            console.error('Error getting permissions:', error);
            return [];
        }
    }
}

module.exports = new RedditAuth();