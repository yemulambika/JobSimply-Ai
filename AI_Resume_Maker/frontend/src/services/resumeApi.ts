import api from './api';
import type { ResumeJSON, ResumeResponse, UploadResumeResponse, TailorResumeResponse } from '../types/resume';

// ============================================================
// RESUME API SERVICE V2
// All operations work with Resume JSON
// ============================================================

class ResumeApiService {
  /**
   * Upload a new resume file
   */
  async uploadResume(file: File, title?: string): Promise<UploadResumeResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const response = await api.post('/api/v2/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  }

  /**
   * Get all resumes for current user
   */
  async getResumes(): Promise<ResumeResponse[]> {
    const response = await api.get('/api/v2/resumes');
    return response.data.resumes;
  }

  /**
   * Get specific resume by ID
   */
  async getResume(id: number): Promise<ResumeResponse> {
    const response = await api.get(`/api/v2/resumes/${id}`);
    return response.data.resume;
  }

  /**
   * Update resume JSON
   */
  async updateResume(
    id: number, 
    resumeJSON: ResumeJSON, 
    template?: string
  ): Promise<ResumeResponse> {
    const response = await api.patch(`/api/v2/resumes/${id}`, { resumeJSON, template });
    return response.data;
  }

  /**
   * Tailor resume for job
   */
  async tailorResume(
    id: number,
    options: {
      jobId?: number;
      jobDescription?: string;
      selectedSections?: string[];
      selectedKeywords?: string[];
      tone?: 'professional' | 'concise' | 'detailed' | 'casual';
      optimizationLevel?: 'conservative' | 'balanced' | 'aggressive';
    }
  ): Promise<TailorResumeResponse> {
    const response = await api.post(`/api/v2/resumes/${id}/tailor`, options);
    return response.data;
  }

  /**
   * Get version history
   */
  async getVersionHistory(id: number) {
    const response = await api.get(`/api/v2/resumes/${id}/versions`);
    return response.data.versions;
  }

  /**
   * Restore to specific version
   */
  async restoreVersion(id: number, version: number): Promise<ResumeResponse> {
    const response = await api.post(`/api/v2/resumes/${id}/versions/${version}/restore`);
    return response.data;
  }

  /**
   * Download resume in specified format
   */
  async downloadResume(id: number, format: 'html' | 'markdown' | 'txt' | 'pdf', useTailored = false): Promise<Blob> {
    const response = await api.get(`/api/v2/resumes/${id}/download/${format}`, {
      params: { useTailored },
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Delete resume
   */
  async deleteResume(id: number): Promise<void> {
    await api.delete(`/api/v2/resumes/${id}`);
  }
}

export const resumeApi = new ResumeApiService();
export default ResumeApiService;