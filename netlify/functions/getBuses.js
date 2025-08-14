// Required dependencies for the function.
// You will need to create a `package.json` file to list these.
const fetch = require('node-fetch');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');

// The main function that Netlify will run
exports.handler = async function(event, context) {
    // The API endpoint for Prasarana's live bus data (rapid-bus-kl)
    const apiUrl = 'https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=rapid-bus-kl';

    try {
        // 1. Fetch the raw, binary data from the official API
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();

        // 2. Decode the Protocol Buffer data into a readable format
        // The `transit_realtime.FeedMessage` is the standard object for GTFS-Realtime
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

        // 3. Extract and simplify the vehicle data into a clean JSON array
        const buses = feed.entity.map(entity => {
            if (entity.vehicle) {
                return {
                    id: entity.id,
                    tripId: entity.vehicle.trip?.tripId,
                    routeId: entity.vehicle.trip?.routeId,
                    latitude: entity.vehicle.position?.latitude,
                    longitude: entity.vehicle.position?.longitude,
                    bearing: entity.vehicle.position?.bearing,
                    speed: entity.vehicle.position?.speed,
                    timestamp: entity.vehicle.timestamp
                };
            }
            return null;
        }).filter(bus => bus !== null); // Filter out any non-vehicle entities

        // 4. Send the clean JSON data back to your front-end app
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' // Allow requests from any origin
            },
            body: JSON.stringify(buses)
        };

    } catch (error) {
        console.error('Error fetching or parsing GTFS data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch live bus data.' })
        };
    }
};
