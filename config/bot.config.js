module.exports = {
    commands: {
        ban: {
            enabled: true,
            requiredPermissions: ['posts'],
            maxDuration: 365,
            requireReason: true
        },
        mute: {
            enabled: true,
            requiredPermissions: ['posts'],
            maxDuration: 30,
            requireReason: false
        },
        timeout: {
            enabled: true,
            requiredPermissions: ['posts'],
            maxDuration: 7,
            requireReason: false
        },
        kick: {
            enabled: true,
            requiredPermissions: ['posts'],
            requireReason: false
        },
        warn: {
            enabled: true,
            requiredPermissions: ['access'],
            maxWarnings: 3
        },
        userHistory: {
            enabled: true,
            requiredPermissions: ['access'],
            maxResults: 100
        }
    },
    moderation: {
        autoMod: {
            enabled: true,
            spamDetection: true,
            toxicityThreshold: 0.7,
            minimumAccountAge: 1, // days
            minimumKarma: -10
        },
        logging: {
            logAllActions: true,
            logUserActivity: true,
            retentionDays: 90
        }
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    }
};
