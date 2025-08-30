import cron from 'node-cron';
import { db } from './db';
import { employeeNumbers } from '../shared/schema';

console.log('🕐 Setting up scheduled tasks...');

// Schedule automatic employee sync every Sunday at 12:01 AM (EST)
cron.schedule('1 0 * * 0', async () => {
  console.log('🔄 Starting automatic employee sync from schedule...');
  
  try {
    // Trigger the API endpoint to perform the sync
    const response = await fetch('http://localhost:5000/api/employee-numbers/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`❌ Sync failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error during automatic employee sync:', error);
  }
}, {
  timezone: "America/New_York"
});

// Schedule automatic employee activity analysis every Sunday at 12:05 AM (EST)
cron.schedule('5 0 * * 0', async () => {
  console.log('🔍 Starting automatic employee activity analysis...');
  
  try {
    // Trigger the API endpoint to perform the activity analysis
    const response = await fetch('http://localhost:5000/api/employee-numbers/analyze-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${result.message}`);
      if (result.results) {
        console.log(`📊 Analysis details: ${result.results.activatedCount} activated, ${result.results.deactivatedCount} deactivated`);
      }
    } else {
      console.log(`❌ Activity analysis failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error during automatic employee activity analysis:', error);
  }
}, {
  timezone: "America/New_York"
});

console.log('✅ Scheduled tasks initialized - Employee sync runs every Sunday at 12:01 AM EST, Employee activity analysis runs every Sunday at 12:05 AM EST');