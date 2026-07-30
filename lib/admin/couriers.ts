/**
 * Couriers we hand parcels to, and how to build a tracking link from an AWB.
 *
 * Shared by the client dialog (which auto-fills the URL as the AWB is typed)
 * and the server action (which rebuilds it rather than trusting what arrived).
 * "Other" has no template on purpose — the admin pastes a URL or leaves it
 * blank, and the shipped email falls back to showing the AWB as plain text.
 */
export const COURIERS = [
  {
    value: "Delhivery",
    template: (awb: string) =>
      `https://www.delhivery.com/track/package/${encodeURIComponent(awb)}`,
  },
  {
    value: "Bluedart",
    template: (awb: string) =>
      `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${encodeURIComponent(awb)}`,
  },
  {
    value: "DTDC",
    template: (awb: string) =>
      `https://www.dtdc.in/tracking/shipment-tracking.asp?strCnno=${encodeURIComponent(awb)}`,
  },
  {
    value: "India Post",
    template: (awb: string) =>
      `https://www.indiapost.gov.in/_layouts/15/DOP.Portal.Tracking/TrackConsignment.aspx?ID=${encodeURIComponent(awb)}`,
  },
  { value: "Other", template: null },
] as const;

export type CourierName = (typeof COURIERS)[number]["value"];

export const COURIER_NAMES = COURIERS.map((c) => c.value);

export function trackingUrlFor(courier: string, awb: string): string | null {
  const match = COURIERS.find((c) => c.value === courier);
  if (!match?.template || !awb.trim()) return null;
  return match.template(awb.trim());
}
