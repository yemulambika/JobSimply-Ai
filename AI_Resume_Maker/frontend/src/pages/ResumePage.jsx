import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function ResumePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState(null);

  // Dialogs
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const fileInputRef = useRef(null);
  const replaceInputRef = useRef(null);

  // Fetch resumes
  const fetchResumes = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await api.get('/resumes');
      setResumes(response.data.resumes);
    } catch (err) {
      console.error('Failed to fetch resumes:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // ---- Upload ----
  const handleFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Please select a PDF file first'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.pdf$/i, ''));

    setUploading(true);
    setError(null);
    try {
      const response = await api.post('/resumes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;
      setPreviewData(result.parsedData);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Resume uploaded and parsed successfully!');
      fetchResumes();
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to upload resume';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return; }
      setFile(droppedFile);
      setError(null);
    }
  };

  // ---- View / Preview ----
  const handleView = async (resume) => {
    try {
      const response = await api.get(`/resumes/${resume.id}`);
      setPreviewData(response.data.resume.parsedData);
      setSelectedResume(resume);
    } catch (err) {
      toast.error('Failed to load resume details');
    }
  };

  const handleClosePreview = () => {
    setPreviewData(null);
    setSelectedResume(null);
  };

  // ---- Download ----
  const handleDownload = (resume) => {
    if (resume.fileUrl) {
      window.open(resume.fileUrl, '_blank');
    } else {
      toast.error('No file URL available');
    }
  };

  // ---- Rename ----
  const openRenameDialog = (resume) => {
    setRenameTarget(resume);
    setRenameTitle(resume.title);
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!renameTitle.trim()) { toast.error('Title is required'); return; }
    try {
      await api.patch(`/resumes/${renameTarget.id}/rename`, { title: renameTitle.trim() });
      toast.success('Resume renamed');
      setRenameDialogOpen(false);
      fetchResumes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename');
    }
  };

  // ---- Delete ----
  const openDeleteDialog = (resume) => {
    setDeleteTarget(resume);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/resumes/${deleteTarget.id}`);
      toast.success('Resume deleted');
      setDeleteDialogOpen(false);
      if (selectedResume?.id === deleteTarget.id) {
        setSelectedResume(null);
        setPreviewData(null);
      }
      fetchResumes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---- Mark Active ----
  const handleActivate = async (resume) => {
    try {
      await api.patch(`/resumes/${resume.id}/activate`);
      toast.success('Resume set as active');
      fetchResumes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate');
    }
  };

  // ---- Replace ----
  const openReplaceDialog = (resume) => {
    setReplaceTarget(resume);
    setReplaceFile(null);
    setReplaceDialogOpen(true);
  };

  const handleReplaceFileSelect = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') { toast.error('Only PDF files are allowed'); return; }
      if (selectedFile.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10MB'); return; }
      setReplaceFile(selectedFile);
    }
  };

  const handleReplace = async () => {
    if (!replaceFile) { toast.error('Please select a PDF file'); return; }
    setReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', replaceFile);
      const response = await api.post(`/resumes/${replaceTarget.id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = response.data;
      setPreviewData(result.parsedData);
      setSelectedResume(result.resume);
      setReplaceDialogOpen(false);
      toast.success('Resume replaced and re-parsed');
      fetchResumes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to replace');
    } finally {
      setReplacing(false);
    }
  };

  // ---- Format date ----
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  // ---- ParsedData view ----
  const renderParsedData = (data) => {
    if (!data) return null;
    
    // Helper to render personal info
    const renderPersonalInfo = () => {
      const personal = data.personalInfo || data;
      return (
        <>
          {(personal.name || data.name) && (
            <Typography variant="h5" fontWeight={700} gutterBottom>{personal.name || data.name}</Typography>
          )}
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            {(personal.email || data.email) && <Chip label={personal.email || data.email} variant="outlined" />}
            {(personal.phone || data.phone) && <Chip label={personal.phone || data.phone} variant="outlined" />}
            {(personal.location || data.location) && <Chip label={personal.location || data.location} variant="outlined" />}
            {(personal.city || data.city) && <Chip label={personal.city || data.city} variant="outlined" />}
            {(personal.country || data.country) && <Chip label={personal.country || data.country} variant="outlined" />}
          </Stack>
        </>
      );
    };

    // Helper to render links
    const renderLinks = () => {
      const links = data.links || {};
      const linkFields = [
        { key: 'linkedin', label: 'LinkedIn' },
        { key: 'github', label: 'GitHub' },
        { key: 'portfolio', label: 'Portfolio' },
        { key: 'website', label: 'Website' },
        { key: 'gfg', label: 'GeeksforGeeks' },
        { key: 'scaler', label: 'Scaler' },
        { key: 'medium', label: 'Medium' },
        { key: 'hashnode', label: 'Hashnode' },
        { key: 'devto', label: 'Dev.to' },
        { key: 'kaggle', label: 'Kaggle' },
        { key: 'stackoverflow', label: 'Stack Overflow' },
        { key: 'leetcode', label: 'LeetCode' },
        { key: 'codeforces', label: 'Codeforces' },
        { key: 'codechef', label: 'CodeChef' },
        { key: 'behance', label: 'Behance' },
        { key: 'dribbble', label: 'Dribbble' },
        { key: 'gitlab', label: 'GitLab' },
        { key: 'bitbucket', label: 'Bitbucket' },
        { key: 'twitter', label: 'Twitter' },
      ];
      
      const hasLinks = linkFields.some(f => links[f.key]) || (links.other && links.other.length > 0);
      if (!hasLinks) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Links</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {linkFields.filter(f => links[f.key]).map(f => (
              <Chip key={f.key} label={f.label} component="a" href={links[f.key]} clickable variant="outlined" size="small" />
            ))}
            {links.other && links.other.map((url, i) => (
              <Chip key={`other-${i}`} label={url} component="a" href={url} clickable variant="outlined" size="small" />
            ))}
          </Stack>
        </Box>
      );
    };

    // Helper to render skills (categorized or flat)
    const renderSkills = () => {
      const skills = data.skills;
      if (!skills) return null;
      
      // If skills is an object with categories
      if (typeof skills === 'object' && !Array.isArray(skills)) {
        const categories = Object.entries(skills).filter(([_, arr]) => Array.isArray(arr) && arr.length > 0);
        if (categories.length === 0) return null;
        
        return (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Skills</Typography>
            {categories.map(([category, skillList]) => (
              <Box key={category} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{category}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {skillList.map((s, i) => <Chip key={i} label={typeof s === 'string' ? s : s.name || s} size="small" variant="outlined" />)}
                </Stack>
              </Box>
            ))}
          </Box>
        );
      }
      
      // If skills is a flat array
      if (Array.isArray(skills) && skills.length > 0) {
        return (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Skills</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {skills.map((s, i) => <Chip key={i} label={typeof s === 'string' ? s : s.name || s} size="small" color="primary" variant="outlined" />)}
            </Stack>
          </Box>
        );
      }
      
      return null;
    };

    // Helper to render experience
    const renderExperience = () => {
      const experience = data.experience;
      if (!experience || !Array.isArray(experience) || experience.length === 0) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Experience</Typography>
          {experience.map((exp, i) => (
            <Card key={i} variant="outlined" sx={{ p: 2, mb: 1 }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={600}>{exp.designation || exp.title || exp.role} @ {exp.company}</Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {exp.location && `${exp.location} | `}{exp.duration || `${exp.startDate} - ${exp.endDate || 'Present'}`}
              </Typography>
              {exp.employmentType && (
                <Typography variant="caption" color="text.secondary" display="block">{exp.employmentType}</Typography>
              )}
              {exp.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{exp.description}</Typography>
              )}
              {exp.bullets && exp.bullets.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  {exp.bullets.map((bullet, j) => (
                    <Typography key={j} variant="body2" color="text.secondary" sx={{ pl: 2 }}>• {bullet}</Typography>
                  ))}
                </Box>
              )}
              {exp.technologies && exp.technologies.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {exp.technologies.map((t, j) => <Chip key={j} label={t} size="small" variant="outlined" />)}
                </Stack>
              )}
            </Card>
          ))}
        </Box>
      );
    };

    // Helper to render education
    const renderEducation = () => {
      const education = data.education;
      if (!education || !Array.isArray(education) || education.length === 0) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Education</Typography>
          {education.map((edu, i) => (
            <Card key={i} variant="outlined" sx={{ p: 2, mb: 1 }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={600}>{edu.degree}</Typography>
              {edu.specialization && (
                <Typography variant="body2" color="text.secondary">{edu.specialization}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {edu.college || edu.university || edu.institution}{edu.location && ` | ${edu.location}`}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {edu.startYear && edu.endYear ? `${edu.startYear} - ${edu.endYear}` : (edu.year || '')}
                {edu.current && ' (Current)'}
              </Typography>
              {(edu.cgpa || edu.percentage) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {edu.cgpa && `CGPA: ${edu.cgpa}`}{edu.cgpa && edu.percentage && ' | '}{edu.percentage && `Percentage: ${edu.percentage}`}
                </Typography>
              )}
              {edu.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{edu.description}</Typography>
              )}
            </Card>
          ))}
        </Box>
      );
    };

    // Helper to render projects
    const renderProjects = () => {
      const projects = data.projects;
      if (!projects || !Array.isArray(projects) || projects.length === 0) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Projects</Typography>
          {projects.map((proj, i) => (
            <Card key={i} variant="outlined" sx={{ p: 2, mb: 1 }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={600}>{proj.title}</Typography>
              {proj.description && (
                <Typography variant="body2" color="text.secondary">{proj.description}</Typography>
              )}
              {proj.technologies && proj.technologies.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {proj.technologies.map((t, j) => <Chip key={j} label={t} size="small" variant="outlined" />)}
                </Stack>
              )}
              {(proj.github || proj.deployment || proj.demo) && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                  {proj.github && <Chip label="GitHub" component="a" href={proj.github} clickable size="small" variant="outlined" />}
                  {proj.deployment && <Chip label="Live" component="a" href={proj.deployment} clickable size="small" variant="outlined" />}
                  {proj.demo && <Chip label="Demo" component="a" href={proj.demo} clickable size="small" variant="outlined" />}
                </Stack>
              )}
              {proj.responsibilities && proj.responsibilities.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  {proj.responsibilities.map((resp, j) => (
                    <Typography key={j} variant="body2" color="text.secondary" sx={{ pl: 2 }}>• {resp}</Typography>
                  ))}
                </Box>
              )}
              {proj.features && proj.features.length > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  {proj.features.map((feat, j) => (
                    <Typography key={j} variant="body2" color="text.secondary" sx={{ pl: 2 }}>• {feat}</Typography>
                  ))}
                </Box>
              )}
            </Card>
          ))}
        </Box>
      );
    };

    // Helper to render certifications
    const renderCertifications = () => {
      const certifications = data.certifications;
      if (!certifications || !Array.isArray(certifications) || certifications.length === 0) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>Certifications</Typography>
          {certifications.map((cert, i) => (
            <Card key={i} variant="outlined" sx={{ p: 2, mb: 1 }} elevation={0}>
              <Typography variant="subtitle2" fontWeight={600}>{typeof cert === 'string' ? cert : cert.name}</Typography>
              {typeof cert === 'object' && (
                <>
                  {cert.provider && (
                    <Typography variant="body2" color="text.secondary">{cert.provider}</Typography>
                  )}
                  {(cert.issueDate || cert.expiry) && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {cert.issueDate && `Issued: ${cert.issueDate}`}{cert.issueDate && cert.expiry && ' | '}{cert.expiry && `Expires: ${cert.expiry}`}
                    </Typography>
                  )}
                  {cert.credentialUrl && (
                    <Chip label="View Credential" component="a" href={cert.credentialUrl} clickable size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  )}
                </>
              )}
            </Card>
          ))}
        </Box>
      );
    };

    // Helper to render custom sections
    const renderCustomSections = () => {
      const customSections = data.customSections;
      if (!customSections || !Array.isArray(customSections) || customSections.length === 0) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          {customSections.map((section, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>{section.title}</Typography>
              <Typography variant="body2" color="text.secondary">{section.content}</Typography>
            </Box>
          ))}
        </Box>
      );
    };

    // Helper to render array sections
    const renderArraySection = (key, label) => {
      const items = data[key];
      if (!items || !Array.isArray(items) || items.length === 0) return null;
      
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>{label}</Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {items.map((item, i) => (
              <Chip key={i} label={typeof item === 'string' ? item : item.title || item.name || item} size="small" variant="outlined" />
            ))}
          </Stack>
        </Box>
      );
    };

    return (
      <Box>
        {renderPersonalInfo()}
        {renderLinks()}
        {data.summary && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Summary</Typography>
            <Typography variant="body2" color="text.secondary">{data.summary}</Typography>
          </Box>
        )}
        {data.objective && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Objective</Typography>
            <Typography variant="body2" color="text.secondary">{data.objective}</Typography>
          </Box>
        )}
        {renderSkills()}
        {renderExperience()}
        {data.internships && data.internships.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Internships</Typography>
            {data.internships.map((exp, i) => (
              <Card key={i} variant="outlined" sx={{ p: 2, mb: 1 }} elevation={0}>
                <Typography variant="subtitle2" fontWeight={600}>{exp.designation || exp.title} @ {exp.company}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{exp.duration || `${exp.startDate} - ${exp.endDate || 'Present'}`}</Typography>
                {exp.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{exp.description}</Typography>}
              </Card>
            ))}
          </Box>
        )}
        {renderProjects()}
        {renderEducation()}
        {renderCertifications()}
        {renderArraySection('achievements', 'Achievements')}
        {renderArraySection('languages', 'Languages')}
        {renderArraySection('publications', 'Publications')}
        {renderArraySection('research', 'Research')}
        {renderArraySection('volunteering', 'Volunteering')}
        {renderArraySection('leadership', 'Leadership')}
        {renderCustomSections()}
      </Box>
    );
  };

  const activeResume = resumes.find((r) => r.isActive);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Resume Management
      </Typography>

      {/* Upload area */}
      <Card
        variant="outlined"
        sx={{
          mb: 4, p: 4, borderStyle: 'dashed', borderWidth: 2,
          borderColor: file ? 'primary.main' : 'divider',
          backgroundColor: file ? 'action.hover' : 'background.paper',
          cursor: 'pointer', transition: 'all 0.2s',
          '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept="application/pdf" hidden onChange={handleFileSelect} />
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {file ? file.name : 'Click or drag a PDF file here'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Maximum file size: 10 MB'}
          </Typography>
        </Box>
      </Card>

      {file && (
        <Button variant="contained" size="large" fullWidth disabled={uploading} onClick={handleUpload}
          startIcon={<CloudUploadIcon />} sx={{ mb: 4, py: 1.5 }}>
          {uploading ? 'Uploading & Parsing...' : 'Upload & Parse Resume'}
        </Button>
      )}
      {uploading && <LinearProgress sx={{ mb: 3 }} />}
      {error && <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>{error}</Alert>}

      {/* Active Resume Banner */}
      {activeResume && (
        <Alert icon={<StarIcon />} severity="info" sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={() => window.open(activeResume.fileUrl, '_blank')}>
              View Active
            </Button>
          }
        >
          Active resume: <strong>{activeResume.title}</strong> (uploaded {formatDate(activeResume.createdAt)})
        </Alert>
      )}

      {/* Resume History + Preview */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* History list */}
        <Box sx={{ flex: '1 1 380px', minWidth: 0 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Resume History ({resumes.length})
          </Typography>
          {loadingList && <LinearProgress sx={{ mb: 2 }} />}
          {!loadingList && resumes.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No resumes uploaded yet. Upload your first PDF above.
            </Typography>
          )}
          <Stack spacing={1.5}>
            {resumes.map((resume) => (
              <Card key={resume.id} variant="outlined" sx={{
                p: 2,
                borderColor: resume.isActive ? 'primary.main' : undefined,
                borderWidth: resume.isActive ? 2 : 1,
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {resume.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDate(resume.createdAt)}
                    </Typography>
                    {resume.isActive && (
                      <Chip label="Active" size="small" color="primary" icon={<StarIcon />} sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => handleView(resume)}><PreviewIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => handleDownload(resume)}><DownloadIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Rename">
                      <IconButton size="small" onClick={() => openRenameDialog(resume)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Replace file">
                      <IconButton size="small" onClick={() => openReplaceDialog(resume)}><RefreshIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {!resume.isActive && (
                      <Tooltip title="Set as active">
                        <IconButton size="small" onClick={() => handleActivate(resume)}><StarBorderIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => openDeleteDialog(resume)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
              </Card>
            ))}
          </Stack>
        </Box>

        {/* Preview pane */}
        {previewData && (
          <Box sx={{ flex: '1 1 500px', minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6" fontWeight={600}>Parsed Data</Typography>
              <Button size="small" sx={{ ml: 'auto' }} onClick={handleClosePreview}>Close</Button>
            </Box>
            <Card variant="outlined" sx={{ p: 3, maxHeight: '70vh', overflowY: 'auto' }}>
              {renderParsedData(previewData)}
            </Card>
          </Box>
        )}
      </Box>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rename Resume</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Title" value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRename}>Rename</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Resume</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Replace Dialog */}
      <Dialog open={replaceDialogOpen} onClose={() => setReplaceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Replace Resume File</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a new PDF to replace "{replaceTarget?.title}". The file will be re-uploaded and re-parsed.
          </Typography>
          <input ref={replaceInputRef} type="file" accept="application/pdf" onChange={handleReplaceFileSelect} />
          {replaceFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected: {replaceFile.name} ({(replaceFile.size / 1024 / 1024).toFixed(2)} MB)
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplaceDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!replaceFile || replacing} onClick={handleReplace}>
            {replacing ? 'Replacing...' : 'Replace & Re-parse'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}