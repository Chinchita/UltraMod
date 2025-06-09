const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('./database/mongodb');
const RedditAuth = require('./auth/reddit_auth');
const Scheduler = require('./utils/scheduler');
const PermissionMiddleware = require('./middleware/permissions');

// Import all commands
const BanCommand = require('./commands/ban');
const UnbanCommand = require('./commands/unban');
const MuteCommand = require('./commands/mute');
const TimeoutCommand = require('./commands/timeout');
const KickCommand = require('./commands/kick');
const WarnCommand = require('./commands/warn');
const UserHistoryCommand = require('./commands/user_history');

class UltraModBot {
    constructor() {
        this.app = express();
        this.reddit = RedditAuth.getRedditInstance();
        this.setupMiddleware();
        this.setupRoutes();
        
        // Initialize command handlers
        this.commands = {
            ban: new BanCommand(),
            unban: new UnbanCommand(),
            mute: new MuteCommand(),
            timeout: new TimeoutCommand(),
            kick: new KickCommand(),
            warn: new WarnCommand(),
            userHistory: new UserHistoryCommand()
        };
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    setupRoutes() {
        // Installation and setup
        this.app.post('/install', this.handleInstallation.bind(this));
        this.app.post('/uninstall', this.handleUninstallation.bind(this));
        
        // Command execution endpoints
        this.app.post('/command/ban', PermissionMiddleware.checkPermissions(['posts']), this.handleBan.bind(this));
        this.app.post('/command/unban', PermissionMiddleware.checkPermissions(['posts']), this.handleUnban.bind(this));
        this.app.post('/command/mute', PermissionMiddleware.checkPermissions(['posts']), this.handleMute.bind(this));
        this.app.post('/command/unmute', PermissionMiddleware.checkPermissions(['posts']), this.handleUnmute.bind(this));
        this.app.post('/command/timeout', PermissionMiddleware.checkPermissions(['posts']), this.handleTimeout.bind(this));
        this.app.post('/command/kick', PermissionMiddleware.checkPermissions(['posts']), this.handleKick.bind(this));
        this.app.post('/command/warn', PermissionMiddleware.checkPermissions(['access']), this.handleWarn.bind(this));
        this.app.post('/command/user-history', PermissionMiddleware.checkPermissions(['access']), this.handleUserHistory.bind(this));
        
        // Management endpoints
        this.app.get('/dashboard/:subreddit', this.getDashboard.bind(this));
        this.app.post('/dashboard/:subreddit/settings', this.updateSettings.bind(this));
        this.app.get('/user/:username/:subreddit', this.getUserProfile.bind(this));
        this.app.get('/modlog/:subreddit', this.getModLog.bind(this));
        
        // Statistics endpoints
        this.app.get('/stats/:subreddit', this.getStatistics.bind(this));
        this.app.get('/banned/:subreddit', this.getBannedUsers.bind(this));
        this.app.get('/warnings/:subreddit/:username?', this.getWarnings.bind(this));
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date() });
        });
    }

    // Command handlers
    async handleBan(req, res) {
        try {
            const result = await this.commands.ban.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleUnban(req, res) {
        try {
            const result = await this.commands.unban.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleMute(req, res) {
        try {
            const result = await this.commands.mute.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleUnmute(req, res) {
        try {
            const result = await this.commands.mute.unmute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleTimeout(req, res) {
        try {
            const result = await this.commands.timeout.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleKick(req, res) {
        try {
            const result = await this.commands.kick.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleWarn(req, res) {
        try {
            const result = await this.commands.warn.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async handleUserHistory(req, res) {
        try {
            const result = await this.commands.userHistory.execute(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Installation handlers
    async handleInstallation(req, res) {
        try {
            const { subreddit, moderator } = req.body;
            
            const isValid = await RedditAuth.validateModerator(moderator, subreddit);
            if (!isValid) {
                return res.status(403).json({ error: 'Insufficient permissions to install bot' });
            }

            const db = Database.getDb();
            await db.collection('subreddits').updateOne(
                { name: subreddit },
                {
                    $set: {
                        name: subreddit,
                        installedBy: moderator,
                        installedAt: new Date(),
                        active: true,
                        version: '1.0.0'
                    },
                    $addToSet: { moderators: moderator }
                },
                { upsert: true }
            );

            res.json({ 
                success: true, 
                message: 'UltraModBot installed successfully',
                subreddit,
                installedBy: moderator
            });
        } catch (error) {
            console.error('Installation error:', error);
            res.status(500).json({ error: 'Installation failed' });
        }
    }

    async handleUninstallation(req, res) {
        try {
            const { subreddit, moderator } = req.body;
            
            const isValid = await RedditAuth.validateModerator(moderator, subreddit);
            if (!isValid) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            const db = Database.getDb();
            await db.collection('subreddits').updateOne(
                { name: subreddit },
                {
                    $set: {
                        active: false,
                        uninstalledBy: moderator,
                        uninstalledAt: new Date()
                    }
                }
            );

            res.json({ success: true, message: 'UltraModBot uninstalled successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Uninstallation failed' });
        }
    }

    // Dashboard and management
    async getDashboard(req, res) {
        try {
            const { subreddit } = req.params;
            const db = Database.getDb();
            
            const [subredditData, recentActions, settings, stats] = await Promise.all([
                db.collection('subreddits').findOne({ name: subreddit }),
                db.collection('modActions').find({ subreddit }).sort({ timestamp: -1 }).limit(50).toArray(),
                db.collection('settings').findOne({ subreddit }) || {},
                this.getSubredditStats(subreddit)
            ]);

            res.json({
                subreddit: subredditData,
                recentActions,
                settings,
                statistics: stats
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getSubredditStats(subreddit) {
        const db = Database.getDb();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const stats = await db.collection('modActions').aggregate([
            { 
                $match: { 
                    subreddit: subreddit,
                    timestamp: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        return stats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {});
    }

    async start() {
        try {
            await Database.connect();
            Scheduler.start();
            
            const port = process.env.PORT || 3000;
            this.app.listen(port, () => {
                console.log(`🚀 UltraModBot is running on port ${port}`);
                console.log(`📊 Dashboard: http://localhost:${port}/dashboard/[subreddit]`);
                console.log(`❤️  Health Check: http://localhost:${port}/health`);
            });

            // Graceful shutdown
            process.on('SIGTERM', this.shutdown.bind(this));
            process.on('SIGINT', this.shutdown.bind(this));
            
        } catch (error) {
            console.error('Failed to start bot:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('Shutting down UltraModBot...');
        Scheduler.stop();
        await Database.close();
        process.exit(0);
    }
}

// Start the bot if this file is run directly
if (require.main === module) {
    const bot = new UltraModBot();
    bot.start();
}

module.exports = UltraModBot;