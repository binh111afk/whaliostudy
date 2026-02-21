require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/whalio';
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 300;

const userSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, index: true },
        lastIP: { type: String, default: '' },
        lastCountry: { type: String, default: '' },
        lastCity: { type: String, default: '' },
        lastDevice: { type: String, default: '' }
    },
    { strict: false }
);

const activitySchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        action: { type: String, required: true },
        target: { type: String, default: '' },
        link: { type: String, default: '' },
        type: { type: String, default: 'activity' },
        time: { type: Date, default: Date.now },
        timestamp: { type: Number, default: Date.now }
    },
    { strict: false }
);

const userActivityLogSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        username: { type: String, required: true, index: true },
        action: { type: String, required: true },
        description: { type: String, required: true },
        ip: { type: String, default: '' },
        device: { type: String, default: '' },
        userAgent: { type: String, default: '' },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        createdAt: { type: Date, default: Date.now, index: true }
    },
    { strict: false }
);

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);
const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);

function normalizeDate(activity) {
    if (activity?.time instanceof Date && !Number.isNaN(activity.time.getTime())) {
        return activity.time;
    }
    if (typeof activity?.timestamp === 'number') {
        const d = new Date(activity.timestamp);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
}

function buildDescription(activity) {
    const action = String(activity?.action || '').trim();
    const target = String(activity?.target || '').trim();
    return `${action} ${target}`.trim() || 'Legacy activity migrated';
}

async function processBatch(batch, counters) {
    if (batch.length === 0) return;

    const activityIds = batch.map((item) => item._id.toString());
    const existing = await UserActivityLog.find(
        {
            'metadata.migratedFrom': 'Activity',
            'metadata.activityId': { $in: activityIds }
        },
        { 'metadata.activityId': 1 }
    ).lean();
    const existingIds = new Set(existing.map((x) => String(x?.metadata?.activityId || '')));

    const usernames = [...new Set(batch.map((item) => String(item.username || '').trim()).filter(Boolean))];
    const users = await User.find(
        { username: { $in: usernames } },
        { _id: 1, username: 1, lastIP: 1, lastCountry: 1, lastCity: 1, lastDevice: 1 }
    ).lean();
    const userMap = new Map(users.map((u) => [String(u.username || '').trim(), u]));

    const ops = [];
    for (const activity of batch) {
        counters.total += 1;
        const activityId = activity._id.toString();
        if (existingIds.has(activityId)) {
            counters.skippedExisting += 1;
            continue;
        }

        const username = String(activity.username || '').trim();
        const lowered = username.toLowerCase();
        if (!username || lowered === 'guest' || lowered === 'ẩn danh') {
            counters.skippedAnonymous += 1;
            continue;
        }

        const user = userMap.get(username);
        if (!user?._id) {
            counters.skippedMissingUser += 1;
            continue;
        }

        const action = String(activity.type || 'activity').trim() || 'activity';
        const description = buildDescription(activity);
        const createdAt = normalizeDate(activity);

        ops.push({
            insertOne: {
                document: {
                    userId: user._id,
                    username: user.username,
                    action,
                    description,
                    ip: String(user.lastIP || '').trim(),
                    device: String(user.lastDevice || '').trim(),
                    userAgent: '',
                    createdAt,
                    metadata: {
                        migratedFrom: 'Activity',
                        activityId,
                        legacyAction: String(activity.action || '').trim(),
                        legacyTarget: String(activity.target || '').trim(),
                        legacyType: String(activity.type || '').trim(),
                        legacyLink: String(activity.link || '').trim(),
                        lastCountry: String(user.lastCountry || '').trim(),
                        lastCity: String(user.lastCity || '').trim(),
                        migratedAt: new Date().toISOString()
                    }
                }
            }
        });
    }

    if (DRY_RUN) {
        counters.inserted += ops.length;
        return;
    }

    if (ops.length > 0) {
        await UserActivityLog.bulkWrite(ops, { ordered: false });
        counters.inserted += ops.length;
    }
}

async function run() {
    console.log('============================================================');
    console.log('Activity -> UserActivityLog Migration');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (khong ghi du lieu)' : 'WRITE'}`);
    console.log('============================================================');

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const counters = {
        total: 0,
        inserted: 0,
        skippedExisting: 0,
        skippedMissingUser: 0,
        skippedAnonymous: 0
    };

    let batch = [];
    const cursor = Activity.find({}).sort({ _id: 1 }).cursor();

    for await (const activity of cursor) {
        batch.push(activity);
        if (batch.length >= BATCH_SIZE) {
            await processBatch(batch, counters);
            console.log(
                `Processed: ${counters.total} | Inserted: ${counters.inserted} | Existing: ${counters.skippedExisting} | MissingUser: ${counters.skippedMissingUser} | Anonymous: ${counters.skippedAnonymous}`
            );
            batch = [];
        }
    }

    if (batch.length > 0) {
        await processBatch(batch, counters);
    }

    console.log('---------------- SUMMARY ----------------');
    console.log(`Total scanned: ${counters.total}`);
    console.log(`Inserted: ${counters.inserted}`);
    console.log(`Skipped (already migrated): ${counters.skippedExisting}`);
    console.log(`Skipped (missing user): ${counters.skippedMissingUser}`);
    console.log(`Skipped (anonymous): ${counters.skippedAnonymous}`);
    console.log('Done.');
    await mongoose.disconnect();
}

run()
    .then(() => process.exit(0))
    .catch(async (err) => {
        console.error('Migration failed:', err);
        try {
            await mongoose.disconnect();
        } catch (_) {
            // noop
        }
        process.exit(1);
    });
