const connectToMongoDB = require('../database');
const { ObjectId } = require('mongodb');

const removeUserService = async (req, res) => {
  const { userId } = req.params;

  try {
    const db = await connectToMongoDB();

    // Remove user by ID
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ message: 'Database error' });
  }
};

module.exports = removeUserService;
