#!/usr/bin/env node
/**
 * Import Jobilla context document into the Repository
 * Run with: node scripts/import-jobilla.js
 */

const fs = require('fs');
const path = require('path');

async function importDocument() {
  const contentPath = path.join(__dirname, '../data/import-jobilla-context.md');
  
  if (!fs.existsSync(contentPath)) {
    console.error('❌ File not found:', contentPath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(contentPath, 'utf-8');
  
  const doc = {
    type: 'writing',
    title: 'The Jobilla Primer: Core Function and Goals',
    slug: 'jobilla-context',
    language: 'en',
    metadata: JSON.stringify({
      tags: ['Context', 'essay'],
      source: 'jobilla_context.mdc',
      description: "Comprehensive guide covering Jobilla's business model, campaign creation, QA rules, candidate-driven approach, and brand guidelines"
    }),
    content: content
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/repository/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Document imported successfully!');
      console.log('   ID:', result.id);
      console.log('   Slug:', result.slug);
      console.log('   Title:', result.title);
    } else {
      console.error('❌ Import failed:', result.error || result);
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('   Make sure the server is running: make dev');
  }
}

importDocument();
