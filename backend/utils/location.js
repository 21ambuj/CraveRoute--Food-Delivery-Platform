/**
 * Calculates the Haversine distance between two coordinates in kilometers.
 * This is crucial for nearest-restaurant logic and realistic delivery estimates.
 */

function getDistance(lat1, lon1, lat2, lon2) {
    const toRadians = (degree) => degree * (Math.PI / 180);

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in km
    return distance;
}

/**
 * Calculates the Hybrid Score for top 1% startup sorting
 * Weighs distance vs rating heavily.
 */
function calculateHybridScore(distanceKm, rating) {
    // Shorter distance -> lower score, higher rating -> lower score (if we want ASC)
    // Actually, smaller score = better ranking.
    // Distance goes up -> score goes up (worse)
    // Rating goes up -> score goes down (better)
    const score = (distanceKm * 0.6) + (rating * -0.4);
    return score;
}

module.exports = {
    getDistance,
    calculateHybridScore
};
