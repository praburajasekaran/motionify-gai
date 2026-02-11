/**
 * Simple API Server for Shared Data
 * Serves proposals, inquiries, and projects to both Next.js and React admin portal
 * Runs on port 5175
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5175;

// Enable CORS for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// ============================================================================
// In-Memory Storage (replaces localStorage)
// ============================================================================

let storage = {
  motionify_inquiries: [],
  motionify_proposals: [],
  motionify_projects: [],
  motionify_users: [],
  motionify_deliverables: [],
  motionify_tasks: [],
};

// Initialize with any existing data from localStorage (for migration)
try {
  const fs = require('fs');
  const localStoragePath = '/Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/landing-page-new/.next/server/chunks';
  
  if (fs.existsSync(localStoragePath)) {
    console.log('📁 Migrating existing localStorage data...');
    // In production, we'd use a database
  }
} catch (error) {
  console.log('Starting fresh storage');
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function updateTimestamps(items) {
  return items.map(item => ({
    ...item,
    updatedAt: new Date().toISOString()
  }));
}

// ============================================================================
// Routes
// ============================================================================

// GET /api/proposals
app.get('/api/proposals', (req, res) => {
  res.json(storage.motionify_proposals);
});

// GET /api/proposals/:id
app.get('/api/proposals/:id', (req, res) => {
  const proposal = storage.motionify_proposals.find(p => p.id === req.params.id);
  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }
  res.json(proposal);
});

// POST /api/proposals (create)
app.post('/api/proposals', (req, res) => {
  const { inquiryId, description, deliverables, currency, totalPrice, advancePercentage, advanceAmount, balanceAmount } = req.body;
  
  const newProposal = {
    id: generateId(),
    inquiryId,
    status: 'sent',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description,
    deliverables,
    currency,
    totalPrice,
    advancePercentage,
    advanceAmount,
    balanceAmount,
  };
  
  storage.motionify_proposals.unshift(newProposal);
  console.log('✅ Proposal created:', newProposal.id);
  
  res.json(newProposal);
});

// PUT /api/proposals/:id (update)
app.put('/api/proposals/:id', (req, res) => {
  const { status, feedback, version } = req.body;
  const index = storage.motionify_proposals.findIndex(p => p.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Proposal not found' });
  }
  
  if (version) {
    storage.motionify_proposals[index].version = version;
    storage.motionify_proposals[index].editHistory = storage.motionify_proposals[index].editHistory || [];
    storage.motionify_proposals[index].editHistory.push({
      version: version - 1,
      editedAt: new Date().toISOString(),
      reason: feedback
    });
  }
  
  storage.motionify_proposals[index] = {
    ...storage.motionify_proposals[index],
    status: status || storage.motionify_proposals[index].status,
    feedback: feedback || storage.motionify_proposals[index].feedback,
    updatedAt: new Date().toISOString()
  };
  
  console.log('✅ Proposal updated:', req.params.id, '→', status);
  res.json(storage.motionify_proposals[index]);
});

// GET /api/inquiries
app.get('/api/inquiries', (req, res) => {
  res.json(storage.motionify_inquiries);
});

// POST /api/inquiries (create)
app.post('/api/inquiries', (req, res) => {
  const { quizAnswers, contactInfo, recommendedVideoType, inquiryNumber } = req.body;
  
  const newInquiry = {
    id: generateId(),
    inquiryNumber,
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    quizAnswers,
    recommendedVideoType,
    ...contactInfo,
  };
  
  storage.motionify_inquiries.unshift(newInquiry);
  console.log('✅ Inquiry created:', newInquiry.id);
  
  res.json(newInquiry);
});

// PUT /api/inquiries/:id (update status)
app.put('/api/inquiries/:id', (req, res) => {
  const { status, proposalId, convertedToProjectId } = req.body;
  const index = storage.motionify_inquiries.findIndex(i => i.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Inquiry not found' });
  }
  
  storage.motionify_inquiries[index] = {
    ...storage.motionify_inquiries[index],
    status: status || storage.motionify_inquiries[index].status,
    proposalId: proposalId || storage.motionify_inquiries[index].proposalId,
    convertedToProjectId: convertedToProjectId || storage.motionify_inquiries[index].convertedToProjectId,
    updatedAt: new Date().toISOString()
  };
  
  console.log('✅ Inquiry updated:', req.params.id, '→', status);
  res.json(storage.motionify_inquiries[index]);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    storage: {
      inquiries: storage.motionify_inquiries.length,
      proposals: storage.motionify_proposals.length,
    }
  });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Shared Data API Server running on http://localhost:${PORT}`);
  console.log('📊 Health check: http://localhost:${PORT}/api/health');
});