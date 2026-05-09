// ============================================================
// LIVE VESSEL TYPE (AIS Stream)
// ============================================================

export interface LiveVesselDimensions {
    A: number; // length bow
    B: number; // length stern
    C: number; // width port
    D: number; // width starboard
}

export interface LiveVessel {
    mmsi: number;
    name: string;
    lat: number;
    lng: number;
    sog: number;          // Speed Over Ground (knots)
    cog: number;          // Course Over Ground (degrees)
    heading: number;      // True heading (degrees, 511 = N/A)
    navStatus: number;    // Navigational status code (0-15)
    type: number;         // Ship type code
    destination: string;
    callsign: string;
    imo: string;
    dim: LiveVesselDimensions;
    eta: string;
    updated: Date;
}