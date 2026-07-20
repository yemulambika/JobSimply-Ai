import { getPool } from '../services/postgres.js';
import { getLatestResume, saveTailoredResume } from '../services/postgres.js';
import { buildTailoredResume, calculateAtsScore } from '../services/tailorResumeService.js';

export const tailorCustomResume = async (req, res, next) => {
  try {
    const validated = req.validated || {};
    const { resumeId, jobId, selectedSections, selectedKeywords = [], tone, length, optimizationLevel } = validated;
    const userId = req.user.id;

    let resume;
    try {
      resume = await getLatestResume(userId);
    } catch (error) {
      console.error('[BACKEND] tailorCustomResume - getLatestResume error:', error.message);
      return res.status(500).json({ success: false, message: 'Resume service unavailable. Please try again later.' });
    }

    if (!resume) {
      return res.status(404).json({ success: false, message: 'No resume found. Please upload a resume first.' });
    }

    let job = null;
    if (jobId) {
      const client = await getPool().connect();
      try {
        const jobResult = await client.query('SELECT * FROM "Job" WHERE id = $1 AND "userId" = $2', [jobId, userId]);
        job = jobResult.rows[0] || null;
      } catch (error) {
        console.error('[BACKEND] tailorCustomResume - job fetch error:', error.message);
      } finally {
        client.release();
      }
    }

    const result = await buildTailoredResume({
      resume,
      job,
      selectedSections,
      selectedKeywords,
      tone,
      length,
      optimizationLevel,
    });

    let saved;
    try {
      saved = await saveTailoredResume({
        userId,
        resumeId: resume.id,
        jobId: jobId || resume.jobId || null,
        title: `Tailored for ${job?.company || 'position'}`,
        content: result.tailoredContent,
        jobDescription: job?.description || '',
        tone: tone || 'professional',
        matchScore: result.matchScore,
        atsScore: result.atsScore,
      });
    } catch (error) {
      console.error('[BACKEND] tailorCustomResume - save error:', error.message);
      return res.status(500).json({ success: false, message: 'Tailored resume save failed. Please retry.' });
    }

    res.status(200).json({
      success: true,
      tailoredResume: {
        ...saved,
        atsScore: result.atsScore,
        matchScore: result.matchScore,
        aiChanges: result.aiChanges,
        previousAts: calculateAtsScore(resume.parsedData || {}),
      },
    });
  } catch (error) {
    console.error('[BACKEND] tailorCustomResume - Error:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};