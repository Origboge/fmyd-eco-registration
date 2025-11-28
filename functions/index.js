// functions/index.js

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path'); // Used by the admin SDK implicitly, good to keep

// 1. Initialize Firebase Admin SDK and Firestore
// Check if the app is already initialized before initializing
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const storage = admin.storage();


// --- LIVE STATS FUNCTION (Your Working Code) ---

const TABLE_ID = 'fmyd-circular-eco-registration.registration_data.users_raw_latest';

/**
 * Executes a BigQuery query weekly, processes results, and writes to Firestore.
 */
exports.updateLiveStats = functions.region('us-central1').pubsub.schedule('0 9 * * 1').onRun(async(context) => {
    const bigquery = new BigQuery();

    const query = `
        SELECT
            JSON_VALUE(data, '$.state') AS state_name,
            COUNT(1) AS count
        FROM
            \`fmyd-circular-eco-registration.registration_data.users_raw_latest\` 
        GROUP BY
            state_name
        HAVING 
            state_name IS NOT NULL
    `;
    try {
        const [job] = await bigquery.createQueryJob({ query: query, location: 'US' });
        const [rows] = await job.getQueryResults();

        let totalCount = 0;
        const stateCountsArray = rows.map(row => {
            const count = parseInt(row.count, 10);
            totalCount += count;
            return { state: row.state_name, count: count };
        });

        stateCountsArray.sort((a, b) => b.count - a.count);

        const statsData = {
            total: totalCount,
            state_counts: stateCountsArray,
            lastUpdated: admin.firestore.Timestamp.now(),
        };

        await db.collection('live_stats').doc('registration_counts').set(statsData);

        console.log('Live stats updated successfully in Firestore!');
        return { status: "Success", totalCount };

    } catch (error) {
        console.error("BigQuery or Firestore Update Failed:", error);
        return { status: "Error", message: error.message };
    }
});


// --- ADMIN SECURE DOCUMENT FUNCTION (Security Code) ---

/**
 * Callable function to securely generate a Signed URL for an admin to view a document.
 */
exports.getSignedDocumentUrl = functions.https.onCall(async(data, context) => {

    // 1. CRITICAL SECURITY CHECK: Ensure the caller is logged in
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'The request must be authenticated to check documents.'
        );
    }

    // 2. CRITICAL ADMIN ROLE CHECK: Ensure the caller has the 'admin' custom claim
    const isCallerAdmin = context.auth.token.role === 'admin';

    if (!isCallerAdmin) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only users with the admin role can access this function.'
        );
    }

    // 3. Input Validation
    const { userId, fileName } = data;
    if (!userId || !fileName) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing userId or fileName.'
        );
    }

    // 4. Define the file path in Firebase Storage
    const bucket = storage.bucket();
    const filePath = `registrations/${userId}/${fileName}`; // Matches your expected storage path
    const file = bucket.file(filePath);

    // 5. Check if the file exists
    const [exists] = await file.exists();
    if (!exists) {
        throw new functions.https.HttpsError(
            'not-found',
            `Document not found at: ${filePath}`
        );
    }

    // 6. Generate the signed URL using the Admin SDK (valid for 1 hour)
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000,
    });

    // 7. Return the temporary, secure URL
    return { url: url };
});