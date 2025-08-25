import cron from 'node-cron';
import { db } from './db';
import { employeeNumbers } from '../shared/schema';

console.log('🕐 Setting up scheduled tasks...');

// Schedule automatic employee sync every Sunday at 12:01 AM (EST)
cron.schedule('1 0 * * 0', async () => {
  console.log('🔄 Starting automatic employee sync from schedule...');
  
  try {
    // Get current employees from schedule
    const scheduleResponse = await fetch('http://localhost:5000/api/schedule');
    const scheduleData = await scheduleResponse.json();
    
    if (!scheduleData.employees) {
      console.log('❌ No employee data in schedule');
      return;
    }
    
    // Get existing employee names
    const existingEmployees = await db.select().from(employeeNumbers);
    const existingNames = new Set(existingEmployees.map(emp => emp.employeeName));
    
    // Add employees from schedule who don't exist (never overwrite existing ones)
    let syncedCount = 0;
    for (const emp of scheduleData.employees) {
      const fullName = `${emp.firstName} ${emp.lastName}`;
      if (!existingNames.has(fullName)) {
        try {
          await db
            .insert(employeeNumbers)
            .values({ 
              employeeName: fullName, 
              employeeNumber: "" // Will be filled when they create timesheet
            });
          syncedCount++;
          console.log(`✅ Added new employee: ${fullName}`);
        } catch (insertError) {
          // Skip if employee already exists (race condition)
          console.log(`⚠️ Employee ${fullName} already exists, skipping`);
        }
      }
    }
    
    console.log(`✅ Automatic sync completed: ${syncedCount} new employees added`);
  } catch (error) {
    console.error('❌ Error during automatic employee sync:', error);
  }
}, {
  scheduled: true,
  timezone: "America/New_York"
});

console.log('✅ Scheduled tasks initialized - Employee sync runs every Sunday at 12:01 AM EST');