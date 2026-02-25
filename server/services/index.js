const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PQueue = require('p-queue').default;
const config = require('../config');
const { User, Activity, Exam, UserActivityLog, StudySession } = require('../models');
const utils = require('../utils');

// ==================== ACTIVITY QUEUE ====================
const activityLogQueue = new PQueue({ concurrency: config.ACTIVITY_LOG_QUEUE_CONCURRENCY });

function enqueueActivityLog(task, label = 'activity') {
    setImmediate(() => {
        activityLogQueue.add(task).catch((err) => {
            console.error(`❌ Async ${label} queue error:`, err);
        });
    });
}

// ==================== ACTIVITY LOGGING ====================
async function writeActivityLog(username, action, target, link, type, req = null) {
    try {
        const user = await User.findOne({ username }).select('fullName avatar').lean();
        const activity = new Activity({
            user: user?.fullName || username,
            username: username,
            userAvatar: user?.avatar || null,
            action: action,
            target: target,
            link: link,
            type: type,
            time: new Date(),
            timestamp: Date.now()
        });
        await activity.save();

        const activityCount = await Activity.countDocuments();
        if (activityCount > 100) {
            const oldActivities = await Activity.find()
                .select('_id')
                .sort({ timestamp: 1 })
                .limit(activityCount - 100)
                .lean();
            await Activity.deleteMany({ _id: { $in: oldActivities.map(a => a._id) } });
        }

        await writeUserActivityLog({
            username,
            action: String(type || 'activity').trim() || 'activity',
            description: `${String(action || '').trim()} ${String(target || '').trim()}`.trim(),
            req,
            metadata: {
                target: String(target || '').trim(),
                link: String(link || '').trim(),
                activityType: String(type || 'activity').trim() || 'activity'
            }
        });

        console.log(`📌 Activity logged: ${username} ${action}`);
    } catch (err) {
        console.error('❌ Log activity error:', err);
    }
}

async function writeUserActivityLog({ username, action, description, req = null, metadata = {} }) {
    try {
        const normalizedUsername = String(username || '').trim();
        if (!normalizedUsername) return;

        const lowered = normalizedUsername.toLowerCase();
        if (lowered === 'guest' || lowered === 'ẩn danh') return;

        const user = await User.findOne({ username: normalizedUsername })
            .select('_id username lastIP lastCity lastCountry lastDevice')
            .lean();

        if (!user) return;

        const userAgent = String(req?.headers?.['user-agent'] || '').trim();
        const clientIP = req ? utils.extractClientIP(req) : String(user.lastIP || '').trim();
        const geo = clientIP ? utils.getGeoLocationFromIP(clientIP) : { country: '', city: '' };
        const resolvedCountry = String(user.lastCountry || geo.country || '').trim();
        const resolvedCity = String(user.lastCity || geo.city || '').trim();
        const resolvedDevice = String(
            (userAgent ? utils.parseDeviceFromUA(userAgent) : '') ||
            user.lastDevice ||
            ''
        ).trim();

        await UserActivityLog.create({
            userId: user._id,
            username: user.username,
            action: String(action || 'activity').trim() || 'activity',
            description: String(description || 'Người dùng thực hiện thao tác').trim(),
            ip: clientIP,
            device: resolvedDevice,
            userAgent,
            metadata: {
                ...metadata,
                lastCountry: resolvedCountry,
                lastCity: resolvedCity
            }
        });
    } catch (err) {
        console.error('❌ UserActivityLog write failed:', err);
    }
}

function logActivity(username, action, target, link, type, req = null) {
    enqueueActivityLog(
        () => writeActivityLog(username, action, target, link, type, req),
        'activity'
    );
}

function logUserActivityLog(payload) {
    enqueueActivityLog(
        () => writeUserActivityLog(payload || {}),
        'user-activity'
    );
}

// ==================== EXAM SEEDING ====================
async function seedExamsFromJSON(forceReseed = false) {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(60));
    console.log('🌱 EXAM SEEDING PROCESS STARTED');
    console.log('='.repeat(60));

    try {
        console.log('\n📊 Step 1: Checking database state...');
        const currentExamCount = await Exam.countDocuments();
        console.log(`   Current exams in database: ${currentExamCount}`);

        if (currentExamCount > 0 && !forceReseed) {
            console.log(`   ✅ Database already contains ${currentExamCount} exams.`);
            console.log('='.repeat(60) + '\n');
            return {
                success: true,
                message: 'Database already populated',
                examCount: currentExamCount,
                skipped: true
            };
        }

        if (forceReseed && currentExamCount > 0) {
            console.log(`   🔄 Force reseed enabled. Clearing ${currentExamCount} existing exams...`);
            await Exam.deleteMany({});
        }

        console.log('\n📁 Step 2: Resolving JSON file paths...');
        const examsFilePath = path.join(__dirname, '..', 'data', 'exams.json');
        const questionsFilePath = path.join(__dirname, '..', 'questions.json');

        console.log('\n🔍 Step 3: Checking file existence...');

        if (!fs.existsSync(examsFilePath)) {
            const error = `❌ Could not find exams.json at ${examsFilePath}`;
            console.error(`   ${error}`);
            return { success: false, error };
        }
        console.log(`   ✅ Found exams.json`);

        if (!fs.existsSync(questionsFilePath)) {
            const error = `❌ Could not find questions.json at ${questionsFilePath}`;
            console.error(`   ${error}`);
            return { success: false, error };
        }
        console.log(`   ✅ Found questions.json`);

        console.log('\n📖 Step 4: Reading JSON files...');

        let examsData, questionsData;

        try {
            const examsRaw = fs.readFileSync(examsFilePath, 'utf8');
            examsData = JSON.parse(examsRaw);
            console.log(`   ✅ Parsed exams.json - ${examsData.length} entries`);
        } catch (parseError) {
            return { success: false, error: `Failed to parse exams.json - ${parseError.message}` };
        }

        try {
            const questionsRaw = fs.readFileSync(questionsFilePath, 'utf8');
            questionsData = JSON.parse(questionsRaw);
            console.log(`   ✅ Parsed questions.json - ${Object.keys(questionsData).length} question sets`);
        } catch (parseError) {
            return { success: false, error: `Failed to parse questions.json - ${parseError.message}` };
        }

        console.log('\n🔄 Step 5: Transforming data...');

        const examsToInsert = [];
        let totalQuestions = 0;

        for (const exam of examsData) {
            const examId = exam.id.toString();
            const questionBank = questionsData[examId] || [];

            if (questionBank.length === 0) {
                console.log(`   ⚠️ Exam ID ${examId} has no questions - skipping`);
                continue;
            }

            let timeValue = exam.time;
            if (typeof timeValue === 'string') {
                timeValue = parseInt(timeValue.replace(/\D/g, '')) || 45;
            }

            const examDocument = {
                examId: examId,
                title: exam.title,
                subject: exam.subject || 'Tự tạo',
                questions: exam.questions || questionBank.length,
                time: timeValue,
                image: exam.image || './img/snvvnghen.png',
                createdBy: exam.createdBy || 'System',
                questionBank: questionBank,
                isDefault: true,
                createdAt: exam.createdAt ? new Date(exam.createdAt) : new Date()
            };

            examsToInsert.push(examDocument);
            totalQuestions += questionBank.length;
        }

        // Handle orphaned question sets
        const existingExamIds = new Set(examsData.map(e => e.id.toString()));
        const allQuestionSetIds = Object.keys(questionsData);
        const orphanedIds = allQuestionSetIds.filter(id => !existingExamIds.has(id));

        if (orphanedIds.length > 0) {
            console.log(`   📌 Found ${orphanedIds.length} orphaned question sets`);
            for (const id of orphanedIds) {
                const questionBank = questionsData[id];
                const examDocument = {
                    examId: id,
                    title: `Đề thi ${id}`,
                    subject: 'Tự tạo',
                    questions: questionBank.length,
                    time: 45,
                    image: './img/snvvnghen.png',
                    createdBy: 'System',
                    questionBank: questionBank,
                    isDefault: true,
                    createdAt: new Date()
                };
                examsToInsert.push(examDocument);
                totalQuestions += questionBank.length;
            }
        }

        console.log('\n💾 Step 6: Inserting into MongoDB...');
        if (examsToInsert.length === 0) {
            return { success: false, error: 'No valid exams to insert!' };
        }

        await Exam.insertMany(examsToInsert, { ordered: false });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ SEEDING COMPLETED in ${duration}s`);
        console.log(`   📊 Imported ${examsToInsert.length} exams`);
        console.log(`   📝 Imported ${totalQuestions} total questions`);
        console.log('='.repeat(60) + '\n');

        return {
            success: true,
            examCount: examsToInsert.length,
            questionCount: totalQuestions,
            duration: duration
        };

    } catch (error) {
        console.error('❌ CRITICAL ERROR DURING SEEDING:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

// ==================== PERFORMANCE INDEXES ====================
async function ensurePerformanceIndexes() {
    const startedAt = Date.now();
    const indexTasks = [
        { model: StudySession, fields: { username: 1, date: -1 }, name: 'study_session_username_date_idx' },
        { model: require('../models').Event, fields: { username: 1, date: 1 }, name: 'event_username_date_idx' },
        { model: require('../models').Document, fields: { uploaderUsername: 1, createdAt: -1 }, name: 'document_uploader_createdAt_idx' },
        { model: UserActivityLog, fields: { action: 1, createdAt: -1 }, name: 'user_activity_action_createdAt_idx' }
    ];

    const results = await Promise.all(indexTasks.map(async ({ model, fields, name }) => {
        const indexName = await model.collection.createIndex(fields, { name });
        return { modelName: model.modelName, indexName };
    }));

    const durationMs = Date.now() - startedAt;
    console.log(`⚙️  Performance indexes ensured (${results.length}) in ${durationMs}ms`);
    return results;
}

async function seedInitialData() {
    console.log('\n🔄 AUTO-SEED: Running automatic database seeding...');
    await ensurePerformanceIndexes();
    await seedExamsFromJSON(false);
}

// ==================== STUDY STATS ====================
async function getStudyStatsPayload(username) {
    const normalizedUsername = String(username || '').trim();
    if (!normalizedUsername) {
        return { chartData: [], totalMinutes: 0, cached: false };
    }

    const cachedStats = utils.getStudyStatsFromCache(normalizedUsername);
    if (cachedStats) {
        return {
            chartData: Array.isArray(cachedStats.chartData) ? cachedStats.chartData : [],
            totalMinutes: Number(cachedStats.totalMinutes) || 0,
            cached: true
        };
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sessions = await StudySession.find({
        username: normalizedUsername,
        date: { $gte: sevenDaysAgo }
    })
        .select('duration date')
        .sort({ date: 1 })
        .lean();

    const computed = utils.buildStudyStatsForLastSevenDays(sessions);
    utils.setStudyStatsCache(normalizedUsername, computed);
    return {
        chartData: computed.chartData,
        totalMinutes: computed.totalMinutes,
        cached: false
    };
}

module.exports = {
    // Activity logging
    activityLogQueue,
    enqueueActivityLog,
    writeActivityLog,
    writeUserActivityLog,
    logActivity,
    logUserActivityLog,
    
    // Seeding
    seedExamsFromJSON,
    ensurePerformanceIndexes,
    seedInitialData,
    
    // Stats
    getStudyStatsPayload
};
