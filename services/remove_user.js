const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb'); // Correct import

const removeUserService = async (req, res) => {
    const { userId } = req.params;

    try {
        const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        const db = client.db(process.env.DB_NAME);

        // Remove user by ID
        const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
        client.close();

        if (result.deletedCount === 0) {
            return res.status(404).send('User not found');
        }

        return res.status(200).send('User removed successfully');
    } catch (err) {
        console.log('Database error:', err);
        return res.status(500).send('Database error');
    }
}

module.exports = removeUserService;