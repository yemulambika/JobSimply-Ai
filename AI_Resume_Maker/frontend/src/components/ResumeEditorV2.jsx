import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, 
  Menu, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Collapse, 
  Spin, 
  message,
  Tooltip,
  Tabs,
  Card,
  Space,
  Typography,
} from 'antd';
import {
  DragOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  DownloadOutlined,
  HistoryOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { resumeApi } from '../services/resumeApi';
import type { ResumeJSON } from '../types/resume';

const { Header, Content, Sider } = Layout;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Title, Text } = Typography;

// Section definitions for the editor
const SECTION_CONFIG = [
  { key: 'personalInfo', label: 'Personal Info', icon: '👤' },
  { key: 'summary', label: 'Summary', icon: '📝' },
  { key: 'experience', label: 'Experience', icon: '💼' },
  { key: 'projects', label: 'Projects', icon: '🚀' },
  { key: 'education', label: 'Education', icon: '🎓' },
  { key: 'skills', label: 'Skills', icon: '⚡' },
  { key: 'certifications', label: 'Certifications', icon: '📜' },
  { key: 'achievements', label: 'Achievements', icon: '🏆' },
];

/**
 * Resume Editor V2 Component
 * Full-featured editor with drag-drop, auto-save, ATS score
 */
export default function ResumeEditorV2({ resumeId, initialData }) {
  const [resumeJSON, setResumeJSON] = useState<ResumeJSON>(initialData?.resumeJSON || getEmptyResume());
  const [atsScore, setAtsScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personalInfo');
  const [collapsedSections, setCollapsedSections] = useState([]);

  // Auto-save debounce
  const saveTimeoutRef = React.useRef();

  useEffect(() => {
    // Load resume data
    if (initialData?.resumeJSON) {
      setResumeJSON(initialData.resumeJSON);
      setAtsScore(initialData.atsScore || 0);
    }
  }, [initialData]);

  // Handle section reordering
  const handleSectionReorder = (activeKey, overKey) => {
    // This would update the order in the resume JSON
    console.log('Reorder:', activeKey, overKey);
  };

  // Update field in resume JSON
  const updateField = useCallback((section, field, value) => {
    setResumeJSON(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }, []);

  // Auto-save on changes
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [resumeJSON]);

  const handleAutoSave = async () => {
    if (!resumeId) return;
    setSaving(true);
    try {
      await resumeApi.updateResume(resumeId, resumeJSON);
      message.success('Auto-saved');
    } catch (error) {
      message.error('Auto-save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      const blob = await resumeApi.downloadResume(resumeId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Download failed');
    }
  };

  const renderPersonalInfo = () => (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          placeholder="Full Name"
          value={resumeJSON.personalInfo.name || ''}
          onChange={(e) => updateField('personalInfo', 'name', e.target.value)}
        />
        <Input
          placeholder="Email"
          value={resumeJSON.personalInfo.email || ''}
          onChange={(e) => updateField('personalInfo', 'email', e.target.value)}
        />
        <Input
          placeholder="Phone"
          value={resumeJSON.personalInfo.phone || ''}
          onChange={(e) => updateField('personalInfo', 'phone', e.target.value)}
        />
        <Input
          placeholder="Location"
          value={resumeJSON.personalInfo.location || ''}
          onChange={(e) => updateField('personalInfo', 'location', e.target.value)}
        />
        <Input
          placeholder="LinkedIn URL"
          value={resumeJSON.personalInfo.linkedin || ''}
          onChange={(e) => updateField('personalInfo', 'linkedin', e.target.value)}
        />
        <Input
          placeholder="GitHub URL"
          value={resumeJSON.personalInfo.github || ''}
          onChange={(e) => updateField('personalInfo', 'github', e.target.value)}
        />
      </Space>
    </div>
  );

  const renderSummary = () => (
    <div style={{ padding: '16px' }}>
      <TextArea
        placeholder="Professional Summary"
        value={resumeJSON.summary || ''}
        onChange={(e) => setResumeJSON(prev => ({ ...prev, summary: e.target.value }))}
        rows={6}
      />
    </div>
  );

  const renderExperience = () => (
    <div style={{ padding: '16px' }}>
      {resumeJSON.experience?.map((exp, index) => (
        <Card key={index} size="small" style={{ marginBottom: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              placeholder="Company"
              value={exp.company || ''}
              onChange={(e) => {
                const newExp = [...resumeJSON.experience];
                newExp[index] = { ...exp, company: e.target.value };
                setResumeJSON(prev => ({ ...prev, experience: newExp }));
              }}
            />
            <Input
              placeholder="Designation"
              value={exp.designation || ''}
              onChange={(e) => {
                const newExp = [...resumeJSON.experience];
                newExp[index] = { ...exp, designation: e.target.value };
                setResumeJSON(prev => ({ ...prev, experience: newExp }));
              }}
            />
            <Input
              placeholder="Duration (e.g., Jan 2022 - Present)"
              value={exp.duration || ''}
              onChange={(e) => {
                const newExp = [...resumeJSON.experience];
                newExp[index] = { ...exp, duration: e.target.value };
                setResumeJSON(prev => ({ ...prev, experience: newExp }));
              }}
            />
            <TextArea
              placeholder="Description"
              value={exp.description || ''}
              onChange={(e) => {
                const newExp = [...resumeJSON.experience];
                newExp[index] = { ...exp, description: e.target.value };
                setResumeJSON(prev => ({ ...prev, experience: newExp }));
              }}
              rows={3}
            />
          </Space>
        </Card>
      ))}
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={() => {
          setResumeJSON(prev => ({
            ...prev,
            experience: [...(prev.experience || []), {
              company: '',
              designation: '',
              employmentType: 'Full-time',
              location: '',
              startDate: '',
              endDate: '',
              current: false,
              duration: '',
              description: '',
              bullets: [],
              technologies: [],
            }],
          }));
        }}
      >
        Add Experience
      </Button>
    </div>
  );

  const renderSkills = () => (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {Object.entries(resumeJSON.skills || {}).map(([category, skills]) => (
          <div key={category}>
            <Text strong>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
            <Select
              mode="tags"
              placeholder={`Add ${category} skills`}
              value={skills || []}
              onChange={(values) => {
                setResumeJSON(prev => ({
                  ...prev,
                  skills: {
                    ...prev.skills,
                    [category]: values,
                  },
                }));
              }}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </Space>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Sider width={250} style={{ background: '#fff', padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <Title level={4}>Sections</Title>
          {saving && <Text type="secondary">Saving...</Text>}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[activeSection]}
          onClick={(e) => setActiveSection(e.key)}
          style={{ border: 'none' }}
        >
          {SECTION_CONFIG.map(section => (
            <Menu.Item key={section.key} icon={section.icon}>
              {section.label}
            </Menu.Item>
          ))}
        </Menu>

        <div style={{ marginTop: '24px' }}>
          <Title level={5}>ATS Score</Title>
          <Tag color={atsScore >= 80 ? 'green' : atsScore >= 50 ? 'orange' : 'red'} style={{ fontSize: '16px', padding: '4px 12px' }}>
            {atsScore}%
          </Tag>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Title level={5}>Download</Title>
          <Space>
            <Tooltip title="Download PDF">
              <Button icon={<FilePdfOutlined />} onClick={() => handleDownload('pdf')} />
            </Tooltip>
            <Tooltip title="Download HTML">
              <Button icon={<CodeOutlined />} onClick={() => handleDownload('html')} />
            </Tooltip>
            <Tooltip title="Download Markdown">
              <Button icon={<FileTextOutlined />} onClick={() => handleDownload('markdown')} />
            </Tooltip>
            <Tooltip title="Download Text">
              <Button icon={<FileTextOutlined />} onClick={() => handleDownload('txt')} />
            </Tooltip>
          </Space>
        </div>
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Resume Editor V2</Title>
          <Space>
            <Button icon={<HistoryOutlined />}>History</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleAutoSave}>Save</Button>
          </Space>
        </Header>

        <Content style={{ padding: '24px' }}>
          <Collapse activeKey={activeSection} bordered={false}>
            <Panel header="Personal Information" key="personalInfo">
              {renderPersonalInfo()}
            </Panel>
            <Panel header="Professional Summary" key="summary">
              {renderSummary()}
            </Panel>
            <Panel header="Work Experience" key="experience">
              {renderExperience()}
            </Panel>
            <Panel header="Skills" key="skills">
              {renderSkills()}
            </Panel>
          </Collapse>
        </Content>
      </Layout>
    </Layout>
  );
}

/**
 * Empty resume structure
 */
function getEmptyResume(): ResumeJSON {
  return {
    personalInfo: { name: '', email: '', phone: '', address: '', city: '', country: '' },
    summary: '',
    objective: '',
    skills: {
      programming: [], frontend: [], backend: [], frameworks: [], database: [],
      cloud: [], devops: [], ai: [], ml: [], dataScience: [],
      mobile: [], testing: [], tools: [], soft: [], other: []
    },
    experience: [],
    internships: [],
    projects: [],
    education: [],
    certifications: [],
    achievements: [],
    publications: [],
    research: [],
    volunteering: [],
    leadership: [],
    languages: [],
    links: {},
    customSections: [],
  };
}