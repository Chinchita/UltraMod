const Database = require('../database/mongodb');
const RedditAuth = require('../auth/reddit_auth');

class Scheduler {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        // Check for scheduled actions every minute
        this.interval = setInterval(this.processScheduledActions.bind(this), 60000);
        console.log('Scheduler started');
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('Scheduler stopped');
    }

    async processScheduledActions() {
        try {
            const db = Database.getDb();
            const now = new Date();
            
            const pendingActions = await db.collection('scheduledActions')
                .find({
                    status: 'pending',
                    executeAt: { $lte: now }
                })
                .toArray();

            for (const action of pendingActions) {
                await this.executeScheduledAction(action);
            }
        } catch (error) {
            console.error('Scheduler error:', error);
        }
    }

    async executeScheduledAction(action) {
        const db = Database.getDb();
        
        try {
            const reddit = RedditAuth.getRedditInstance();
            const sub = await reddit.getSubreddit(action.subreddit);

            switch (action.type) {
                case 'unban':
                    await sub.unbanUser({ name: action.username });
                    await this.logAction({
                        type: 'scheduled_unban',
                        subreddit: action.subreddit,
                        username: action.username,
                        moderator: 'UltraModBot',
                        reason: 'Automatic unban',
                        timestamp: new Date()
                    });
                    break;

                case 'unmute':
                    await sub.unmuteUser({ name: action.username });
                    await this.logAction({
                        type: 'scheduled_unmute',
                        subreddit: action.subreddit,
                        username: action.username,
                        moderator: 'UltraModBot',
                        reason: 'Automatic unmute',
                        timestamp: new Date()
                    });
                    break;
            }

            // Mark action as completed
            await db.collection('scheduledActions').updateOne(
                { _id: action._id },
                { 
                    $set: { 
                        status: 'completed',
                        completedAt: new Date()
                    }
                }
            );

        } catch (error) {
            console.error(`Failed to execute scheduled action:`, error);
            
            // Mark action as failed
            await db.collection('scheduledActions').updateOne(
                { _id: action._id },
                { 
                    $set: { 
                        status: 'failed',
                        error: error.message,
                        failedAt: new Date()
                    }
                }
            );
        }
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }
}

module.exports = new Scheduler();