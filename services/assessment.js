const User = require('../models/User');

const saveAssessment = async (req, res) => {
  const { userId, answers } = req.body;

  if (!userId) {
    return res.status(400).json({
      message: 'User ID is required',
      error_code: 'missing_user_id',
    });
  }

  if (!Array.isArray(answers) || answers.length !== 12) {
    return res.status(400).json({
      message: 'Answers must be an array of exactly 12 items (one for each question).',
      error_code: 'invalid_answers_length',
    });
  }

  for (let i = 0; i < answers.length; i++) {
    const questionAnswers = answers[i];
    if (!Array.isArray(questionAnswers) || questionAnswers.length < 1 || questionAnswers.length > 10) {
      return res.status(400).json({
        message: `Question ${i + 1} must have at least 1 answer and no more than 10 answers.`,
        error_code: 'invalid_question_answers',
      });
    }
    if (questionAnswers.some(answer => typeof answer !== 'string')) {
      return res.status(400).json({
        message: `Question ${i + 1} contains invalid answers. All answers must be strings.`,
        error_code: 'invalid_answer_type',
      });
    }
  }

  try {
    const flattenedAnswers = answers.map(qAnswers => qAnswers.join(','));
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.assessmentAnswers = flattenedAnswers;
    user.assessment_aspect_completed = user.selectedAspects.length === 6;
    await user.save();

    return res.status(200).json({
      message: 'Assessment answers saved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error saving assessment:', error.message);
    return res.status(500).json({
      message: 'Internal server error',
      error_code: error.code || 'internal_error',
    });
  }
};

module.exports = saveAssessment;