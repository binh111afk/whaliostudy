/**
 * 🗄️ WHALIO STUDY - MONGODB INDEX CREATION SCRIPT
 * ================================================
 * Script này tạo các index cần thiết để tối ưu hóa performance
 * 
 * Chạy: node scripts/create-indexes.js
 * Yêu cầu: .env file với MONGODB_URI
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGODB_URI không được cấu hình trong .env');
    process.exit(1);
}

async function createIndexes() {
    console.log('🔗 Đang kết nối MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Đã kết nối MongoDB!\n');
    
    const db = mongoose.connection.db;
    
    // ==================== DOCUMENTS INDEXES ====================
    console.log('📄 Tạo indexes cho collection "documents"...');
    try {
        await db.collection('documents').createIndexes([
            // Index cho sort by createdAt (rất quan trọng cho /api/stats)
            { 
                key: { createdAt: -1 }, 
                name: 'idx_documents_createdAt_desc',
                background: true
            },
            // Index cho aggregation size (quan trọng cho /api/stats)
            { 
                key: { size: 1 }, 
                name: 'idx_documents_size',
                background: true
            },
            // Compound index cho filter + sort
            { 
                key: { course: 1, createdAt: -1 }, 
                name: 'idx_documents_course_createdAt',
                background: true
            },
            // Index cho visibility filter
            { 
                key: { visibility: 1, createdAt: -1 }, 
                name: 'idx_documents_visibility_createdAt',
                background: true
            },
            // Index cho uploader lookup
            { 
                key: { uploader: 1, createdAt: -1 }, 
                name: 'idx_documents_uploader_createdAt',
                background: true
            }
        ]);
        console.log('   ✅ Documents indexes created!\n');
    } catch (err) {
        console.log(`   ⚠️ Documents indexes: ${err.message}\n`);
    }
    
    // ==================== USERS INDEXES ====================
    console.log('👤 Tạo indexes cho collection "users"...');
    try {
        await db.collection('users').createIndexes([
            // Unique index cho username (quan trọng cho login)
            { 
                key: { username: 1 }, 
                name: 'idx_users_username_unique',
                unique: true,
                background: true
            },
            // Sparse index cho email (có thể null)
            { 
                key: { email: 1 }, 
                name: 'idx_users_email_sparse',
                sparse: true,
                background: true
            },
            // Index cho googleId (OAuth)
            { 
                key: { googleId: 1 }, 
                name: 'idx_users_googleId_sparse',
                sparse: true,
                background: true
            }
        ]);
        console.log('   ✅ Users indexes created!\n');
    } catch (err) {
        console.log(`   ⚠️ Users indexes: ${err.message}\n`);
    }
    
    // ==================== EXAMS INDEXES ====================
    console.log('📝 Tạo indexes cho collection "exams"...');
    try {
        await db.collection('exams').createIndexes([
            // Unique index cho examId
            { 
                key: { examId: 1 }, 
                name: 'idx_exams_examId_unique',
                unique: true,
                background: true
            },
            // Index cho sort by createdAt
            { 
                key: { createdAt: -1 }, 
                name: 'idx_exams_createdAt_desc',
                background: true
            },
            // Index cho subject filter
            { 
                key: { subject: 1, createdAt: -1 }, 
                name: 'idx_exams_subject_createdAt',
                background: true
            }
        ]);
        console.log('   ✅ Exams indexes created!\n');
    } catch (err) {
        console.log(`   ⚠️ Exams indexes: ${err.message}\n`);
    }
    
    // ==================== POSTS INDEXES (Community) ====================
    console.log('💬 Tạo indexes cho collection "posts"...');
    try {
        await db.collection('posts').createIndexes([
            // Index cho sort by createdAt
            { 
                key: { createdAt: -1 }, 
                name: 'idx_posts_createdAt_desc',
                background: true
            },
            // Index cho author lookup
            { 
                key: { author: 1, createdAt: -1 }, 
                name: 'idx_posts_author_createdAt',
                background: true
            }
        ]);
        console.log('   ✅ Posts indexes created!\n');
    } catch (err) {
        console.log(`   ⚠️ Posts indexes: ${err.message}\n`);
    }
    
    // ==================== EVENTS/TIMETABLE INDEXES ====================
    console.log('📅 Tạo indexes cho collection "events"...');
    try {
        await db.collection('events').createIndexes([
            // Index cho user + date range
            { 
                key: { user: 1, startDate: 1 }, 
                name: 'idx_events_user_startDate',
                background: true
            },
            // Index cho type filter
            { 
                key: { type: 1, startDate: 1 }, 
                name: 'idx_events_type_startDate',
                background: true
            }
        ]);
        console.log('   ✅ Events indexes created!\n');
    } catch (err) {
        console.log(`   ⚠️ Events indexes: ${err.message}\n`);
    }
    
    // ==================== BLACKLIST IPS INDEXES ====================
    console.log('🚫 Tạo indexes cho collection "blacklistips"...');
    try {
        await db.collection('blacklistips').createIndexes([
            // Index cho IP lookup (quan trọng cho gatekeeper)
            { 
                key: { ip: 1 }, 
                name: 'idx_blacklistips_ip',
                background: true
            },
            // Index cho status filter
            { 
                key: { status: 1, ip: 1 }, 
                name: 'idx_blacklistips_status_ip',
                background: true
            }
        ]);
        console.log('   ✅ BlacklistIPs indexes created!\n');
    } catch (err) {
        console.log(`   ⚠️ BlacklistIPs indexes: ${err.message}\n`);
    }
    
    // ==================== VERIFY INDEXES ====================
    console.log('═'.repeat(50));
    console.log('📊 KIỂM TRA INDEXES ĐÃ TẠO:');
    console.log('═'.repeat(50));
    
    const collections = ['documents', 'users', 'exams', 'posts', 'events', 'blacklistips'];
    
    for (const collName of collections) {
        try {
            const indexes = await db.collection(collName).indexes();
            console.log(`\n${collName}: ${indexes.length} indexes`);
            indexes.forEach(idx => {
                const keys = Object.keys(idx.key).join(', ');
                console.log(`   - ${idx.name}: {${keys}}`);
            });
        } catch (err) {
            console.log(`\n${collName}: Collection không tồn tại hoặc lỗi`);
        }
    }
    
    console.log('\n' + '═'.repeat(50));
    console.log('✅ HOÀN TẤT TẠO INDEXES!');
    console.log('═'.repeat(50));
    
    await mongoose.disconnect();
    console.log('\n🔌 Đã ngắt kết nối MongoDB.');
}

// Run
createIndexes()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    });
