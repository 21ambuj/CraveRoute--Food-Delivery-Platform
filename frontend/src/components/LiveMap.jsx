import React, { useEffect, useRef } from 'react';

const LiveMap = ({ driverLoc, destinationLoc, restaurantLoc, zoom = 14 }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markers = useRef({});

    useEffect(() => {
        if (!mapRef.current || !window.L) return;

        // Initialize map
        if (!mapInstance.current) {
            mapInstance.current = window.L.map(mapRef.current).setView([driverLoc?.lat || 20.5937, driverLoc?.lng || 78.9629], zoom);
            
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance.current);
        }

        const L = window.L;

        // Helper to update/create markers
        const updateMarker = (id, loc, icon, label) => {
            if (!loc?.lat || !loc?.lng) return;

            if (markers.current[id]) {
                markers.current[id].setLatLng([loc.lat, loc.lng]);
            } else {
                const customIcon = L.divIcon({
                    html: `<div class="flex flex-col items-center">
                            <span class="text-3xl">${icon}</span>
                            <div class="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 -mt-1">
                                <p class="text-[8px] font-black uppercase tracking-tighter whitespace-nowrap">${label}</p>
                            </div>
                           </div>`,
                    className: 'custom-div-icon',
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                });

                markers.current[id] = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(mapInstance.current);
            }
        };

        // Update markers
        updateMarker('driver', driverLoc, '🛵', 'Driver');
        updateMarker('destination', destinationLoc, '🏠', 'You');
        updateMarker('restaurant', restaurantLoc, '🍴', 'Shop');

        // Fit bounds if we have at least two points
        const points = [
            driverLoc && [driverLoc.lat, driverLoc.lng],
            destinationLoc && [destinationLoc.lat, destinationLoc.lng],
            restaurantLoc && [restaurantLoc.lat, restaurantLoc.lng]
        ].filter(p => p && p[0] && p[1]);

        if (points.length > 1) {
            mapInstance.current.fitBounds(points, { padding: [50, 50] });
        } else if (driverLoc?.lat) {
            mapInstance.current.setView([driverLoc.lat, driverLoc.lng]);
        }

    }, [driverLoc, destinationLoc, restaurantLoc]);

    return (
        <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
            <div ref={mapRef} className="w-full h-full z-10" />
            
            {/* Legend/Status Overlay */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col space-y-2">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Map System</p>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Driver Active</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveMap;
