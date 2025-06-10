const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class MuteCommand {
    async execute({ subreddit, username, moderator, reason, duration = 3, note, type = 'comment' }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            // Reddit mute options
            const muteOptions = {
                name: username,
                duration: duration // days
            };

            // Different types of muting
            switch(type.toLowerCase()) {
                case 'comment':
                    await sub.muteUser(muteOptions);
                    break;
                case 'modmail':
                    await sub.muteUser({ ...muteOptions, type: 'modmail' });
                    break;
                case 'both':
                    await sub.muteUser(muteOptions);
                    await sub.muteUser({ ...muteOptions, type: 'modmail' });
                    break;
                default:
                    await sub.muteUser(muteOptions);
            }

            // Log the action
            await this.logAction({
                type: 'mute',
                muteType: type,
                subreddit,
                username,
                moderator,
                reason: reason || 'Muted by UltraModBot',
                duration,
                note,
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + (duration * 24 * 60 * 60 * 1000))
            });

            // Schedule unmute
            await this.scheduleUnmute(subreddit, username, duration);

            return {
                success: true,
                message: `User ${username} has been muted in r/${subreddit} for ${duration} days`,
                action: 'mute',
                target: username,
                duration: `${duration} days`,
                type: type,
                expiresAt: new Date(Date.now() + (duration * 24 * 60 * 60 * 1000))
            };
        } catch (error) {
            console.error('Mute command error:', error);
            throw new Error(`Failed to mute user: ${error.message}`);
        }
    }

    async unmute({ subreddit, username, moderator, reason }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(subreddit);
            
            await sub.unmuteUser({ name: username });

            await this.logAction({
                type: 'unmute',
                subreddit,
                username,
                moderator,
                reason: reason || 'Unmuted by UltraModBot',
                timestamp: new Date()
            });

            return {
                success: true,
                message: `User ${username} has been unmuted in r/${subreddit}`,
                action: 'unmute',
                target: username
            };
        } catch (error) {
            console.error('Unmute command error:', error);
            throw new Error(`Failed to unmute user: ${error.message}`);
        }
    }

    async scheduleUnmute(subreddit, username, duration) {
        const db = Database.getDb();
        const executeAt = new Date(Date.now() + (duration * 24 * 60 * 60 * 1000));
        
        await db.collection('scheduledActions').insertOne({
            type: 'unmute',
            subreddit,
            username,
            executeAt,
            status: 'pending',
            createdAt: new Date()
        });
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }

    async getMutedUsers(subreddit) {
        const db = Database.getDb();
        return await db.collection('modActions')
            .find({
                subreddit,
                type: 'mute',
                expiresAt: { $gt: new Date() }
            })
            .sort({ timestamp: -1 })
            .toArray();
    }
}

module.exports = MuteCommand;