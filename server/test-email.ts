#!/usr/bin/env node
import { emailService } from './email-service';

// Mock job recommendations for testing
const mockJobRecommendations = [
  {
    title: 'Senior Full Stack Engineer',
    company: 'Tech Innovators Inc',
    location: 'San Francisco, CA (Remote)',
    url: 'https://findhiddenjobs.com/job/1',
    platform: 'Greenhouse',
    tags: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    logo: 'https://example.com/logo1.png'
  },
  {
    title: 'Product Manager - AI/ML',
    company: 'DataCorp Solutions',
    location: 'New York, NY (Hybrid)',
    url: 'https://findhiddenjobs.com/job/2',
    platform: 'Lever',
    tags: ['Product Strategy', 'Machine Learning', 'Analytics'],
    logo: 'https://example.com/logo2.png'
  },
  {
    title: 'Software Engineering Manager',
    company: 'Future Systems',
    location: 'Austin, TX (Remote)',
    url: 'https://findhiddenjobs.com/job/3',
    platform: 'Ashby',
    tags: ['Leadership', 'Python', 'DevOps', 'Team Management'],
    logo: 'https://example.com/logo3.png'
  },
  {
    title: 'Frontend Developer',
    company: 'Digital Dynamics',
    location: 'Seattle, WA (Remote)',
    url: 'https://findhiddenjobs.com/job/4',
    platform: 'Workday',
    tags: ['React', 'Vue.js', 'CSS', 'JavaScript'],
    logo: 'https://example.com/logo4.png'
  },
  {
    title: 'Data Scientist',
    company: 'Analytics Pro',
    location: 'Boston, MA (Onsite)',
    url: 'https://findhiddenjobs.com/job/5',
    platform: 'Workable',
    tags: ['Python', 'R', 'Machine Learning', 'Statistics'],
    logo: 'https://example.com/logo5.png'
  },
  {
    title: 'DevOps Engineer',
    company: 'Cloud First Technologies',
    location: 'Denver, CO (Remote)',
    url: 'https://findhiddenjobs.com/job/6',
    platform: 'BambooHR',
    tags: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    logo: 'https://example.com/logo6.png'
  },
  {
    title: 'UX/UI Designer',
    company: 'Design Studios Plus',
    location: 'Los Angeles, CA (Hybrid)',
    url: 'https://findhiddenjobs.com/job/7',
    platform: 'Greenhouse',
    tags: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
    logo: 'https://example.com/logo7.png'
  },
  {
    title: 'Backend Engineer - Go',
    company: 'Microservices Corp',
    location: 'Remote (US)',
    url: 'https://findhiddenjobs.com/job/8',
    platform: 'Lever',
    tags: ['Go', 'Microservices', 'Kubernetes', 'gRPC'],
    logo: 'https://example.com/logo8.png'
  },
  {
    title: 'Solutions Architect',
    company: 'Enterprise Tech Solutions',
    location: 'Chicago, IL (Remote)',
    url: 'https://findhiddenjobs.com/job/9',
    platform: 'Ashby',
    tags: ['AWS', 'Solution Design', 'Enterprise Architecture'],
    logo: 'https://example.com/logo9.png'
  },
  {
    title: 'Mobile App Developer',
    company: 'Mobile First Co',
    location: 'Miami, FL (Remote)',
    url: 'https://findhiddenjobs.com/job/10',
    platform: 'Workday',
    tags: ['React Native', 'iOS', 'Android', 'Swift'],
    logo: 'https://example.com/logo10.png'
  }
];

async function sendTestEmail() {
  try {
    console.log('🚀 Sending test digest email to sameer.s.chopra@gmail.com...');
    
    await emailService.sendDailyRecommendations(
      'test-user-123', // Mock user ID
      'sameer.s.chopra@gmail.com',
      mockJobRecommendations
    );
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Check sameer.s.chopra@gmail.com for the daily job recommendations digest');
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    console.log('💡 Make sure EMAIL_SERVICE environment variable is set (gmail, sendgrid, mailgun, or console)');
    console.log('💡 If using gmail, set EMAIL_USER and EMAIL_PASSWORD');
    console.log('💡 If using sendgrid, set SENDGRID_API_KEY');
    console.log('💡 If using mailgun, set MAILGUN_USERNAME and MAILGUN_PASSWORD');
  }
}

// Run the test
sendTestEmail();

export { sendTestEmail };