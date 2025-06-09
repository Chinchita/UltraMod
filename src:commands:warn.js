const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class WarnCommand {
    async execute({ subreddit, username, moderator, reason, level = 1, note, sendMessage = true }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            
            // Get user's warning history
            const warningHistory = await this.getWarningHistory(username, subreddit);
            const newWarningCount = warningHistory.length + 1;

            // Log the warning
            await this.logAction({
                type: 'warning',
                subreddit,
                username,
                moderator,
                reason: reason || 'Warning issued by UltraModBot',
                level,
                note,
                warningNumber: newWarningCount,
                timestamp: new Date()
            });

            // Send warning message to user
            if (sendMessage) {
                await this.sendWarningMessage(username, subreddit, reason, newWarningCount, level);
            }

            // Check if automatic action should be taken
            const autoAction = await this.checkAutoAction(username, subreddit, newWarningCount);

            return {
                success: true,
                message: `Warning issued to ${username} in r/${subreddit}`,
                action: 'warning',
                target: username,
                warningNumber: newWarningCount,
                level: level,
                reason: reason,
                autoAction: autoAction
            };
        } catch (error) {
            console.error('Warning command error:', error);
            throw new Error(`Failed to issue warning: ${error.message}`);
        }
    }

    async getWarningHistory(username, subreddit) {
        const db = Database.getDb();
        return await db.collection('modActions')
            .find({
                type: 'warning',
                username,
                subreddit,
                timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            })
            .sort({ timestamp: -1 })
            .toArray();
    }

    async sendWarningMessage(username, subreddit, reason, warningCount, level) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            
            const severityText = {
                1: 'Minor',
                2: 'Moderate', 
                3: 'Serious',
                4: 'Severe',
                5: 'Final'
            };

            const subject = `Official Warning from r/${subreddit}`;
            const message = `
Hello u/${username},

You have received a **${severityText[level] || 'Official'}** warning from the moderation team of r/${subreddit}.

**Warning #${warningCount}**
**Reason:** ${reason}

This is warning number ${warningCount} on your account for this subreddit in the past 30 days.

${warningCount >= 3 ? 
    '⚠️ **IMPORTANT:** You have received multiple warnings. Further violations may result in a temporary or permanent ban from the subreddit.' : 
    'Please review our subreddit rules to avoid future violations.'
}

If you believe this warning was issued in error, please reply to this message to contact the moderation team.

---
*This message was sent automatically by UltraModBot*
            `;

            await reddit.composeMessage({
                to: username,
                subject: subject,
                text: message
            });
        } catch (error) {
            console.error('Failed to send warning message:', error);
        }
    }

    async checkAutoAction(username, subreddit, warningCount) {
        const db = Database.getDb();
        const settings = await db.collection('settings').findOne({ subreddit }) || {};
        const autoMod = settings.autoModeration || {};

        if (!autoMod.enabled) {
            return null;
        }

        let action = null;

        // Default auto-moderation rules
        if (warningCount >= (autoMod.banThreshold || 5)) {
            action = await this.executeBan(username, subreddit, 'Automatic ban: Too many warnings');
        } else if (warningCount >= (autoMod.muteThreshold || 3)) {
            action = await this.executeMute(username, subreddit, 'Automatic mute: Multiple warnings');
        }

        return action;
    }

    async executeBan(username, subreddit, reason) {
        try {
            const BanCommand = require('./ban');
            const banCommand = new BanCommand();
            
            await banCommand.execute({
                subreddit,
                username,
                moderator: 'UltraModBot',
                reason,
                duration: 7 // 7 day temp ban
            });

            return { type: 'ban', duration: 7, reason };
        } catch (error) {
            console.error('Auto-ban failed:', error);
            return null;
        }
    }

    async executeMute(username, subreddit, reason) {
        try {
            const MuteCommand = require('./mute');
            const muteCommand = new MuteCommand();
            
            await muteCommand.execute({
                subreddit,
                username,
                moderator: 'UltraModBot',
                reason,
                duration: 3 // 3 day mute
            });

            return { type: 'mute', duration: 3, reason };
        } catch (error) {
            console.error('Auto-mute failed:', error);
            return null;
        }
    }

    async removeWarning({ subreddit, username, moderator, warningId, reason }) {
        try {
            const db = Database.getDb();
            
            // Mark warning as removed
            await db.collection('modActions').updateOne(
                { _id: warningId, type: 'warning' },
                {
                    $set: {
                        removed: true,
                        removedBy: moderator,
                        removeReason: reason,
                        removedAt: new Date()
                    }
                }
            );

            // Log the removal
            await this.logAction({
                type: 'warning_removed',
                subreddit,
                username,
                moderator,
                originalWarningId: warningId,
                reason: reason || 'Warning removed',
                timestamp: new Date()
            });

            return {
                success: true,
                message: `Warning removed for ${username} in r/${subreddit}`,
                action: 'warning_removed',
                target: username
            };
        } catch (error) {
            console.error('Remove warning error:', error);
            throw new Error(`Failed to remove warning: ${error.message}`);
        }
    }

    async logAction(actionData) {
        const db = Database.getDb();
        await db.collection('modActions').insertOne(actionData);
    }

    async getUserWarnings(username, subreddit) {
        const db = Database.getDb();
        return await db.collection('modActions')
            .find({
                type: 'warning',
                username,
                subreddit,
                removed: { $ne: true }
            })
            .sort({ timestamp: -1 })
            .toArray();
    }
}

module.exports = WarnCommand;