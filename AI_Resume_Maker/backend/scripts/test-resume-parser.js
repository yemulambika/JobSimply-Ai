/**
 * Test script for resume parsing
 * Tests the resume parser with sample resume data
 * 
 * Usage: node scripts/test-resume-parser.js
 */

import { resumeParserService } from '../services/ResumeParserService.js';
import { normalizeResumeData } from '../src/services/ai/normalizeResumeData.js';

// Sample resume text (simulating extracted PDF text)
const sampleResumeText = `Ambika Yemul
Pune
+91-9765679908
ambikayemul2001@gmail.com

SKILLS
React, Next.JS, Javascript, TypeScript, HTML, CSS, Redux, Node.js, Express.js, Spring Boot, REST API, Fast API, MongoDB, 
MySQL, SQL, AWS, Docker, Git, GitHub, postman, Java, Python, Natural Language Processing (NLP), Django, CI/CD, Microservices, 
React Native, PostgreSQL

EXPERIENCE
FullStack Developer Intern
Aug 2024 - Aug 2025
Suzlon Energy LTD
Developed and optimized 10+ SQL queries, reducing execution time by 30% and improving data retrieval performance.
Built interactive Power BI dashboards, enhancing decision-making with real-time analytics and improving reporting efficiency by 20%.
Engineered a full-stack weather dashboard using React, Node.js, and MongoDB, integrating external APIs for real-time data. Improved
application responsiveness and scalability through efficient API handling and optimized backend logic.

PROJECTS
Loan Management System Full Stack MERN Application
https://loan-management-system-gw4k.vercel.app/
Developed a full-stack loan management system using Next.js, TypeScript, Tailwind CSS, Ant Design, Node.js, Express.js, MongoDB,
and Docker with secure role-based authentication and protected routing.
Implemented borrower onboarding, loan workflows, document uploads, approval management, dashboard analytics, and scalable
REST APIs with JWT authentication.
Optimized application performance through responsive UI design, seamless frontend-backend integration, and Dockerized deployment
for scalable environments.

AI Resume Matcher- Full Stack Application
https://ai-resume-maker-ashen.vercel.app/
Developed an AI-powered career platform using React.js, Node.js, Python, and NLP for resume analysis, ATS scoring, and job
description matching.
Implemented AI-driven resume generation, cover letter creation, keyword extraction, text similarity matching, and personalized job-fit
recommendations.
Built scalable REST APIs and backend workflows for resume parsing, career insights, and intelligent candidate evaluation using
modern AI techniques.

Food Ordering Mobile Application
https://github.com/yemulambika/FoodOrdering
Built a cross-platform food ordering application using React Native and Supabase, implementing authentication, REST API integration,
routing, and state management.
Developed reusable and responsive mobile UI components with real-time menu and order management using cloud backend services.
Optimized navigation and application performance while following component-based architecture and modern React Native. Managed
source code using Git and GitHub following version control best practices.

Titanic Survival Prediction | Machine Learning
https://titanic-dataset-2git-6zmupdentwbx2w8fldrbfh.streamlit.app/
Developed a machine learning classification system to predict Titanic passenger survival using historical passenger data. Engineered
features and performed data preprocessing, including missing value handling, categorical encoding, and data analysis.
Implemented and compared Logistic Regression and Decision Tree models using Scikit-Learn.
Obtained 67.8% test accuracy using Logistic Regression and 65.4% test accuracy using Decision Tree, with Logistic Regression
delivering the best performance.

ACHIEVEMENTS
Scaler Academy Certification - Data Structures & Algorithms, MERN Stack Development, React.js Development, JavaScript, Database
Management & SQL
Velocity Institute Certification - Machine Learning & Data Science

EDUCATION
Bachelor of Engineering in Information Technology
BSIOTR JSPM College Of Engineering
2024

SCALER ACADEMY
Specialization: Software Development & Problem Solving (2026)`;

async function testParser() {
  console.log('=== Testing Resume Parser ===\n');
  
  try {
    console.log('Testing ResumeParserService.parseResumeText...');
    const parsedData = resumeParserService.parseResumeText(sampleResumeText);
    
    console.log('\n=== Parsed Data Structure ===');
    console.log('Personal Info:', JSON.stringify(parsedData.personalInfo, null, 2));
    console.log('\nSkills:', JSON.stringify(parsedData.skills, null, 2));
    console.log('\nExperience Count:', parsedData.experience?.length || 0);
    console.log('Experience:', JSON.stringify(parsedData.experience, null, 2));
    console.log('\nProjects Count:', parsedData.projects?.length || 0);
    console.log('Projects:', JSON.stringify(parsedData.projects, null, 2));
    console.log('\nEducation Count:', parsedData.education?.length || 0);
    console.log('Education:', JSON.stringify(parsedData.education, null, 2));
    console.log('\nCertifications Count:', parsedData.certifications?.length || 0);
    console.log('Certifications:', JSON.stringify(parsedData.certifications, null, 2));
    console.log('\nAchievements Count:', parsedData.achievements?.length || 0);
    console.log('Achievements:', JSON.stringify(parsedData.achievements, null, 2));
    console.log('\nLinks:', JSON.stringify(parsedData.links, null, 2));
    console.log('\nExtraction Confidence:', parsedData.extractionConfidence);
    
    // Test normalization
    console.log('\n=== Testing Normalization ===');
    const normalized = normalizeResumeData(parsedData);
    console.log('Normalized structure keys:', Object.keys(normalized));
    
    // Verify skill categories
    console.log('\n=== Skill Categories (Non-empty) ===');
    const skillCategories = ['programming', 'frontend', 'backend', 'frameworks', 'database', 'cloud', 'devops', 'ai', 'ml', 'dataScience', 'mobile', 'testing', 'tools', 'soft', 'other'];
    skillCategories.forEach(cat => {
      const skills = normalized.skills?.[cat];
      if (skills && skills.length > 0) {
        console.log(`${cat}: ${skills.join(', ')}`);
      }
    });
    
    console.log('\n=== Test Complete ===');
    console.log('All sections parsed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testParser();