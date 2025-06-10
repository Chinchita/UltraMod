const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class TimeoutCommand {
    async execute({ subreddit, username, moderator, reason, duration = 60, note }) {
        try {
            // Reddit doesn't have native timeout, so we implement it with temp ban + auto unban
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            // Convert minutes to days for Reddit API (minimum 1 day)
            const banDurationDays = Math.max(1, Math.ceil(duration / (24 * 60)));
            
            const banOptions = {
                name: username,
                banReason: reason || `Timeout: ${duration} minutes`,
                banNote: note || `Automated timeout - will be unbanned automatically`,
                duration: banDurationDays
            };

            await sub.banUser(banOptions);

            // Schedule automatic unban
            await this.scheduleUnban(subreddit, username, duration);

            // Log the action
            await this.logAction({
                type: 'timeout',
                subreddit,
                username,
                moderator,
                reason: reason || 'Timed out by UltraModBot',
                duration,
                note,
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + (duration * 60 * 1000))
            });

            return {
                success: true,
                message: `User ${username} has been timed out in r/${subreddit} for ${duration} minutes`,
                action: 'timeout',
                target: username,
                duration: `${duration} minutes`,
                expiresAt: new Date(Date.now() + (duration * 60 * 1000))
            };
        } catch (error) {
            console.error('Timeout command error:', error);
            throw new Error(`Failed to timeout user: ${error.message}`);
        }
    }

    async removeTimeout({ subreddit, username, moderator, reason }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            await sub.unbanUser({ name: username });

            await this.logAction({
                type: 'timeout_removed',
                subreddit,
                username,
                moderator,
                reason: reason || 'Timeout removed by UltraModBot',
                timestamp: new Date()
            });

            // Remove scheduled unban
            const db = Database.getDb();
            await db.collection('scheduledActions').updateOne(
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
                message: `Timeout removed for ${username} in r/${subreddit}`,
                action: 'timeout_removed',
                target: username
            };
        } catch (error) {
            console.error('Remove timeout error:', error);
            throw new Error(`Failed to remove timeout: ${error.message}`);
        }
    }

    async scheduleUnban(subreddit, username, durationMinutes) {
        const db = Database.getDb();
        const executeAt = new Date(Date.now() + (durationMinutes * 60 * 1000));
        
        await db.collection('scheduledActions').insertOne({
            type: 'unban',
            subreddit,
            username,
            executeAt,
            status: 'pending',
            createdAt: new Date(),
            isTimeout: true
        });
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }

    async getActiveTimeouts(subreddit) {
        const db = Database.getDb();
        return await db.collection('modActions')
            .find({
                subreddit,
                type: 'timeout',
                expiresAt: { $gt: new Date() }
            })
            .sort({ timestamp: -1 })
            .toArray();
    }
}

module.exports = TimeoutCommand;