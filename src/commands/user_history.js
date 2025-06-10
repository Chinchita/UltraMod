const RedditAuth = require('../auth/reddit_auth');
const Database = require('../database/mongodb');

class UserHistoryCommand {
    async execute({ username, subreddit, limit = 25 }) {
        try {
            const reddit = RedditAuth.getRedditInstance();
            const user = await reddit.getUser(username);
            
            // Get user's submissions and comments in the subreddit
            const submissions = await user.getSubmissions({ 
                subreddit: subreddit,
                limit: limit 
            });
            
            const comments = await user.getComments({ 
                subreddit: subreddit,
                limit: limit 
            });

            // Get moderation history from database
            const db = Database.getDb();
            const modHistory = await db.collection('modActions')
                .find({ username, subreddit })
                .sort({ timestamp: -1 })
                .toArray();

            const profile = {
                username,
                subreddit,
                accountCreated: new Date(user.created_utc * 1000),
                totalKarma: user.total_karma,
                linkKarma: user.link_karma,
                commentKarma: user.comment_karma,
                submissions: submissions.map(this.formatSubmission),
                comments: comments.map(this.formatComment),
                moderationHistory: modHistory,
                summary: this.generateSummary(submissions, comments, modHistory)
            };

            return profile;
        } catch (error) {
            console.error('User history error:', error);
            throw new Error(`Failed to get user history: ${error.message}`);
        }
    }

    async getUserProfile(username, subreddit) {
        return this.execute({ username, subreddit, limit: 50 });
    }

    formatSubmission(submission) {
        return {
            id: submission.id,
            title: submission.title,
            score: submission.score,
            created: new Date(submission.created_utc * 1000),
            numComments: submission.num_comments,
            url: `https://reddit.com${submission.permalink}`
        };
    }

    formatComment(comment) {
        return {
            id: comment.id,
            body: comment.body.substring(0, 200) + (comment.body.length > 200 ? '...' : ''),
            score: comment.score,
            created: new Date(comment.created_utc * 1000),
            url: `https://reddit.com${comment.permalink}`
        };
    }

    generateSummary(submissions, comments, modHistory) {
        const totalPosts = submissions.length;
        const totalComments = comments.length;
        const avgPostScore = submissions.reduce((sum, s) => sum + s.score, 0) / totalPosts || 0;
        const avgCommentScore = comments.reduce((sum, c) => sum + c.score, 0) / totalComments || 0;
        const moderationActions = modHistory.length;

        return {
            totalPosts,
            totalComments,
            avgPostScore: Math.round(avgPostScore * 100) / 100,
            avgCommentScore: Math.round(avgCommentScore * 100) / 100,
            moderationActions,
            riskLevel: this.calculateRiskLevel(avgPostScore, avgCommentScore, moderationActions)
        };
    }

    calculateRiskLevel(avgPostScore, avgCommentScore, modActions) {
        let risk = 0;
        
        if (avgPostScore < -1) risk += 2;
        if (avgCommentScore < -1) risk += 2;
        if (modActions > 3) risk += 3;
        if (modActions > 0) risk += 1;

        if (risk >= 5) return 'HIGH';
        if (risk >= 3) return 'MEDIUM';
        if (risk >= 1) return 'LOW';
        return 'NONE';
    }
}

module.exports = UserHistoryCommand;