// functions/index.js

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const sgMail = require('@sendgrid/mail'); // Import SendGrid

// 1. Initialize Firebase Admin SDK and Firestore
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const storage = admin.storage();

// 2. Configure SendGrid
// This grabs the key you set via: firebase functions:config:set sendgrid.key="..."
const SENDGRID_API_KEY = functions.config().sendgrid ? functions.config().sendgrid.key : '';

if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
} else {
    console.warn("⚠️ SendGrid API Key is missing. Emails will not send.");
}


// --- 1. EXISTING: LIVE STATS FUNCTION ---

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


// --- 2. EXISTING: ADMIN SECURE DOCUMENT FUNCTION ---

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
    const filePath = `registrations/${userId}/${fileName}`;
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


// --- 3. NEW: OTP SENDING FUNCTION ---

/**
 * Generates a 6-digit code, saves it to Firestore, and emails it via SendGrid.
 */
exports.sendRegistrationOtp = functions.https.onCall(async(data, context) => {
    const { email, name } = data;

    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
    }

    // 1. Generate a random 6-digit code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Save to Firestore (expires in 10 minutes)
    // We use the email as the document ID so a user only has one active OTP at a time
    const expiresIn = 10 * 60 * 1000; // 10 minutes
    const expiresAt = Date.now() + expiresIn;

    await db.collection('otp_requests').doc(email).set({
        code: otpCode,
        expiresAt: expiresAt,
        verified: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Construct Email
    // Using your verified domain
    const msg = {
        to: email,
        from: 'FMYD Verification <noreply@wastetowealthfmyd.com.ng>',
        subject: 'Your FMYD Verification Code',
        text: `Hello ${name || 'Applicant'},\n\nYour verification code is: ${otpCode}\n\nThis code expires in 10 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0C8829;">FMYD Email Verification</h2>
                <p>Hello <strong>${name || 'Applicant'}</strong>,</p>
                <p>Please use the following One-Time Password (OTP) to complete your registration:</p>
                <h1 style="background: #f4f4f4; padding: 15px; display: inline-block; letter-spacing: 5px; border-radius: 8px;">${otpCode}</h1>
                <p>This code expires in 10 minutes.</p>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">If you did not request this, please ignore this email.</p>
            </div>
        `
    };

    // 4. Send via SendGrid
    try {
        await sgMail.send(msg);
        return { success: true, message: 'OTP sent to email.' };
    } catch (error) {
        console.error('SendGrid Error:', error);
        if (error.response) console.error(error.response.body);
        throw new functions.https.HttpsError('internal', 'Failed to send email.');
    }
});


// --- 4. NEW: OTP VERIFICATION FUNCTION ---

/**
 * Checks if the code provided by the user matches the database.
 */
exports.verifyRegistrationOtp = functions.https.onCall(async(data, context) => {
    const { email, code } = data;

    if (!email || !code) {
        throw new functions.https.HttpsError('invalid-argument', 'Email and Code are required.');
    }

    const docRef = db.collection('otp_requests').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'No OTP request found for this email.');
    }

    const record = docSnap.data();

    // Check Expiration
    if (Date.now() > record.expiresAt) {
        throw new functions.https.HttpsError('aborted', 'OTP has expired. Please request a new one.');
    }

    // Check Match
    if (record.code !== code) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid verification code.');
    }

    // OTP is valid! Mark as verified.
    await docRef.update({ verified: true });

    return { success: true, message: 'Email verified successfully!' };
});