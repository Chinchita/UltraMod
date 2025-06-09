const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class BanCommand {
    async execute({ subreddit, username, moderator, reason, duration, note }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            const banOptions = {
                name: username,
                banReason: reason || 'Banned by UltraModBot',
                banNote: note || '',
                duration: duration || 0 // 0 = permanent
            };

            await sub.banUser(banOptions);

            // Log the action
            await this.logAction({
                type: 'ban',
                subreddit,
                username,
                moderator,
                reason,
                duration,
                timestamp: new Date()
            });

            return {
                success: true,
                message: `User ${username} has been banned from r/${subreddit}`,
                action: 'ban',
                target: username,
                duration: duration || 'permanent'
            };
        } catch (error) {
            console.error('Ban command error:', error);
            throw new Error(`Failed to ban user: ${error.message}`);
        }
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }
}

module.exports = BanCommand;