const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class UnbanCommand {
    async execute({ subreddit, username, moderator, reason, note }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            await sub.unbanUser({ name: username });

            // Log the action
            await this.logAction({
                type: 'unban',
                subreddit,
                username,
                moderator,
                reason: reason || 'Unbanned by UltraModBot',
                note,
                timestamp: new Date()
            });

            // Cancel any scheduled unbans
            const db = Database.getDb();
            await db.collection('scheduledActions').updateMany(
                {
                    type: 'unban',
                    subreddit,
                    username,
                    status: 'pending'
                },
                {
                    $set: { status: 'cancelled' }
                }
            );

            return {
                success: true,
                message: `User ${username} has been unbanned from r/${subreddit}`,
                action: 'unban',
                target: username,
                reason: reason
            };
        } catch (error) {
            console.error('Unban command error:', error);
            throw new Error(`Failed to unban user: ${error.message}`);
        }
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }

    async getBannedUsers(subreddit) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            const bannedUsers = await sub.getBannedUsers({ limit: 100 });
            return bannedUsers.map(user => ({
                name: user.name,
                date: new Date(user.date * 1000),
                note: user.note,
                reason: user.reason
            }));
        } catch (error) {
            console.error('Get banned users error:', error);
            throw new Error(`Failed to get banned users: ${error.message}`);
        }
    }
}

module.exports = UnbanCommand;