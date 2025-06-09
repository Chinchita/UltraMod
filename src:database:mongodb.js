const { MongoClient } = require('mongodb');
require('dotenv').config();

class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(process.env.MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db('UltraModBot');
            console.log('Connected to MongoDB');
            
            // Create indexes for better performance
            await this.createIndexes();
        } catch (error) {
            console.error('MongoDB connection error:', error);
            process.exit(1);
        }
    }

    async createIndexes() {
        const collections = {
            subreddits: [
                { name: 1 },
                { moderators: 1 }
            ],
            users: [
                { username: 1 },
                { subreddit: 1 }
            ],
            modActions: [
                { subreddit: 1, timestamp: -1 },
                { moderator: 1, timestamp: -1 }
            ],
            settings: [
                { subreddit: 1 }
            ]
        };

        for (const [collectionName, indexes] of Object.entries(collections)) {
            const collection = this.db.collection(collectionName);
            for (const index of indexes) {
                await collection.createIndex(index);
            }
        }
    }

    getDb() {
        return this.db;
    }

    async close() {
        if (this.client) {
            await this.client.close();
        }
    }
}

module.exports = new Database();