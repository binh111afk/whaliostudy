// ==================== SAMPLE DATA SETUP ====================
// Run this in browser console to populate localStorage with sample data
// This will make the analytics charts display real data

console.log('📊 Setting up sample data for analytics...');

// 1. Sample Study Logs (Current Week)
const studyLogs = [
    { date: '2026-01-20', hours: 2.5, subject: 'Toán' },      // Monday
    { date: '2026-01-21', hours: 4, subject: 'Văn' },         // Tuesday (today)
    { date: '2026-01-22', hours: 3, subject: 'Anh' },         // Wednesday
    { date: '2026-01-23', hours: 5, subject: 'Lý' },          // Thursday
    { date: '2026-01-24', hours: 2, subject: 'Hóa' },         // Friday
    { date: '2026-01-25', hours: 0, subject: 'Weekend' },     // Saturday
    { date: '2026-01-26', hours: 4.5, subject: 'Tin' }        // Sunday
];

localStorage.setItem('whalio_study_logs', JSON.stringify(studyLogs));
console.log('✅ Study logs saved:', studyLogs);

// 2. Sample GPA Data (REAL FORMAT from gpa-calculator.js)
// This matches the actual structure used by the GPA Calculator
const gpaData = [
    {
        name: 'Toán Cao Cấp',
        credits: 4,
        components: [
            { score: 7.5, weight: 30 },  // Midterm 30%
            { score: 8.5, weight: 70 }   // Final 70%
        ]
    },
    {
        name: 'Văn Học Việt Nam',
        credits: 3,
        components: [
            { score: 6.0, weight: 40 },
            { score: 7.0, weight: 60 }
        ]
    },
    {
        name: 'Tiếng Anh Chuyên Ngành',
        credits: 3,
        components: [
            { score: 7.0, weight: 30 },
            { score: 7.0, weight: 70 }
        ]
    },
    {
        name: 'Vật Lý Đại Cương',
        credits: 4,
        components: [
            { score: 9.0, weight: 30 },
            { score: 9.0, weight: 70 }
        ]
    },
    {
        name: 'Hóa Học Đại Cương',
        credits: 3,
        components: [
            { score: 8.0, weight: 40 },
            { score: 9.0, weight: 60 }
        ]
    },
    {
        name: 'Tin Học Đại Cương',
        credits: 3,
        components: [
            { score: 9.5, weight: 30 },
            { score: 9.5, weight: 70 }
        ]
    }
];

localStorage.setItem('my_semester_grades', JSON.stringify(gpaData));
console.log('✅ GPA data saved:', gpaData);

// Calculate what the final scores will be
console.log('\n📊 Expected Final Scores:');
gpaData.forEach(subject => {
    const finalScore = subject.components.reduce((sum, comp) => {
        return sum + (comp.score * comp.weight / 100);
    }, 0);
    console.log(`- ${subject.name}: ${finalScore.toFixed(1)}`);
});

console.log('\n✅ Sample data setup complete!');
console.log('🔄 Reload the page to see charts with real data.');
console.log('💡 To update charts without reload, run: AnalyticsManager.updateCharts()');
console.log('\n📝 To add more subjects, use the GPA Calculator in the app.');
console.log('   The charts will auto-update when you save new grades!');
