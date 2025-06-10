const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class KickCommand {
    async execute({ subreddit, username, moderator, reason, note }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            // Reddit doesn't have "kick" so we implement as very short temp ban
            const banOptions = {
                name: username,
                banReason: reason || 'Kicked by UltraModBot',
                banNote: note || 'Temporary kick - will be unbanned shortly',
                duration: 1 // 1 day minimum
            };

            await sub.banUser(banOptions);
            
            // Schedule unban after 1 minute (simulate kick)
            setTimeout(async () => {
                try {
                    await sub.unbanUser({ name: username });
                } catch (error) {
                    console.error('Auto-unban after kick failed:', error);
                }
            }, 60000); // 1 minute

            // Log the action
            await this.logAction({
                type: 'kick',
                subreddit,
                username,
                moderator,
                reason: reason || 'Kicked by UltraModBot',
                note,
                timestamp: new Date()
            });

            return {
                success: true,
                message: `User ${username} has been kicked from r/${subreddit}`,
                action: 'kick',
                target: username,
                note: 'User will be automatically unbanned in 1 minute'
            };
        } catch (error) {
            console.error('Kick command error:', error);
            throw new Error(`Failed to kick user: ${error.message}`);
        }
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }
}

module.exports = KickCommand;