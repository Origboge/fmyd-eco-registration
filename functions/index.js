// functions/index.js

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');

// 1. Initialize Firebase Admin SDK and Firestore
admin.initializeApp();
const db = admin.firestore();

// --- NOTE: TABLE_ID is not used in the final query but is kept here ---
const TABLE_ID = 'fmyd-circular-eco-registration.registration_data.users_raw_latest';

/**
 * Executes a BigQuery query weekly, processes results, and writes to Firestore.
 */
// FIX #1: Use .region('us-central1') to ensure correct deployment location.
exports.updateLiveStats = functions.region('us-central1').pubsub.schedule('0 9 * * 1').onRun(async(context) => {
    // 2. Initialize BigQuery client
    const bigquery = new BigQuery();

    // 3. Define the SQL Query
    // 🚀 FINAL FIX: Use JSON_VALUE(data, '$.state') to extract the state field 
    // from the 'data' column, which is stored as a JSON string.
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
        // FIX #3: Pass the defined 'query' variable to bigquery.createQueryJob
        const [job] = await bigquery.createQueryJob({ query: query, location: 'US' });
        const [rows] = await job.getQueryResults();

        // 4. Process and Calculate Total Count
        let totalCount = 0;
        const stateCountsArray = rows.map(row => {
            // NOTE: The rows returned from BigQuery should use 'state_name' 
            // as defined in the SELECT statement alias.
            const count = parseInt(row.count, 10);
            totalCount += count;
            return { state: row.state_name, count: count };
        });

        // 5. Sort states by count (descending)
        stateCountsArray.sort((a, b) => b.count - a.count);

        // 6. Structure Final Data Object
        const statsData = {
            total: totalCount,
            state_counts: stateCountsArray, // Array of { state, count }
            lastUpdated: admin.firestore.Timestamp.now(),
        };

        // 7. Write the final, small JSON object to Firestore cache
        await db.collection('live_stats').doc('registration_counts').set(statsData);

        console.log('Live stats updated successfully in Firestore!');
        return { status: "Success", totalCount };

    } catch (error) {
        console.error("BigQuery or Firestore Update Failed:", error);
        return { status: "Error", message: error.message };
    }
});